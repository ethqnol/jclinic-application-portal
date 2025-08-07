import type { APIRoute } from 'astro';
import { setSession } from '../../../lib/auth';

export const GET: APIRoute = async ({ url, redirect, locals, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  if (!code) {
    console.error('No code provided in callback');
    return redirect('/?error=no_code');
  }

  // Validate state parameter to prevent CSRF attacks
  const storedState = cookies.get('oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    console.error('Invalid or missing state parameter');
    cookies.delete('oauth_state', { path: '/' });
    return redirect('/?error=invalid_state');
  }

  // Clear the state cookie after successful validation
  cookies.delete('oauth_state', { path: '/' });

  try {
    console.log('Starting OAuth flow...');
    
    // Get environment variables - they should be available in locals.runtime.env for Cloudflare
    const clientId = locals.runtime?.env?.GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;
    const clientSecret = locals.runtime?.env?.GOOGLE_CLIENT_SECRET || import.meta.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Missing Google OAuth credentials');
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

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('No access token received');
      return redirect('/?error=token_error');
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userInfo = await userResponse.json();

    // Store or update user in database
    const db = locals.runtime?.env?.DB;
    if (!db) {
      console.error('Database not available');
      return redirect('/?error=db_error');
    }

    // First try to insert the user (if new)
    try {
      await db.prepare(`
        INSERT INTO users (email, name)
        VALUES (?, ?)
      `).bind(userInfo.email, userInfo.name).run();
    } catch (error) {
      // If user already exists, update their name
      await db.prepare(`
        UPDATE users SET name = ? WHERE email = ?
      `).bind(userInfo.name, userInfo.email).run();
    }

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(userInfo.email).first();

    // Set secure session cookie
    const session = {
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
      }
    };

    cookies.set('session', JSON.stringify(session), {
      httpOnly: true,
      secure: true, // Secure in production
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    console.log('Session set, redirecting to dashboard');
    return redirect('/dashboard');
  } catch (error) {
    console.error('Auth error:', error);
    return redirect('/?error=auth_failed');
  }
};