import { RecommendationService } from './recommendationService';

export interface ApplicationPayload {
  firstName: string;
  lastName: string;
  preferredEmail: string;
  studentLocation: string;
  locationDetail?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  recommenderName?: string;
  recommenderEmail?: string;
  recommenderTitle?: string;
  essayOne?: string;
  essayTwo?: string;
  programmingExperience?: string;
  languages?: string[];
  mlTechnologies?: string[];
  researchExperience?: string;
  gradeLevel?: string;
  needsFinancialAid?: string;
  clubsActivities?: string;
  finalThoughts?: string;
  currentStep?: number;
  deviceFp?: string;
}

export class ApplicationService {
  static async updateUserProfile(db: any, userId: string, payload: { firstName?: string; lastName?: string; preferredEmail?: string }) {
    if (!payload.firstName || !payload.lastName || !payload.preferredEmail) return;
    await db.prepare(`
      UPDATE users 
      SET first_name = ?, last_name = ?, preferred_email = ?, name = ?
      WHERE id = ?
    `).bind(
      payload.firstName,
      payload.lastName,
      payload.preferredEmail,
      `${payload.firstName} ${payload.lastName}`,
      userId
    ).run();
  }

  static async getUserApplication(db: any, userId: string) {
    return await db.prepare('SELECT * FROM applications WHERE user_id = ?').bind(userId).first();
  }

  static async saveDraft(db: any, userId: string, payload: ApplicationPayload) {
    await this.updateUserProfile(db, userId, payload);

    const existing = await this.getUserApplication(db, userId);
    if (existing && existing.is_draft === 0) {
      throw new Error('Application already submitted');
    }

    let existingExp: any = {};
    try {
      if (existing?.experience_data) existingExp = JSON.parse(existing.experience_data);
    } catch (e) {}

    const experienceData = JSON.stringify({
      ...existingExp,
      parent_name: payload.parentName !== undefined ? payload.parentName : existingExp.parent_name || null,
      parent_email: payload.parentEmail !== undefined ? payload.parentEmail : existingExp.parent_email || null,
      parent_phone: payload.parentPhone !== undefined ? payload.parentPhone : existingExp.parent_phone || null,
      recommender_name: payload.recommenderName !== undefined ? payload.recommenderName : existingExp.recommender_name || null,
      recommender_email: payload.recommenderEmail !== undefined ? payload.recommenderEmail : existingExp.recommender_email || null,
      recommender_title: payload.recommenderTitle !== undefined ? payload.recommenderTitle : existingExp.recommender_title || null,
      programming_experience: payload.programmingExperience !== undefined ? payload.programmingExperience : existingExp.programming_experience || null,
      languages: payload.languages !== undefined ? payload.languages : existingExp.languages || [],
      ml_technologies: payload.mlTechnologies !== undefined ? payload.mlTechnologies : existingExp.ml_technologies || [],
      research_experience: payload.researchExperience !== undefined ? payload.researchExperience : existingExp.research_experience || null,
      grade_level: payload.gradeLevel !== undefined ? payload.gradeLevel : existingExp.grade_level || null,
      needs_financial_aid: payload.needsFinancialAid !== undefined ? payload.needsFinancialAid : existingExp.needs_financial_aid || null,
      clubs_activities: payload.clubsActivities !== undefined ? payload.clubsActivities : existingExp.clubs_activities || null,
      final_thoughts: payload.finalThoughts !== undefined ? payload.finalThoughts : existingExp.final_thoughts || null,
      student_location: payload.studentLocation !== undefined ? payload.studentLocation : existingExp.student_location || null,
      location_detail: payload.locationDetail !== undefined ? payload.locationDetail : existingExp.location_detail || null,
      current_step: payload.currentStep !== undefined ? payload.currentStep : existingExp.current_step || 1,
    });

    const needsFinancialAidBool = payload.needsFinancialAid ? (payload.needsFinancialAid === 'yes') : (existing?.needs_financial_aid ?? null);
    const loc = payload.studentLocation || existing?.student_location || null;

    let appId = existing?.id;
    if (existing) {
      await db.prepare(`
        UPDATE applications 
        SET essay_one = ?, essay_two = ?, experience_data = ?, needs_financial_aid = ?, student_location = ?, last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        payload.essayOne !== undefined ? payload.essayOne : existing.essay_one || '',
        payload.essayTwo !== undefined ? payload.essayTwo : existing.essay_two || '',
        experienceData,
        needsFinancialAidBool,
        loc,
        userId
      ).run();
    } else {
      await db.prepare(`
        INSERT INTO applications (user_id, essay_one, essay_two, experience_data, needs_financial_aid, student_location, is_draft)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).bind(
        userId,
        payload.essayOne || '',
        payload.essayTwo || '',
        experienceData,
        needsFinancialAidBool,
        loc
      ).run();
      const newApp = await this.getUserApplication(db, userId);
      appId = newApp?.id;
    }

    if (appId && payload.recommenderName && payload.recommenderEmail) {
      await RecommendationService.saveOrUpdateRecommendation(
        db, 
        appId, 
        payload.recommenderName, 
        payload.recommenderEmail, 
        payload.recommenderTitle || '',
        payload.deviceFp
      );
    }
  }

