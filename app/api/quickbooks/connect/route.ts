import { NextResponse } from "next/server";
import OAuthClient from "intuit-oauth";
import { createOAuthClient } from "@/services/quickbooks.service";

/**
 * GET /api/quickbooks/connect
 * Redirects the user to the Intuit OAuth consent screen.
 */
export async function GET() {
  const oauthClient = createOAuthClient();

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: crypto.randomUUID(),
  });

  return NextResponse.redirect(authUri);
}
