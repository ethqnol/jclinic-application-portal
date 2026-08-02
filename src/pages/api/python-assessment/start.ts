import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/auth-guards';
import { jsonResponse, errorResponse } from '../../../lib/api-response';
import { PythonAssessmentService } from '../../../lib/services/pythonAssessmentService';

export const POST: APIRoute = async (context) => {
  const { session, db } = await requireAuth(context);

  if (!session) {
    return errorResponse('Unauthorized', 401);
  }
  if (!db) {
    return errorResponse('Database not available', 500);
  }

  try {
    let body: { action?: string; pythonExperience?: string } = {};
    try {
      body = await context.request.json();
    } catch (e) {}

    if (body.pythonExperience === 'yes' || body.pythonExperience === 'no') {
      await PythonAssessmentService.setPythonExperience(db, session.user.id, body.pythonExperience);
    }

    if (body.action === 'skip') {
      const assessment = await PythonAssessmentService.skipAssessment(db, session.user.id);
      return jsonResponse({ success: true, assessment });
    }

    const assessment = await PythonAssessmentService.startAssessment(db, session.user.id);
    return jsonResponse({
      success: true,
      assessment: {
        status: assessment.status,
        questions: assessment.questions,
        started_at: assessment.started_at,
        time_limit_seconds: assessment.time_limit_seconds,
        submitted_at: assessment.submitted_at,
      },
    });
  } catch (error: any) {
    console.error('Python assessment start error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
