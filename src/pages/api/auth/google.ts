import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ redirect, url, locals, cookies }) => {
  const clientId = locals.runtime?.env?.GOOGLE_CLIENT_ID || import.meta.env.GOOGLE_CLIENT_ID;
  
  if (!clientId) {
    console.error('Missing Google Client ID');
    return redirect('/?error=missing_client_id');
  }
  
  const redirectUri = new URL('/api/auth/callback', url.origin).toString();
  
  // Generate cryptographically secure random state parameter
  const stateBytes = new Uint8Array(32);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes, byte => byte.toString(16).padStart(2, '0')).join('');
  
  // Store state in secure cookie for validation
  cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/'
  });
  
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('state', state);

  return redirect(googleAuthUrl.toString());
};