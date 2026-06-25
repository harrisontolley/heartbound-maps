import { getRequestListener } from "@hono/node-server";
import { app } from "../src/app.js";

// Vercel Functions (Node.js runtime) entry. backend/vercel.json rewrites every
// path to this function, and Hono routes from the original request URL.
// getRequestListener adapts Hono's fetch handler to Node's (req, res) signature
// that @vercel/node expects as a default export.
export const config = { runtime: "nodejs" };

export default getRequestListener(app.fetch);
