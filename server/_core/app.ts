import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

export async function createApp() {
  const app = express();
  const server = createServer(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  // In Vercel, NODE_ENV is typically 'production', but we might not want serveStatic 
  // if Vercel handles static files via 'output: "standalone"' or similar, 
  // but here we are using a custom serverless function approach.
  // For Vercel Serverless Function, we effectively want the Express app to handle the API,
  // and potentially serve the static files if we are rewriting everything to this function.
  // However, usually Vercel serves static files from the 'public' or 'dist' folder automatically if configured.
  // Let's keep the logic consistent: if dev -> vite, else -> static.
  // NOTE: On Vercel, files might be in a different location.
  
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  return { app, server };
}
