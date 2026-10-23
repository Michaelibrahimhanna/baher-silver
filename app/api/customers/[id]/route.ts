import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { CustomerService, CustomerAuthContext } from '@/lib/services/customer';

const customerService = new CustomerService();

/**
 * GET /api/customers/[id]
 * Retrieves customer by ID with strict tenant isolation (anti-IDOR).
 * Requires permission: customer:read
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'customer:read',
      actionDescription: 'Get Customer by ID'
    });

    const customerAuth: CustomerAuthContext = {
      organizationId: auth.organizationId,
      actorUserId: auth.user.id,
      actorRole: auth.user.role
    };

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const customer = await customerService.getCustomerById(customerAuth, id, includeDeleted);

    return NextResponse.json({
      success: true,
      customer
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}

/**
 * PUT /api/customers/[id]
 * Updates customer profile with strict tenant isolation.
 * Requires permission: customer:manage
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

/**
 * PATCH /api/customers/[id]
 * Updates customer profile with strict tenant isolation.
 * Requires permission: customer:manage
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleUpdate(request, params);
}

async function handleUpdate(
  request: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'customer:manage',
      actionDescription: 'Update Customer Profile'
    });

    const customerAuth: CustomerAuthContext = {
      organizationId: auth.organizationId,
      actorUserId: auth.user.id,
      actorRole: auth.user.role
    };

    const { id } = await paramsPromise;
    const body = await request.json();

    // Client-provided tenant identity or ID is discarded; only trusted server context is used
    const customer = await customerService.updateCustomer(customerAuth, id, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      status: body.status
    });

    return NextResponse.json({
      success: true,
      customer
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}

/**
 * DELETE /api/customers/[id]
 * Soft-deletes customer with strict tenant isolation.
 * Requires permission: customer:manage
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'customer:manage',
      actionDescription: 'Soft-Delete Customer'
    });

    const customerAuth: CustomerAuthContext = {
      organizationId: auth.organizationId,
      actorUserId: auth.user.id,
      actorRole: auth.user.role
    };

    const { id } = await params;
    await customerService.deleteCustomer(customerAuth, id);

    return NextResponse.json({
      success: true,
      message: `Customer "${id}" soft-deleted successfully.`
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
