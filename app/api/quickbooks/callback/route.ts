import { NextRequest, NextResponse } from "next/server";
import OAuthClient from "intuit-oauth";
import { createOAuthClient } from "@/services/quickbooks.service";
import { prisma } from "@/lib/server/prisma";

/**
 * GET /api/quickbooks/callback
 * Exchanges the auth code for access + refresh tokens and stores them.
 */
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const oauthClient = createOAuthClient();

    // Exchange auth code → tokens
    const authResponse = await oauthClient.createToken(req.url);
    const token = authResponse.getJson();

    const realmId = oauthClient.getToken().realmId;
    if (!realmId) {
      return NextResponse.redirect(
        `${appUrl}/settings/quickbooks?error=missing_realm_id`
      );
    }

    const expiresAt = new Date(
      Date.now() + (token.expires_in ?? 3600) * 1000
    );

    // Upsert the connection record
    await prisma.quickBooksConnection.upsert({
      where: { realmId },
      create: {
        realmId,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiry: expiresAt,
        environment: process.env.QUICKBOOKS_ENVIRONMENT ?? "sandbox",
      },
      update: {
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        tokenExpiry: expiresAt,
      },
    });

    return NextResponse.redirect(
      `${appUrl}/settings/quickbooks?connected=true`
    );
  } catch (err) {
    console.error("QuickBooks OAuth callback error:", err);
    return NextResponse.redirect(
      `${appUrl}/settings/quickbooks?error=oauth_failed`
    );
  }
}
