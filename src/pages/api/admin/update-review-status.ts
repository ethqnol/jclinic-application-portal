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
      return new Response(JSON.stringify({ error: 'Forbidden - Admin or Reviewer access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { applicationId, status } = await context.request.json();

    if (!applicationId || !status) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate status
    const validStatuses = ['assigned', 'in_review', 'completed'];
    if (!validStatuses.includes(status)) {
      return new Response(JSON.stringify({ error: 'Invalid status' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // First check if the application exists and get its current state
    const application = await db.prepare(`
      SELECT id, assigned_to, review_status 
      FROM applications 
      WHERE id = ?
    `).bind(applicationId).first();

    if (!application) {
      return new Response(JSON.stringify({ error: 'Application not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user has permission to update this application
    // Admins can update any application, reviewers can only update their assigned ones
    if (userRole === 'reviewer' && application.assigned_to !== session.user.email) {
      return new Response(JSON.stringify({ error: 'You can only update applications assigned to you' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update the application status
    const result = await db.prepare(`
      UPDATE applications 
      SET review_status = ?, reviewed_at = ?
      WHERE id = ?
    `).bind(
      status,
      status === 'completed' ? new Date().toISOString() : null,
      applicationId
    ).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({ error: 'Failed to update application' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Application status updated to ${status}` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating review status:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};