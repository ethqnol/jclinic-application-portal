import type { APIRoute } from 'astro';
import { requireAuth } from '../../lib/auth-guards';
import { jsonResponse, errorResponse } from '../../lib/api-response';
import { ApplicationService } from '../../lib/services/applicationService';

export const POST: APIRoute = async (context) => {
  const { session, db } = await requireAuth(context);
  
  if (!session) {
    return errorResponse('Unauthorized', 401);
  }

  if (!db) {
    return errorResponse('Database not available', 500);
  }

  try {
    await ApplicationService.deleteDraft(db, session.user.id);
    return jsonResponse({ success: true, message: 'Draft deleted' });
  } catch (error: any) {
    console.error('Delete draft error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};