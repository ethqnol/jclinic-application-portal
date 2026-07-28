import type { APIRoute } from 'astro';
import { requireAdminGuard } from '../../../lib/auth-guards';
import { jsonResponse, errorResponse } from '../../../lib/api-response';

export const POST: APIRoute = async (context) => {
  const guard = await requireAdminGuard(context);
  if (!guard) {
    return errorResponse('Forbidden: Admin access required', 403);
  }

  try {
    const body: any = await context.request.json();
    const { applicationId, status } = body || {};

    if (!applicationId || !status) {
      return errorResponse('Missing required fields', 400);
    }

    await guard.db.prepare(`
      UPDATE applications 
      SET reviewer_notes = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, applicationId).run();

    return jsonResponse({
      success: true,
      message: 'Review updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating review status:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};