import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      console.error('[OAuth] Missing code or state - code:', !!code, 'state:', !!state);
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      console.log('[OAuth] Callback iniciado - code:', code?.substring(0, 10) + '...', 'state:', state?.substring(0, 10) + '...');
      
      // Decodificar state para verificar redirect URI
      let decodedState = '';
      try {
        decodedState = atob(state);
        console.log('[OAuth] Decoded state (redirect URI):', decodedState);
      } catch (e) {
        console.error('[OAuth] Failed to decode state:', e);
      }
      
      let tokenResponse;
      try {
        tokenResponse = await sdk.exchangeCodeForToken(code, state);
        console.log('[OAuth] Token obtido com sucesso');
      } catch (tokenError: any) {
        console.error('[OAuth] Token exchange failed:', {
          message: tokenError?.message,
          response: tokenError?.response?.data,
          status: tokenError?.response?.status
        });
        throw tokenError;
      }
      
      let userInfo;
      try {
        userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
        console.log('[OAuth] UserInfo obtido:', { openId: userInfo.openId, email: userInfo.email });
      } catch (userInfoError: any) {
        console.error('[OAuth] getUserInfo failed:', {
          message: userInfoError?.message,
          response: userInfoError?.response?.data,
          status: userInfoError?.response?.status
        });
        throw userInfoError;
      }

      if (!userInfo.openId) {
        console.error('[OAuth] openId missing from userInfo:', userInfo);
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      try {
        await db.upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: new Date(),
        });
        console.log('[OAuth] Upsert concluído');
      } catch (dbError: any) {
        console.error('[OAuth] Database upsert failed:', dbError?.message);
        throw dbError;
      }

      // Verificar status do usuário após upsert
      const user = await db.getUserByOpenId(userInfo.openId);
      console.log('[OAuth] Usuário encontrado:', { id: user?.id, email: user?.email, status: user?.status });
      
      if (!user) {
        console.error('[OAuth] User not found after upsert for openId:', userInfo.openId);
        res.status(500).json({ error: "Failed to create/retrieve user" });
        return;
      }

      if (user.status !== 'aprovado') {
        console.log('[OAuth] User not approved:', { status: user.status, email: user.email });
        res.status(403).json({ 
          error: "Sua conta está aguardando aprovação. Entre em contato com um administrador.",
          status: user.status 
        });
        return;
      }

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      console.log('[OAuth] Login successful for:', user.email);
      res.redirect(302, "/");
    } catch (error: any) {
      console.error('[OAuth] Callback failed - Full error:', {
        message: error?.message,
        name: error?.name,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status
      });
      console.error('[OAuth] Stack trace:', error instanceof Error ? error.stack : 'N/A');
      
      // Retornar mais detalhes do erro para facilitar diagnóstico
      const errorMessage = error?.response?.data?.message || error?.message || "OAuth callback failed";
      res.status(500).json({ 
        error: "OAuth callback failed",
        details: errorMessage
      });
    }
  });
}
