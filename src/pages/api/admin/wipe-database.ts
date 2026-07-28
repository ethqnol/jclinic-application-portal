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
    const { confirmPhrase } = body || {};
    if (!confirmPhrase) {
      return errorResponse('Confirmation phrase is required', 400);
    }

    await AdminService.wipeDatabase(guard.db, confirmPhrase);

    return jsonResponse({
      success: true,
      message: 'Database wiped successfully. All applications and non-admin users have been removed.'
    });
  } catch (error: any) {
    console.error('Error wiping database:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};