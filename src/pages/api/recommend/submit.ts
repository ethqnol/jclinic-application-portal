import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse } from '../../../lib/api-response';
import { RecommendationService } from '../../../lib/services/recommendationService';
import { getSession } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  const db = context.locals.runtime?.env?.DB;

  if (!db) {
    return errorResponse('Database not available', 500);
  }

  try {
    const formData = await context.request.formData();
    const token = formData.get('token') as string;
    const pin = formData.get('pin') as string;
    const letterText = formData.get('letter_text') as string;
    const recommenderDeviceFp = (formData.get('device_fp') as string) || '';

    if (!token || !pin || !letterText) {
      return errorResponse('Missing required fields', 400);
    }

    const rec = await RecommendationService.getByToken(db, token);
    if (!rec) {
      return errorResponse('Invalid recommendation token link', 404);
    }

    // Silent Suspicion Detection:
    // Check if submitter is actively signed in to the applicant account for this recommendation
    const session = await getSession(context);
    const isSameSessionUser = Boolean(
      session && session.user && session.user.id.toString() === rec.user_id.toString()
    );

    const clientIp = context.request.headers.get('cf-connecting-ip') || 
                     context.request.headers.get('x-forwarded-for') || 
                     'unknown';
    const userAgent = context.request.headers.get('user-agent') || '';

    // Submit letter and silently flag in database if suspicious
    await RecommendationService.submitLetter(
      db, 
      token, 
      pin, 
      letterText, 
      clientIp, 
      recommenderDeviceFp, 
      userAgent, 
      isSameSessionUser
    );

    return jsonResponse({ success: true, message: 'Recommendation submitted successfully' });
  } catch (error: any) {
    console.error('Recommendation submission error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
