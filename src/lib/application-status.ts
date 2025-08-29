export async function getApplicationStatus(db: any): Promise<boolean> {
  try {
    const result = await db.prepare(`
      SELECT applications_open FROM application_settings WHERE id = 1
    `).first();
    
    // Default to open if no settings found
    return result ? Boolean(result.applications_open) : true;
  } catch (error) {
    console.error('Error getting application status:', error);
    // Default to open on error
    return true;
  }
}