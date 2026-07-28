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
    const { applicationId, grade, notes } = body || {};

    if (!applicationId) {
      return errorResponse('Application ID required', 400);
    }

    if (grade === undefined || grade === null || grade < 1 || grade > 5) {
      return errorResponse('Grade must be between 1 and 5', 400);
    }

    await AdminService.saveRating(guard.db, applicationId, grade, notes);

    return jsonResponse({ success: true, message: 'Review rating saved successfully' });
  } catch (error: any) {
    console.error('Error saving review:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};