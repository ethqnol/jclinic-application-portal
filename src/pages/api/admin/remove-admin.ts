import type { APIRoute } from 'astro';
import { requireAdminGuard } from '../../../lib/auth-guards';
import { jsonResponse, errorResponse } from '../../../lib/api-response';
import { AdminService } from '../../../lib/services/adminService';

export const POST: APIRoute = async (context) => {
  const guard = await requireAdminGuard(context);
  if (!guard) {
    return errorResponse('Forbidden: Admin access required', 403);
  }

  try {
    const body: any = await context.request.json();
    const { email } = body || {};
    if (!email) {
      return errorResponse('Email address is required', 400);
    }

    await AdminService.removeAdmin(guard.db, email, guard.session.user.email);

    return jsonResponse({
      success: true,
      message: `Successfully removed admin rights from ${email}`
    });
  } catch (error: any) {
    console.error('Error removing admin:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};