import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';
import { getApplicationStatus } from '../../lib/application-status';

export const POST: APIRoute = async ({ request, locals, redirect, cookies }) => {
  const session = await getSession({ cookies } as any);
  
  if (!session) {
    return redirect('/');
  }

  const db = locals.runtime?.env.DB;
  if (!db) {
    return new Response('Database not available', { status: 500 });
  }

  // Check if applications are open
  const applicationsOpen = await getApplicationStatus(db);
  if (!applicationsOpen) {
    return new Response(JSON.stringify({ error: 'Applications are currently closed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    
    // Extract personal information
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    const preferredEmail = formData.get('preferred_email') as string;
    const studentLocation = formData.get('student_location') as string;
    
    // Extract essay responses
    const essayOne = formData.get('essay_one') as string;
    const essayTwo = formData.get('essay_two') as string;
    
    // Extract other form data
    const programmingExperience = formData.get('programming_experience') as string;
    const languages = formData.getAll('languages');
    const researchExperience = formData.get('research_experience') as string;
    const gradeLevel = formData.get('grade_level') as string;
    const needsFinancialAid = formData.get('needs_financial_aid') as string;
    const clubsActivities = formData.get('clubs_activities') as string;
    const finalThoughts = formData.get('final_thoughts') as string;
    
    // Validate required fields
    if (!firstName || !lastName || !preferredEmail || !studentLocation || !essayOne || !essayTwo || !programmingExperience || !researchExperience || !gradeLevel || !needsFinancialAid || !clubsActivities || !finalThoughts) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Update user's personal information
    await db.prepare(`
      UPDATE users 
      SET first_name = ?, last_name = ?, preferred_email = ?, name = ?
      WHERE id = ?
    `).bind(firstName, lastName, preferredEmail, `${firstName} ${lastName}`, session.user.id).run();

    // Check if user already has a submitted application
    const existing = await db.prepare('SELECT id, is_draft FROM applications WHERE user_id = ?')
      .bind(session.user.id)
      .first();
    
    if (existing && existing.is_draft === 0) {
      return redirect('/dashboard?error=already_submitted');
    }

    // Prepare experience data as JSON
    const experienceData = JSON.stringify({
      programming_experience: programmingExperience,
      languages: languages,
      research_experience: researchExperience,
      grade_level: gradeLevel,
      clubs_activities: clubsActivities,
      final_thoughts: finalThoughts
    });
    
    // Convert financial aid to boolean
    const needsFinancialAidBool = needsFinancialAid === 'yes';

    if (existing) {
      // Update existing draft to submitted
      await db.prepare(`
        UPDATE applications 
        SET essay_one = ?, essay_two = ?, experience_data = ?, needs_financial_aid = ?, student_location = ?, is_draft = 0, submitted_at = CURRENT_TIMESTAMP, last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        essayOne,
        essayTwo,
        experienceData,
        needsFinancialAidBool,
        studentLocation,
        session.user.id
      ).run();
    } else {
      // Insert new application
      await db.prepare(`
        INSERT INTO applications (user_id, essay_one, essay_two, experience_data, needs_financial_aid, student_location, is_draft)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).bind(
        session.user.id,
        essayOne,
        essayTwo,
        experienceData,
        needsFinancialAidBool,
        studentLocation
      ).run();
    }

    return redirect('/dashboard?success=submitted');
  } catch (error) {
    console.error('Application submission error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};