export async function getApplicationStatus(db: any): Promise<boolean> {
  try {
    const result = await db.prepare(`
      SELECT applications_open FROM application_settings WHERE id = 1
    `).first();
    
    // Default to open if no settings found
    return result ? Boolean(result.applications_open) : true;
  } catch (error) {
    console.error('Error getting application status:', error);
    // Default to open on error
    return true;
  }
}

export interface SectionStatus {
  sec1: 'complete' | 'incomplete' | 'not_started';
  sec2: 'complete' | 'incomplete' | 'not_started';
  sec3: 'complete' | 'incomplete' | 'not_started';
}

export function calculateDraftSectionStatuses(user: any, application: any): SectionStatus {
  if (!application) {
    return { sec1: 'not_started', sec2: 'not_started', sec3: 'not_started' };
  }

  let exp: any = {};
  try {
    exp = JSON.parse(application.experience_data || '{}');
  } catch (e) {
    exp = {};
  }

  // Section 1 Check
  const sec1Fields = [
    user?.first_name,
    user?.last_name,
    user?.preferred_email,
    application?.student_location,
    exp?.parent_name,
    exp?.parent_email,
    exp?.parent_phone,
    exp?.recommender_name,
    exp?.recommender_email
  ];
  if (application?.student_location && application.student_location !== 'massachusetts') {
    sec1Fields.push(exp?.location_detail);
  }

  const sec1FilledCount = sec1Fields.filter(f => f && String(f).trim().length > 0).length;
  let sec1Status: 'complete' | 'incomplete' | 'not_started' = 'not_started';
  if (sec1FilledCount === sec1Fields.length) sec1Status = 'complete';
  else if (sec1FilledCount > 0) sec1Status = 'incomplete';

  // Section 2 Check
  const sec2Fields = [
    exp?.grade_level,
    exp?.programming_experience,
    exp?.languages && exp.languages.length > 0 ? 'valid' : null,
    exp?.ml_technologies && exp.ml_technologies.length > 0 ? 'valid' : null,
    exp?.research_experience,
    application?.needs_financial_aid !== null && application?.needs_financial_aid !== undefined ? 'valid' : null,
    exp?.clubs_activities,
    exp?.final_thoughts
  ];

  const sec2FilledCount = sec2Fields.filter(f => f && String(f).trim().length > 0).length;
  let sec2Status: 'complete' | 'incomplete' | 'not_started' = 'not_started';
  if (sec2FilledCount === sec2Fields.length) sec2Status = 'complete';
  else if (sec2FilledCount > 0) sec2Status = 'incomplete';

  // Section 3 Check: BOTH essays MUST have text to be complete
  const e1 = (application?.essay_one || '').trim();
  const e2 = (application?.essay_two || '').trim();

  let sec3Status: 'complete' | 'incomplete' | 'not_started' = 'not_started';
  if (e1.length > 0 && e2.length > 0) {
    sec3Status = 'complete';
  } else if (e1.length > 0 || e2.length > 0) {
    sec3Status = 'incomplete';
  }

  return { sec1: sec1Status, sec2: sec2Status, sec3: sec3Status };
}