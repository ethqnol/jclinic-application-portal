import type { APIRoute } from 'astro';
import { getSession, isAdmin } from '../../../lib/auth';

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

    // Check if user is admin
    const userIsAdmin = await isAdmin(session.user.email, db);
    if (!userIsAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get count of currently assigned applications
    const assignedCount = await db.prepare(`
      SELECT COUNT(*) as count FROM applications 
      WHERE is_draft = 0 AND assigned_to IS NOT NULL AND assigned_to != ''
    `).first();

    // Unassign all applications
    await db.prepare(`
      UPDATE applications 
      SET assigned_to = NULL, review_status = 'unassigned', assigned_at = NULL, reviewed_at = NULL
      WHERE is_draft = 0 AND assigned_to IS NOT NULL
    `).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Unassigned ${assignedCount.count} applications` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error unassigning applications:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};