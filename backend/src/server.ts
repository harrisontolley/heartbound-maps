import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { app } from "./app.js";

// Local development entry. On Vercel the app is served via api/index.ts instead
// (and Vercel injects env vars, so .env loading is dev-only).
if (existsSync(".env")) process.loadEnvFile(".env");

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`pinprint-api listening on http://localhost:${info.port}`);
});
