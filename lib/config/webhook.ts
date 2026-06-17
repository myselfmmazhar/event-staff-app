/**
 * Inbound event-creation webhook configuration.
 *
 * The API key is read from the environment first (`EVENT_WEBHOOK_API_KEY`) so it
 * can be rotated per deployment, but falls back to a stable constant default so
 * the integration keeps working even when the env var isn't set. The external
 * system authenticates with: `Authorization: Bearer <key>`.
 */

/** Stable default key — used when EVENT_WEBHOOK_API_KEY is not set. */
export const EVENT_WEBHOOK_API_KEY_DEFAULT =
  "evt_whk_live_3tg_9f4c2a7b8e1d60452c3f";

/** Resolved key the webhook authenticates against. */
export function getEventWebhookApiKey(): string {
  return process.env.EVENT_WEBHOOK_API_KEY?.trim() || EVENT_WEBHOOK_API_KEY_DEFAULT;
}

/**
 * Label used to stash the caller's idempotency id inside the event's
 * `customFields` JSON (avoids a schema migration). A repeat webhook delivery
 * carrying the same `externalId` is treated as a duplicate.
 */
export const WEBHOOK_EXTERNAL_ID_LABEL = "externalId";
