import type { APIContext } from 'astro';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Session {
  user: User;
}

export async function getSession(context: APIContext): Promise<Session | null> {
  const sessionCookie = context.cookies.get('session');
  
  if (!sessionCookie || !sessionCookie.value) {
    console.log('No session cookie found');
    return null;
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value);
    
    // Validate session structure
    if (!sessionData.user || !sessionData.user.id || !sessionData.user.email) {
      console.log('Invalid session structure');
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error('Error parsing session');
    return null;
  }
}

export function setSession(context: APIContext, session: Session) {
  context.cookies.set('session', JSON.stringify(session), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });
}

export function clearSession(context: APIContext) {
  context.cookies.delete('session');
}

export async function isAdmin(email: string, db: any): Promise<boolean> {
  const admin = await db.prepare('SELECT id FROM admins WHERE email = ?').bind(email).first();
  return !!admin;
}