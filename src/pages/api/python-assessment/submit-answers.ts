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
    const body = (await context.request.json()) as {
      answers?: { id?: string; answer?: string }[];
      expired?: boolean;
    };

    const answers = Array.isArray(body.answers)
      ? body.answers
          .filter((a) => a && typeof a.id === 'string')
          .map((a) => ({
            id: a.id as string,
            answer: typeof a.answer === 'string' ? a.answer : '',
          }))
      : [];

    if (!answers.length) {
      return errorResponse('Answers are required', 400);
    }

    const data = await PythonAssessmentService.getExperienceData(db, session.user.id);
    if (!data?.exp?.python_assessment?.questions?.length) {
      return errorResponse('No active Python assessment', 400);
    }

    const existing = data.exp.python_assessment;
    if (existing.status === 'completed' || existing.status === 'expired') {
      return jsonResponse({ success: true, assessment: existing });
    }

    const assessment = await PythonAssessmentService.saveAnswers(db, session.user.id, {
      answers,
      expired: Boolean(body.expired),
    });

    return jsonResponse({ success: true, assessment });
  } catch (error: any) {
    console.error('Python assessment submit-answers error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};
