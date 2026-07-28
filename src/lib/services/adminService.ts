export class AdminService {
  private static async ensureTablesExist(db: any) {
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS recommendations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          application_id INTEGER NOT NULL,
          recommender_name TEXT NOT NULL,
          recommender_email TEXT NOT NULL,
          recommender_title TEXT,
          token TEXT UNIQUE NOT NULL,
          pin TEXT NOT NULL,
          letter_text TEXT,
          is_submitted BOOLEAN DEFAULT 0,
          submitted_at DATETIME,
          submitter_ip TEXT,
          is_personal_email BOOLEAN DEFAULT 0,
          applicant_device_fp TEXT,
          recommender_device_fp TEXT,
          user_agent TEXT,
          is_suspicious_submission BOOLEAN DEFAULT 0,
          FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
        );
      `).run();
    } catch (e) {}

    try {
      await db.prepare('ALTER TABLE applications ADD COLUMN reviewed_at DATETIME').run();
    } catch (e) {}

    const columns = [
      'ALTER TABLE recommendations ADD COLUMN is_personal_email BOOLEAN DEFAULT 0',
      'ALTER TABLE recommendations ADD COLUMN applicant_device_fp TEXT',
      'ALTER TABLE recommendations ADD COLUMN recommender_device_fp TEXT',
      'ALTER TABLE recommendations ADD COLUMN user_agent TEXT',
      'ALTER TABLE recommendations ADD COLUMN is_suspicious_submission BOOLEAN DEFAULT 0'
    ];

    for (const sql of columns) {
      try { await db.prepare(sql).run(); } catch (e) {}
    }
  }

  static async getAllApplications(db: any) {
    await this.ensureTablesExist(db);

    const { results } = await db.prepare(`
      SELECT 
        a.*,
        u.email as user_email,
        u.name as user_name,
        u.first_name,
        u.last_name,
        u.preferred_email,
        r.recommender_name,
        r.recommender_email,
        r.recommender_title,
        r.letter_text,
        r.is_submitted as rec_is_submitted,
        r.submitted_at as rec_submitted_at,
        r.is_personal_email,
        r.is_suspicious_submission,
        r.applicant_device_fp,
        r.recommender_device_fp
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN recommendations r ON a.id = r.application_id
      WHERE a.is_draft = 0
      ORDER BY a.submitted_at DESC
    `).all();
    return results || [];
  }

  static async saveRating(db: any, applicationId: number, rating: number, notes: string) {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    await this.ensureTablesExist(db);

    await db.prepare(`
      UPDATE applications 
      SET reviewer_grade = ?, reviewer_notes = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND is_draft = 0
    `).bind(rating, notes || '', applicationId).run();
  }

  static async getAllAdmins(db: any) {
    const { results } = await db.prepare(`
      SELECT id, email, created_at 
      FROM admins 
      ORDER BY created_at ASC
    `).all();
    return results || [];
  }

  static async addAdmin(db: any, email: string) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Invalid email address');
    }

    await db.prepare(`
      INSERT OR IGNORE INTO admins (email) VALUES (?)
    `).bind(cleanEmail).run();
  }

  static async removeAdmin(db: any, targetEmail: string, currentAdminEmail: string) {
    const cleanTarget = (targetEmail || '').trim().toLowerCase();
    const cleanCurrent = (currentAdminEmail || '').trim().toLowerCase();

    if (cleanTarget === cleanCurrent) {
      throw new Error('You cannot demote yourself');
    }

    await db.prepare(`
      DELETE FROM admins WHERE email = ?
    `).bind(cleanTarget).run();
  }

  static async wipeDatabase(db: any, confirmPhrase: string) {
    const EXPECTED_PHRASE = 'DELETE ALL APPLICATIONS AND USERS';
    if ((confirmPhrase || '').trim() !== EXPECTED_PHRASE) {
      throw new Error('Confirmation phrase does not match');
    }

    // Delete applications and applicant users, retaining administrator table and admin users
    await db.prepare('DELETE FROM applications').run();
    await db.prepare('DELETE FROM users WHERE email NOT IN (SELECT email FROM admins)').run();
    try {
      await db.prepare('DELETE FROM recommendations').run();
    } catch (e) {}
  }
}
