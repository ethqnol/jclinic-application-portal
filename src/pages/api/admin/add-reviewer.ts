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

    // Check if user is admin (only admins can add reviewers)
    const userIsAdmin = await isAdmin(session.user.email, db);
    if (!userIsAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { email } = await context.request.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email address required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email is already a reviewer
    const existingReviewer = await db.prepare('SELECT email FROM reviewers WHERE email = ?')
      .bind(email).first();
    
    if (existingReviewer) {
      return new Response(JSON.stringify({ error: 'User is already a reviewer' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email is an admin
    const existingAdmin = await db.prepare('SELECT email FROM admins WHERE email = ?')
      .bind(email).first();
    
    if (existingAdmin) {
      return new Response(JSON.stringify({ error: 'User is already an admin' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add reviewer
    await db.prepare('INSERT INTO reviewers (email) VALUES (?)')
      .bind(email).run();

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Added ${email} as reviewer` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error adding reviewer:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};