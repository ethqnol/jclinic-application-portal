/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    runtime?: {
      env: {
        GOOGLE_CLIENT_ID?: string;
        GOOGLE_CLIENT_SECRET?: string;
        AUTH_SECRET?: string;
        DB?: D1Database;
      };
    };
  }
}