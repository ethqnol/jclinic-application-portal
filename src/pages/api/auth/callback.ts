import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, redirect, locals, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code) {
    return redirect('/?error=no_code');
  }

  // Validate state parameter to prevent CSRF attacks
  const storedState = cookies.get('oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    cookies.delete('oauth_state', { path: '/' });
    return redirect('/?error=invalid_state');
  }

  cookies.delete('oauth_state', { path: '/' });

  try {
    const clientId = locals.runtime?.env?.GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;
    const clientSecret = locals.runtime?.env?.GOOGLE_CLIENT_SECRET || import.meta.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      return redirect('/?error=missing_credentials');
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: new URL('/api/auth/callback', url.origin).toString(),
      }),
    });

    const tokens: any = await tokenResponse.json();
    if (!tokens || !tokens.access_token) {
      return redirect('/?error=token_error');
    }

    // Fetch user profile from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo: any = await userResponse.json();
    const db = locals.runtime?.env?.DB;
    if (!db || !userInfo || !userInfo.email) {
      return redirect('/?error=db_error');
    }

    const nameParts = (userInfo.name || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Atomic SQLite upsert (ON CONFLICT)
    await db.prepare(`
      INSERT INTO users (email, name, first_name, last_name, preferred_email)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        preferred_email = excluded.preferred_email
    `).bind(userInfo.email, userInfo.name || '', firstName, lastName, userInfo.email).run();

    const user: any = await db.prepare('SELECT * FROM users WHERE email = ?').bind(userInfo.email).first();

    if (!user) {
      return redirect('/?error=db_error');
    }

    const session = {
      user: {
        id: String(user.id),
        email: String(user.email || ''),
        name: String(user.name || ''),
        first_name: String(user.first_name || ''),
        last_name: String(user.last_name || ''),
        preferred_email: String(user.preferred_email || user.email || ''),
      }
    };

    cookies.set('session', JSON.stringify(session), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return redirect('/dashboard');
  } catch (error) {
    console.error('Auth error:', error);
    return redirect('/?error=auth_failed');
  }
};