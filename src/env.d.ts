/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_SECRET: string;
}

declare namespace App {
  interface Locals {
    runtime: {
      env: Env;
      cf: any;
      ctx: ExecutionContext;
    };
  }
}