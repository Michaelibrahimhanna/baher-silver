import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProductionOrderPlanningService } from '@/lib/services/erp/ProductionOrderPlanningService';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';

export async function GET(request: NextRequest) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'production:read',
      actionDescription: 'List Manufacturing Orders'
    });

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabase
      .from('production_orders')
      .select('*, product:products(name_ar, name_en), variant:product_variants(sku)')
      .eq('organization_id', auth.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status && status !== 'ALL') {
      query = query.eq('status', status);
    }
    if (priority && priority !== 'ALL') {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, count: data?.length || 0, data });
  } catch (error: any) {
    return handleApiAuthError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'production:manage',
      actionDescription: 'Create Manufacturing Order'
    });

    const supabase = await createClient();
    const body = await request.json();

    if (!body.product_id || !body.variant_id || !body.planned_quantity) {
      return NextResponse.json(
        { success: false, error: 'product_id, variant_id, and planned_quantity are required' },
        { status: 400 }
      );
    }

    const { getProductBySlugOrId } = await import('@/lib/db/productEngine');
    const catalogProduct = getProductBySlugOrId(body.product_id, auth.organizationId);
    if (catalogProduct && catalogProduct.profile_type === 'NON_SILVER_RETAIL') {
      return NextResponse.json(
        {
          success: false,
          code: 'NON_SILVER_PRODUCT_CANNOT_BE_MANUFACTURED',
          error: 'Non-silver retail merchandise cannot enter manufacturing operations or be assigned to a manufacturing order.'
        },
        { status: 422 }
      );
    }

    const order = await ProductionOrderPlanningService.createDraftOrder(
      {
        organization_id: auth.organizationId,
        branch_id: body.branch_id || auth.user.branchId || 'branch_main',
        warehouse_id: body.warehouse_id,
        product_id: body.product_id,
        variant_id: body.variant_id,
        planned_quantity: Number(body.planned_quantity),
        priority: body.priority || 'MEDIUM',
        target_date: body.target_date || new Date().toISOString().split('T')[0],
        notes: body.notes,
        created_by: auth.userId
      },
      supabase as any
    );

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    return handleApiAuthError(error);
  }
}
