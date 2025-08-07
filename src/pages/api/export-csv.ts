import type { APIRoute } from 'astro';
import { getSession, isAdmin } from '../../lib/auth';

export const GET: APIRoute = async ({ locals, cookies }) => {
  const session = await getSession({ cookies } as any);
  
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = locals.runtime?.env.DB;
  if (!db) {
    return new Response('Database not available', { status: 500 });
  }

  // Check if user is admin
  const userIsAdmin = await isAdmin(session.user.email, db);
  if (!userIsAdmin) {
    return new Response('Unauthorized', { status: 403 });
  }

  try {
    // Get all submitted applications with user data (exclude drafts)
    const applications = await db.prepare(`
      SELECT 
        a.id,
        u.name,
        u.email,
        a.essay_one,
        a.essay_two,
        a.experience_data,
        a.submitted_at
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE a.is_draft = 0
      ORDER BY a.submitted_at DESC
    `).all();

    if (!applications.results || applications.results.length === 0) {
      return new Response('No applications found', { status: 404 });
    }

    // Create CSV content
    const headers = [
      'Application ID',
      'Name',
      'Email',
      'Submitted Date',
      'Programming Experience',
      'Languages',
      'Research Experience',
      'Grade Level',
      'Clubs & Activities',
      'Final Thoughts',
      'Essay 1 (Interests & Background)',
      'Essay 2 (Future Goals)'
    ];

    let csvContent = headers.join(',') + '\n';

    applications.results.forEach((app: any) => {
      const experienceData = JSON.parse(app.experience_data);
      const row = [
        app.id,
        `"${app.name.replace(/"/g, '""')}"`,
        app.email,
        new Date(app.submitted_at).toLocaleDateString(),
        experienceData.programming_experience,
        `"${experienceData.languages.join(', ')}"`,
        experienceData.research_experience,
        experienceData.grade_level || experienceData.academic_year, // Handle both field names for backward compatibility
        `"${experienceData.clubs_activities.replace(/"/g, '""')}"`,
        `"${experienceData.final_thoughts.replace(/"/g, '""')}"`,
        `"${app.essay_one.replace(/"/g, '""')}"`,
        `"${app.essay_two.replace(/"/g, '""')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    // Return CSV file
    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="applications-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('CSV export error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};