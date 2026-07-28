export class RecommendationService {
  private static async ensureTableExists(db: any) {
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
    } catch (e) {
      console.error('ensureTableExists Error:', e);
    }
  }

  static isPersonalEmail(email: string): boolean {
    const domain = (email || '').split('@')[1]?.toLowerCase() || '';
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'icloud.com', 'aol.com', 'msn.com', 'protonmail.com', 'mail.com', 'gmx.com'
    ];
    return personalDomains.includes(domain);
  }

  static generateToken(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  static generatePIN(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async saveOrUpdateRecommendation(
    db: any, 
    applicationId: number, 
    name: string, 
    email: string, 
    title: string,
    applicantDeviceFp?: string
  ) {
    await this.ensureTableExists(db);

    if (!name || !email) return null;

    const isPersonal = this.isPersonalEmail(email) ? 1 : 0;

    const existing = await db.prepare(
      'SELECT * FROM recommendations WHERE application_id = ?'
    ).bind(applicationId).first();

    const cleanFp = applicantDeviceFp || '';

    if (existing) {
      await db.prepare(`
        UPDATE recommendations 
        SET recommender_name = ?, recommender_email = ?, recommender_title = ?, is_personal_email = ?, applicant_device_fp = COALESCE(NULLIF(?, ''), applicant_device_fp)
        WHERE id = ?
      `).bind(name, email, title || '', isPersonal, cleanFp, existing.id).run();
      return existing;
    } else {
      const token = this.generateToken();
      const pin = this.generatePIN();
      await db.prepare(`
        INSERT INTO recommendations (application_id, recommender_name, recommender_email, recommender_title, token, pin, is_submitted, is_personal_email, applicant_device_fp)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).bind(applicationId, name, email, title || '', token, pin, isPersonal, cleanFp).run();

      return await db.prepare(
        'SELECT * FROM recommendations WHERE application_id = ?'
      ).bind(applicationId).first();
    }
  }

  static async getByToken(db: any, token: string) {
    await this.ensureTableExists(db);

    const rec = await db.prepare(`
      SELECT r.*, a.user_id, a.submitted_at as app_submitted_at, u.email as user_email, u.first_name, u.last_name, u.name as user_name
      FROM recommendations r
      JOIN applications a ON r.application_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE r.token = ?
    `).bind(token).first();

    return rec || null;
  }

  static async submitLetter(
    db: any, 
    token: string, 
    pin: string, 
    letterText: string, 
    submitterIp: string,
    recommenderDeviceFp?: string,
    userAgent?: string,
    isSameSessionUser?: boolean
  ) {
    await this.ensureTableExists(db);

    const rec = await this.getByToken(db, token);
    if (!rec) {
      throw new Error('Recommendation record not found');
    }

    if (rec.pin.trim() !== pin.trim()) {
      throw new Error('Invalid 6-Digit PIN. Please check the PIN provided in the recommendation email.');
    }

    if (rec.is_submitted) {
      throw new Error('Recommendation letter has already been submitted.');
    }

    if (!letterText || letterText.trim().length < 20) {
      throw new Error('Please enter a valid recommendation letter.');
    }

    let isSuspicious = 0;
    
    if (isSameSessionUser) {
      isSuspicious = 1;
    } else if (rec.user_email && rec.recommender_email && rec.user_email.toLowerCase().trim() === rec.recommender_email.toLowerCase().trim()) {
      isSuspicious = 1;
    } else if (recommenderDeviceFp && rec.applicant_device_fp && recommenderDeviceFp === rec.applicant_device_fp) {
      isSuspicious = 1;
    } else if (rec.app_submitted_at) {
      const appTime = new Date(rec.app_submitted_at).getTime();
      const nowTime = Date.now();
      if (!isNaN(appTime) && (nowTime - appTime) < 3 * 60 * 1000) {
        isSuspicious = 1;
      }
    }

    await db.prepare(`
      UPDATE recommendations
      SET letter_text = ?, is_submitted = 1, submitted_at = CURRENT_TIMESTAMP, submitter_ip = ?, recommender_device_fp = ?, user_agent = ?, is_suspicious_submission = ?
      WHERE id = ?
    `).bind(
      letterText.trim(), 
      submitterIp || 'unknown', 
      recommenderDeviceFp || '', 
      userAgent || '', 
      isSuspicious,
      rec.id
    ).run();

    return true;
  }

  static async getForApplication(db: any, applicationId: number) {
    await this.ensureTableExists(db);

    return await db.prepare(
      'SELECT * FROM recommendations WHERE application_id = ?'
    ).bind(applicationId).first();
  }
}
