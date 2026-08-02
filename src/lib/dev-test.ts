/** Test portal is for local `astro dev` only — never in production builds. */
export function isDevTestEnabled(): boolean {
  return !import.meta.env.PROD;
}

/** Whether this request should render the no-auth, no-persist test application. */
export function isDevTestRequest(locals: { isDevTest?: boolean }, url: URL): boolean {
  if (!isDevTestEnabled()) return false;
  return (
    Boolean(locals.isDevTest) ||
    url.searchParams.get("dev_test") === "1" ||
    url.pathname === "/test" ||
    url.pathname.endsWith("/test")
  );
}
