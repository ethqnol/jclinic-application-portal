import type { APIContext } from 'astro';
import { getSession, isAdmin, type Session } from './auth';

export interface GuardResult {
  session: Session;
  db: any;
}

export async function requireAuth(context: { cookies: any; locals: any }): Promise<{ session: Session | null; db: any }> {
  const session = await getSession(context as APIContext);
  const db = context.locals.runtime?.env?.DB;
  return { session, db };
}

export async function requireAdminGuard(context: { cookies: any; locals: any }): Promise<{ session: Session; db: any } | null> {
  const { session, db } = await requireAuth(context);
  
  if (!session || !db) {
    return null;
  }

  const userIsAdmin = await isAdmin(session.user.email, db);
  if (!userIsAdmin) {
    return null;
  }

  return { session, db };
}
