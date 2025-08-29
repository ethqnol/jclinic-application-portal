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

    // Check if user is admin (only admins can assign applications)
    const userIsAdmin = await isAdmin(session.user.email, db);
    if (!userIsAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { applicationIds, assignToEmail, action } = await context.request.json();

    if (action === 'auto_assign') {
      // Auto-assign logic
      // Get all admin and reviewer emails
      const admins = await db.prepare('SELECT email FROM admins').all();
      const reviewers = await db.prepare('SELECT email FROM reviewers').all();
      const allAssignees = [...(admins.results || []), ...(reviewers.results || [])];
      
      if (allAssignees.length === 0) {
        return new Response(JSON.stringify({ error: 'No admins or reviewers found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Get unassigned applications
      const unassignedApps = await db.prepare(`
        SELECT id FROM applications 
        WHERE is_draft = 0 AND (assigned_to IS NULL OR assigned_to = '') 
        ORDER BY submitted_at ASC
      `).all();

      if (!unassignedApps.results || unassignedApps.results.length === 0) {
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'No unassigned applications found' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Distribute applications evenly among all assignees
      const assigneeEmails = allAssignees.map((assignee: any) => assignee.email);
      let assignedCount = 0;

      for (let i = 0; i < unassignedApps.results.length; i++) {
        const app = unassignedApps.results[i];
        const assignToEmail = assigneeEmails[i % assigneeEmails.length];
        
        await db.prepare(`
          UPDATE applications 
          SET assigned_to = ?, review_status = 'assigned', assigned_at = ?
          WHERE id = ?
        `).bind(assignToEmail, new Date().toISOString(), app.id).run();
        
        assignedCount++;
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Auto-assigned ${assignedCount} applications` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Manual assignment
      if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
        return new Response(JSON.stringify({ error: 'No applications selected' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!assignToEmail) {
        return new Response(JSON.stringify({ error: 'No admin selected' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Verify the assignee is an admin or reviewer
      const adminExists = await db.prepare('SELECT email FROM admins WHERE email = ?')
        .bind(assignToEmail).first();
      const reviewerExists = await db.prepare('SELECT email FROM reviewers WHERE email = ?')
        .bind(assignToEmail).first();
      
      if (!adminExists && !reviewerExists) {
        return new Response(JSON.stringify({ error: 'Invalid assignee email' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Assign selected applications
      for (const appId of applicationIds) {
        await db.prepare(`
          UPDATE applications 
          SET assigned_to = ?, review_status = 'assigned', assigned_at = ?
          WHERE id = ? AND is_draft = 0
        `).bind(assignToEmail, new Date().toISOString(), appId).run();
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: `Assigned ${applicationIds.length} applications to ${assignToEmail}` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error assigning applications:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};