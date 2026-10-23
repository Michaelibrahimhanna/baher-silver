import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ProductionOrderPlanningService } from '@/lib/services/erp/ProductionOrderPlanningService';
import { ManufacturingBusinessQueryService } from '@/lib/services/erp/ManufacturingBusinessQueryService';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { RbacService } from '@/lib/auth/rbacService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'production:read',
      actionDescription: 'Read Order Details'
    });

    const { id } = await params;
    const supabase = await createClient();
    const result = await ManufacturingBusinessQueryService.queryOrderDetails(id, supabase as any);

    if (result && (result as any).order) {
      const orderOrgId = (result as any).order.organization_id;
      if (orderOrgId) {
        RbacService.assertTenantScope(auth.user, orderOrgId);
      }
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return handleApiAuthError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'production:manage',
      actionDescription: 'Cancel Order'
    });

    const { id } = await params;
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'User cancelled order';

    const order = await ProductionOrderPlanningService.cancelOrder(
      id,
      reason,
      auth.userId,
      supabase as any
    );

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    return handleApiAuthError(error);
  }
}
