import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies, redirect }) => {
  // Clear the session cookie with all the same options it was set with
  cookies.set('session', '', {
    httpOnly: true,
    secure: false, // Match development settings
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/'
  });
  
  // Also try to delete it
  cookies.delete('session', { path: '/' });
  
  console.log('User logged out');
  return redirect('/');
};