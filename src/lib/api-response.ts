/**
 * Standardized API Response Utilities
 */

export function jsonResponse(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  });
}

export function errorResponse(error: string, status = 400, details: any = null): Response {
  const body: { error: string; details?: any } = { error };
  if (details) {
    body.details = details;
  }
  return jsonResponse(body, status);
}
