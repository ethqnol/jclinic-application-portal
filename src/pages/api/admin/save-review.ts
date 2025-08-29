import type { APIRoute } from 'astro';
import { getSession, getUserRole } from '../../../lib/auth';

export const POST: APIRoute = async (context) => {
  try {
    const session = await getSession(context);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = context.locals.runtime?.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin or reviewer
    const userRole = await getUserRole(session.user.email, db);
    if (userRole !== 'admin' && userRole !== 'reviewer') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { applicationId, grade, notes } = await context.request.json();

    if (!applicationId) {
      return new Response(JSON.stringify({ error: 'Application ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate grade if provided
    if (grade !== null && (grade < 1 || grade > 5)) {
      return new Response(JSON.stringify({ error: 'Grade must be between 1 and 5' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if application exists and user has access
    const application = await db.prepare(`
      SELECT assigned_to FROM applications 
      WHERE id = ? AND is_draft = 0
    `).bind(applicationId).first();

    if (!application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Only assigned reviewer or admins can save reviews
    if (userRole === 'reviewer' && application.assigned_to !== session.user.email) {
      return new Response(JSON.stringify({ error: 'Application not assigned to you' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update the application with review data
    await db.prepare(`
      UPDATE applications 
      SET reviewer_grade = ?, reviewer_notes = ?
      WHERE id = ?
    `).bind(
      grade,
      notes || null,
      applicationId
    ).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Review saved successfully' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error saving review:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};