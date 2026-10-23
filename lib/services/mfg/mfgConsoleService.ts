import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function handleConsoleTelemetry(request: NextRequest, customClient?: any) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'ALL';
    const priorityFilter = searchParams.get('priority') || 'ALL';
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    // 1. Authoritative API Authentication & RBAC Boundary Check
    const auth = await assertApiAuth(request, {
      requiredPermission: 'production:read',
      actionDescription: 'Manufacturing Telemetry Console'
    });

    // 2. Resolve Database Client (Injected Client or Server SSR Client)
    let supabase = customClient;
    if (!supabase) {
      try {
        supabase = await createClient();
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error_code: 'DATABASE_UNAVAILABLE',
            error: '503 Service Unavailable: Could not initialize database client connection.',
            details: err.message
          },
          { status: 503 }
        );
      }
    }

    // 3. Query Ground-Truth Production Orders
    let query = supabase
      .from('production_orders')
      .select('*, product:products(name_ar, name_en), variant:product_variants(sku, weight)')
      .order('created_at', { ascending: false });

    if (auth.user.branchId) {
      query = query.eq('branch_id', auth.user.branchId);
    }

    if (statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter);
    }

    if (priorityFilter !== 'ALL') {
      query = query.eq('priority', priorityFilter);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      return NextResponse.json(
        {
          success: false,
          error_code: 'PRODUCTION_ORDERS_FETCH_FAILED',
          error: ordersError.message
        },
        { status: 500 }
      );
    }

    const orderIds = (orders || []).map((o: any) => o.id);

    // 4. Concurrently Query Execution Telemetry Tables for Enriched Visibility
    const [jobsRes, wipRes, scrapRes, qcRes] = await Promise.all([
      orderIds.length > 0
        ? supabase.from('work_center_queue_jobs').select('*').in('order_id', orderIds)
        : { data: [] },
      orderIds.length > 0
        ? supabase.from('production_order_wip_lots').select('*').in('order_id', orderIds)
        : { data: [] },
      orderIds.length > 0
        ? supabase.from('production_scrap_ledger').select('*').in('order_id', orderIds)
        : { data: [] },
      orderIds.length > 0
        ? supabase.from('production_qc_inspections').select('*').in('order_id', orderIds)
        : { data: [] }
    ]);

    const jobs = jobsRes.data || [];
    const wipLots = wipRes.data || [];
    const scrapLedgers = scrapRes.data || [];
    const qcInspections = qcRes.data || [];

    // 5. Enrich Each Production Order with Real Telemetry & Mass-Balance
    const enrichedOrders = (orders || []).map((order: any) => {
      const orderJobs = jobs.filter((j: any) => j.order_id === order.id);
      const orderWips = wipLots.filter((w: any) => w.order_id === order.id);
      const orderScraps = scrapLedgers.filter((s: any) => s.order_id === order.id);
      const orderQcs = qcInspections.filter((q: any) => q.order_id === order.id);

      // Active Work Center & Stage Sequence
      const activeJob =
        orderJobs.find((j: any) => j.status === 'IN_OPERATION') ||
        orderJobs.sort((a: any, b: any) => (b.sequence_no || 0) - (a.sequence_no || 0))[0] ||
        null;

      // Active WIP Quantity & Weight
      const activeWipQty = orderWips
        .filter((w: any) => w.status === 'IN_PROCESS' || w.status === 'AVAILABLE')
        .reduce((acc: number, w: any) => acc + (w.quantity || 0), 0);

      const activeWipWeightGrams = orderWips
        .filter((w: any) => w.status === 'IN_PROCESS' || w.status === 'AVAILABLE')
        .reduce((acc: number, w: any) => acc + (w.weight_grams || 0), 0);

      // Total Scrap Generated in Factory Execution
      const totalScrapWeightGrams = orderScraps.reduce(
        (acc: number, s: any) => acc + (s.scrap_weight_grams || 0),
        0
      );

      // Latest QC Result
      const latestQc = orderQcs.sort(
        (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      )[0];

      // Physical Mass-Balance Check
      const issuedWeight = order.allocated_silver_weight_grams || order.target_silver_weight_grams || 0;
      const accountedWeight = activeWipWeightGrams + totalScrapWeightGrams;
      const weightDelta = issuedWeight > 0 ? accountedWeight - issuedWeight : 0;
      const isMassBalanced = Math.abs(weightDelta) <= 2.0;

      return {
        ...order,
        active_wip_quantity: activeWipQty,
        active_wip_weight_grams: activeWipWeightGrams,
        total_scrap_weight_grams: totalScrapWeightGrams,
        current_stage_code: activeJob?.stage_code || 'PREPARATION',
        current_sequence_no: activeJob?.sequence_no || 10,
        active_work_center_job_id: activeJob?.id || null,
        active_job_status: activeJob?.status || 'PENDING',
        qc_status: latestQc?.decision || 'PENDING_INSPECTION',
        mass_balance_status: isMassBalanced ? 'BALANCED' : 'VARIANCE_FLAGGED',
        mass_balance_variance_grams: parseFloat(weightDelta.toFixed(4)),
        data_state: 'REAL_DATA_PRESENT'
      };
    });

    // 6. Apply Search Query Filter if Provided
    let filteredOrders = enrichedOrders;
    if (searchQuery) {
      filteredOrders = enrichedOrders.filter((o: any) => {
        const orderCode = (o.order_code || '').toLowerCase();
        const prodNameAr = (o.product?.name_ar || '').toLowerCase();
        const prodNameEn = (o.product?.name_en || '').toLowerCase();
        const sku = (o.variant?.sku || '').toLowerCase();
        return (
          orderCode.includes(searchQuery) ||
          prodNameAr.includes(searchQuery) ||
          prodNameEn.includes(searchQuery) ||
          sku.includes(searchQuery)
        );
      });
    }

    // 7. Aggregate Real-Time KPIs for Dashboard Header
    const totalOrders = filteredOrders.length;
    const activeInExecution = filteredOrders.filter((o: any) => o.status === 'IN_PROGRESS').length;
    const totalWipPieces = filteredOrders.reduce((acc: number, o: any) => acc + o.active_wip_quantity, 0);
    const totalWorkshopScrap = filteredOrders.reduce((acc: number, o: any) => acc + o.total_scrap_weight_grams, 0);

    return NextResponse.json({
      success: true,
      data_state: filteredOrders.length > 0 ? 'REAL_DATA_PRESENT' : 'NO_DATA',
      kpis: {
        total_orders: totalOrders,
        active_in_execution: activeInExecution,
        total_wip_pieces: totalWipPieces,
        total_scrap_grams: parseFloat(totalWorkshopScrap.toFixed(4))
      },
      data: filteredOrders
    });
  } catch (error: any) {
    return handleApiAuthError(error);
  }
}