  static async submitApplication(db: any, userId: string, payload: ApplicationPayload) {
    await this.updateUserProfile(db, userId, payload);

    const existing = await this.getUserApplication(db, userId);
    if (existing && existing.is_draft === 0) {
      throw new Error('Application already submitted');
    }

    let existingExp: any = {};
    try {
      if (existing?.experience_data) existingExp = JSON.parse(existing.experience_data);
    } catch (e) {}

    const experienceData = JSON.stringify({
      ...existingExp,
      parent_name: payload.parentName,
      parent_email: payload.parentEmail,
      parent_phone: payload.parentPhone,
      recommender_name: payload.recommenderName,
      recommender_email: payload.recommenderEmail,
      recommender_title: payload.recommenderTitle,
      programming_experience: payload.programmingExperience,
      languages: payload.languages,
      ml_technologies: payload.mlTechnologies,
      research_experience: payload.researchExperience,
      grade_level: payload.gradeLevel,
      clubs_activities: payload.clubsActivities,
      final_thoughts: payload.finalThoughts,
      location_detail: payload.locationDetail || null,
      current_step: 4
    });

    const needsFinancialAidBool = payload.needsFinancialAid === 'yes';

    let appId = existing?.id;
    if (existing) {
      await db.prepare(`
        UPDATE applications 
        SET essay_one = ?, essay_two = ?, experience_data = ?, needs_financial_aid = ?, student_location = ?, is_draft = 0, submitted_at = CURRENT_TIMESTAMP, last_updated = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        payload.essayOne,
        payload.essayTwo,
        experienceData,
        needsFinancialAidBool,
        payload.studentLocation,
        userId
      ).run();
    } else {
      await db.prepare(`
        INSERT INTO applications (user_id, essay_one, essay_two, experience_data, needs_financial_aid, student_location, is_draft)
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `).bind(
        userId,
        payload.essayOne,
        payload.essayTwo,
        experienceData,
        needsFinancialAidBool,
        payload.studentLocation
      ).run();
      const newApp = await this.getUserApplication(db, userId);
      appId = newApp?.id;
    }

    if (appId && payload.recommenderName && payload.recommenderEmail) {
      await RecommendationService.saveOrUpdateRecommendation(
        db, 
        appId, 
        payload.recommenderName, 
        payload.recommenderEmail, 
        payload.recommenderTitle || '',
        payload.deviceFp
      );
    }
  }

  static async deleteDraft(db: any, userId: string) {
    await db.prepare('DELETE FROM applications WHERE user_id = ? AND is_draft = 1')
      .bind(userId)
      .run();
  }
}
