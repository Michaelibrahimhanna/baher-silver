import { NextRequest, NextResponse } from 'next/server';
import { assertApiAuth, handleApiAuthError } from '@/lib/auth/apiGuard';
import { CustomerService, CustomerAuthContext } from '@/lib/services/customer';

const customerService = new CustomerService();

/**
 * GET /api/customers
 * Searches customers strictly scoped to authenticated tenant.
 * Requires permission: customer:read
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'customer:read',
      actionDescription: 'Search Retail Customers'
    });

    const customerAuth: CustomerAuthContext = {
      organizationId: auth.organizationId,
      actorUserId: auth.user.id,
      actorRole: auth.user.role
    };

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || searchParams.get('q') || undefined;
    const status = (searchParams.get('status') as any) || undefined;
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    const customers = await customerService.searchCustomers(customerAuth, {
      query,
      status,
      includeDeleted,
      limit: !isNaN(limit as number) ? limit : undefined,
      offset: !isNaN(offset as number) ? offset : undefined
    });

    return NextResponse.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}

/**
 * POST /api/customers
 * Creates a new customer strictly scoped to authenticated tenant.
 * Requires permission: customer:manage
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await assertApiAuth(request, {
      requiredPermission: 'customer:manage',
      actionDescription: 'Create Retail Customer'
    });

    const customerAuth: CustomerAuthContext = {
      organizationId: auth.organizationId,
      actorUserId: auth.user.id,
      actorRole: auth.user.role
    };

    const body = await request.json();

    // Client-provided tenant identity is strictly ignored; only auth.organizationId is trusted
    const customer = await customerService.createCustomer(customerAuth, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address
    });

    return NextResponse.json(
      {
        success: true,
        customer
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    return handleApiAuthError(error);
  }
}
