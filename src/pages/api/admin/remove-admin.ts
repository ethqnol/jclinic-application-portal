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

    const { emailToRemove } = await context.request.json();

    if (!emailToRemove) {
      return new Response(JSON.stringify({ error: 'Email address required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent self-removal
    if (emailToRemove === session.user.email) {
      return new Response(JSON.stringify({ error: 'Cannot remove your own admin access' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if admin exists
    const adminExists = await db.prepare('SELECT email FROM admins WHERE email = ?')
      .bind(emailToRemove).first();
    
    if (!adminExists) {
      return new Response(JSON.stringify({ error: 'Admin not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Remove admin
    await db.prepare('DELETE FROM admins WHERE email = ?')
      .bind(emailToRemove).run();

    // Unassign any applications assigned to this admin
    await db.prepare(`
      UPDATE applications 
      SET assigned_to = NULL, review_status = 'unassigned', assigned_at = NULL, reviewed_at = NULL
      WHERE assigned_to = ?
    `).bind(emailToRemove).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Removed admin access for ${emailToRemove} and unassigned their applications` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error removing admin:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};