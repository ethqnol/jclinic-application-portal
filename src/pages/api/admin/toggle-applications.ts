import type { APIRoute } from 'astro';
import { getSession, isAdmin } from '../../../lib/auth';

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
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

    // Check if user is admin
    const userIsAdmin = await isAdmin(session.user.email, db);
    if (!userIsAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const isOpen = formData.get('isOpen') === 'true';

    // Update application settings
    await db.prepare(`
      INSERT OR REPLACE INTO application_settings (id, applications_open, last_updated, updated_by_email)
      VALUES (1, ?, CURRENT_TIMESTAMP, ?)
    `).bind(isOpen ? 1 : 0, session.user.email).run();

    return new Response(JSON.stringify({ 
      success: true, 
      applications_open: isOpen,
      message: `Applications are now ${isOpen ? 'open' : 'closed'}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error toggling application status:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};