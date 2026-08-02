import { getRandomPythonQuestions, PYTHON_TIME_LIMIT_SECONDS } from '../python-questions';

export type PythonAssessmentStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'expired';

export interface PythonAssessmentItem {
  id: string;
  title: string;
  code: string;
  prompt: string;
  answer?: string;
}

export interface PythonAssessment {
  status: PythonAssessmentStatus;
  questions?: PythonAssessmentItem[];
  started_at?: string;
  submitted_at?: string;
  time_limit_seconds?: number;
}

export class PythonAssessmentService {
  static async getExperienceData(db: any, userId: string): Promise<{ app: any; exp: any } | null> {
    const app = await db.prepare('SELECT * FROM applications WHERE user_id = ?').bind(userId).first();
    if (!app) return null;

    let exp: any = {};
    try {
      if (app.experience_data) exp = JSON.parse(app.experience_data);
    } catch (e) {}

    return { app, exp };
  }

  static async writeExperienceData(db: any, userId: string, exp: any) {
    await db
      .prepare(
        `UPDATE applications
         SET experience_data = ?, last_updated = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      )
      .bind(JSON.stringify(exp), userId)
      .run();
  }

  static async ensureDraftApplication(db: any, userId: string) {
    const existing = await db.prepare('SELECT * FROM applications WHERE user_id = ?').bind(userId).first();
    if (existing) {
      if (existing.is_draft === 0) {
        throw new Error('Application already submitted');
      }
      return existing;
    }

    await db
      .prepare(
        `INSERT INTO applications (user_id, essay_one, essay_two, experience_data, is_draft)
         VALUES (?, '', '', '{}', 1)`
      )
      .bind(userId)
      .run();

    return await db.prepare('SELECT * FROM applications WHERE user_id = ?').bind(userId).first();
  }

  static async startAssessment(db: any, userId: string): Promise<PythonAssessment> {
    await this.ensureDraftApplication(db, userId);
    const data = await this.getExperienceData(db, userId);
    if (!data) throw new Error('Application not found');

    const { exp } = data;
    const existing: PythonAssessment | undefined = exp.python_assessment;

    if (existing && (existing.status === 'completed' || existing.status === 'in_progress')) {
      return existing;
    }

    const picked = getRandomPythonQuestions(2);
    const assessment: PythonAssessment = {
      status: 'in_progress',
      questions: picked.map((q) => ({
        id: q.id,
        title: q.title,
        code: q.code,
        prompt: q.prompt,
      })),
      started_at: new Date().toISOString(),
      time_limit_seconds: PYTHON_TIME_LIMIT_SECONDS,
    };

    exp.python_assessment = assessment;
    await this.writeExperienceData(db, userId, exp);
    return assessment;
  }

  static async skipAssessment(db: any, userId: string): Promise<PythonAssessment> {
    await this.ensureDraftApplication(db, userId);
    const data = await this.getExperienceData(db, userId);
    if (!data) throw new Error('Application not found');

    const assessment: PythonAssessment = {
      status: 'skipped',
    };
    data.exp.python_assessment = { ...(data.exp.python_assessment || {}), ...assessment };
    await this.writeExperienceData(db, userId, data.exp);
    return data.exp.python_assessment;
  }

  static async saveAnswers(
    db: any,
    userId: string,
    payload: {
      answers: { id: string; answer: string }[];
      expired?: boolean;
    }
  ): Promise<PythonAssessment> {
    const data = await this.getExperienceData(db, userId);
    if (!data) throw new Error('Application not found');
    if (data.app.is_draft === 0) throw new Error('Application already submitted');

    const existing: PythonAssessment = data.exp.python_assessment || {};
    if (!existing.questions?.length) {
      throw new Error('No active Python assessment');
    }

    if (existing.status === 'completed') {
      return existing;
    }

    const answerMap = new Map(
      payload.answers.map((a) => [a.id, typeof a.answer === 'string' ? a.answer.trim() : ''])
    );

    const questions: PythonAssessmentItem[] = existing.questions.map((q) => ({
      ...q,
      answer: answerMap.has(q.id) ? answerMap.get(q.id)! : q.answer || '',
    }));

    const assessment: PythonAssessment = {
      ...existing,
      questions,
      submitted_at: new Date().toISOString(),
      status: payload.expired ? 'expired' : 'completed',
    };

    data.exp.python_assessment = assessment;
    await this.writeExperienceData(db, userId, data.exp);
    return assessment;
  }

  static async setPythonExperience(db: any, userId: string, value: 'yes' | 'no') {
    await this.ensureDraftApplication(db, userId);
    const data = await this.getExperienceData(db, userId);
    if (!data) throw new Error('Application not found');
    data.exp.python_experience = value;
    await this.writeExperienceData(db, userId, data.exp);
  }
}
