import type { APIRoute } from 'astro';
import { requireAuth } from '../../lib/auth-guards';
import { jsonResponse, errorResponse } from '../../lib/api-response';
import { ApplicationService } from '../../lib/services/applicationService';
import { RecommendationService } from '../../lib/services/recommendationService';

export const POST: APIRoute = async (context) => {
  const { session, db } = await requireAuth(context);
  
  if (!session) {
    return errorResponse('Unauthorized', 401);
  }

  if (!db) {
    return errorResponse('Database not available', 500);
  }

  try {
    const formData = await context.request.formData();
    
    const payload = {
      firstName: formData.get('first_name') as string,
      lastName: formData.get('last_name') as string,
      preferredEmail: formData.get('preferred_email') as string,
      studentLocation: formData.get('student_location') as string,
      locationDetail: formData.get('location_detail') as string,
      parentName: formData.get('parent_name') as string,
      parentEmail: formData.get('parent_email') as string,
      parentPhone: formData.get('parent_phone') as string,
      recommenderName: formData.get('recommender_name') as string,
      recommenderEmail: formData.get('recommender_email') as string,
      recommenderTitle: formData.get('recommender_title') as string,
      essayOne: formData.get('essay_one') as string,
      essayTwo: formData.get('essay_two') as string,
      programmingExperience: formData.get('programming_experience') as string,
      languages: formData.getAll('languages') as string[],
      mlTechnologies: formData.getAll('ml_technologies') as string[],
      researchExperience: formData.get('research_experience') as string,
      gradeLevel: formData.get('grade_level') as string,
      needsFinancialAid: formData.get('needs_financial_aid') as string,
      clubsActivities: formData.get('clubs_activities') as string,
      finalThoughts: formData.get('final_thoughts') as string,
      currentStep: formData.get('current_step') ? parseInt(formData.get('current_step') as string) : undefined,
    };

    const applicantDeviceFp = (formData.get('device_fp') as string) || '';

    await ApplicationService.saveDraft(db, session.user.id, payload);

    const app = await ApplicationService.getUserApplication(db, session.user.id);
    if (app && payload.recommenderName && payload.recommenderEmail) {
      await RecommendationService.saveOrUpdateRecommendation(
        db,
        app.id,
        payload.recommenderName,
        payload.recommenderEmail,
        payload.recommenderTitle || '',
        applicantDeviceFp
      );
    }

    return jsonResponse({ success: true, message: 'Draft saved successfully' });
  } catch (error: any) {
    console.error('Draft save error:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};