import type { APIRoute } from 'astro';
import { requireAuth } from '../../lib/auth-guards';
import { errorResponse } from '../../lib/api-response';
import { getApplicationStatus } from '../../lib/application-status';
import { ApplicationService } from '../../lib/services/applicationService';

export const POST: APIRoute = async (context) => {
  const { session, db } = await requireAuth(context);
  
  if (!session) {
    return context.redirect('/');
  }

  if (!db) {
    return errorResponse('Database not available', 500);
  }

  // Check if applications are open
  const applicationsOpen = await getApplicationStatus(db);
  if (!applicationsOpen) {
    return errorResponse('Applications are currently closed', 403);
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
      deviceFp: (formData.get('device_fp') as string) || '',
    };

    // Required fields check
    if (
      !payload.firstName || !payload.lastName || !payload.preferredEmail || 
      !payload.parentName || !payload.parentEmail || !payload.parentPhone ||
      !payload.recommenderName || !payload.recommenderEmail ||
      !payload.studentLocation || !payload.essayOne || !payload.essayTwo || 
      !payload.programmingExperience || !payload.researchExperience || 
      !payload.gradeLevel || !payload.needsFinancialAid || 
      !payload.clubsActivities || !payload.finalThoughts
    ) {
      return errorResponse('Missing required fields', 400);
    }

    if (payload.studentLocation !== 'massachusetts' && !payload.locationDetail) {
      return errorResponse('Please specify your state or country of residence', 400);
    }

    if (!payload.languages || payload.languages.length === 0) {
      return errorResponse('Please select your programming languages or select "None"', 400);
    }

    if (!payload.mlTechnologies || payload.mlTechnologies.length === 0) {
      return errorResponse('Please select your machine learning technologies or select "None"', 400);
    }

    await ApplicationService.submitApplication(db, session.user.id, payload);

    return context.redirect('/dashboard?success=submitted');
  } catch (error: any) {
    console.error('Application submission error:', error);
    return context.redirect('/dashboard?error=submit_failed');
  }
};