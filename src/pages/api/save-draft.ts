import type { APIRoute } from 'astro';
import { getSession } from '../../lib/auth';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const session = await getSession({ cookies } as any);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const db = locals.runtime?.env.DB;
  if (!db) {
    return new Response(JSON.stringify({ error: 'Database not available' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    
    // Extract all form data (no validation required for drafts)
    const essayOne = formData.get('essay_one') as string;
    const essayTwo = formData.get('essay_two') as string;
    const programmingExperience = formData.get('programming_experience') as string;
    const languages = formData.getAll('languages');
    const researchExperience = formData.get('research_experience') as string;
    const gradeLevel = formData.get('grade_level') as string;
    const clubsActivities = formData.get('clubs_activities') as string;
    const finalThoughts = formData.get('final_thoughts') as string;
    
    // Debug specific fields that aren't working
    console.log('Debug form extraction:', {
      programmingExperience: `"${programmingExperience}"`,
      researchExperience: `"${researchExperience}"`,
      languagesCount: languages.length,
      gradeLevel: `"${gradeLevel}"`
    });
    
    // Prepare experience data as JSON (allow nulls for drafts)
    const experienceData = JSON.stringify({
      programming_experience: programmingExperience || null,
      languages: languages || [],
      research_experience: researchExperience || null,
      grade_level: gradeLevel || null,
      clubs_activities: clubsActivities || null,
      final_thoughts: finalThoughts || null
    });

    // Check if user already has a draft or submitted application
    const existing = await db.prepare('SELECT id, is_draft FROM applications WHERE user_id = ?')
      .bind(session.user.id)
      .first();
    
    if (existing && existing.is_draft === 0) {
      // User has already submitted, cannot save draft
      return new Response(JSON.stringify({ error: 'Application already submitted' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (existing) {
      // Update existing draft
      await db.prepare(`
        UPDATE applications 
        SET essay_one = ?, essay_two = ?, experience_data = ?, last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        essayOne || '',
        essayTwo || '',
        experienceData,
        session.user.id
      ).run();
    } else {
      // Create new draft
      await db.prepare(`
        INSERT INTO applications (user_id, essay_one, essay_two, experience_data, is_draft)
        VALUES (?, ?, ?, ?, 1)
      `).bind(
        session.user.id,
        essayOne || '',
        essayTwo || '',
        experienceData
      ).run();
    }

    return new Response(JSON.stringify({ success: true, message: 'Draft saved successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Draft save error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error', error instanceof Error ? error.stack : '');
    return new Response(JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};