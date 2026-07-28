import type { APIRoute } from 'astro';
import { requireAdminGuard } from '../../../lib/auth-guards';
import { jsonResponse, errorResponse } from '../../../lib/api-response';
import { getApplicationStatus } from '../../../lib/application-status';

export const POST: APIRoute = async (context) => {
  const guard = await requireAdminGuard(context);
  if (!guard) {
    return errorResponse('Forbidden: Admin access required', 403);
  }

  const db = guard.db;

  try {
    // Ensure table exists
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS application_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        applications_open BOOLEAN DEFAULT 1,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by_email TEXT
      )
    `).run();

    const currentStatus = await getApplicationStatus(db);
    const newStatus = !currentStatus;

    // Update settings row
    await db.prepare(`
      INSERT OR REPLACE INTO application_settings (id, applications_open, last_updated, updated_by_email)
      VALUES (1, ?, CURRENT_TIMESTAMP, ?)
    `).bind(newStatus ? 1 : 0, guard.session.user.email).run();

    return jsonResponse({
      success: true,
      applications_open: newStatus,
      message: `Applications are now ${newStatus ? 'open' : 'closed'}`
    });
  } catch (error: any) {
    console.error('Error toggling application status:', error);
    return errorResponse(error.message || 'Internal server error', 500);
  }
};