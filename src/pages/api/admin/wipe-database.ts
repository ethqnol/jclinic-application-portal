import type { APIRoute } from 'astro';
import { getSession, isAdmin } from '../../../lib/auth';

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

  // Check if user is admin
  const userIsAdmin = await isAdmin(session.user.email, db);
  if (!userIsAdmin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get confirmation code from request
    const formData = await request.formData();
    const confirmationCode = formData.get('confirmationCode') as string;
    
    // Require specific confirmation code for safety
    if (confirmationCode !== 'WIPE_ALL_DATA') {
      return new Response(JSON.stringify({ error: 'Invalid confirmation code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`ADMIN ${session.user.email} is wiping the database!`);

    // Delete all applications (both drafts and submitted)
    const applicationsResult = await db.prepare('DELETE FROM applications').run();
    
    // Delete all users except admins (to preserve admin access)
    const adminEmails = await db.prepare('SELECT email FROM admins').all();
    const adminEmailList = adminEmails.results.map((admin: any) => `'${admin.email}'`).join(',');
    
    let usersResult;
    if (adminEmailList) {
      usersResult = await db.prepare(`DELETE FROM users WHERE email NOT IN (${adminEmailList})`).run();
    } else {
      // If no admins found, delete all users (this would be dangerous)
      usersResult = await db.prepare('DELETE FROM users').run();
    }

    console.log(`Database wiped by admin: ${applicationsResult.changes} applications deleted, ${usersResult.changes} users deleted`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Database wiped successfully',
      deleted: {
        applications: applicationsResult.changes,
        users: usersResult.changes
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Database wipe error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};