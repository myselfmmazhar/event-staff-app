import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/server/prisma";
import { EventService } from "@/services/event.service";
import { EventSchema } from "@/lib/schemas/event.schema";
import {
  getEventWebhookApiKey,
  WEBHOOK_EXTERNAL_ID_LABEL,
} from "@/lib/config/webhook";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Inbound event-creation webhook.
 *
 * An external system POSTs event ("task") data here and this endpoint creates an
 * Event automatically — no user session involved, mirroring the cron route pattern.
 *
 *   POST /api/webhooks/events
 *   Authorization: Bearer <EVENT_WEBHOOK_API_KEY>
 *   Content-Type: application/json
 *
 * Validation reuses `EventSchema.create`, so the mandatory fields (title, venueName,
 * address, city, state, zipCode, timezone) are enforced identically to in-app creation.
 * Ownership (`createdBy`) is resolved to an available admin account.
 * Optional `externalId` provides idempotency (stored in the event's customFields).
 */

/** Constant-time bearer-token comparison (endpoint is internet-facing). */
function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;

  const provided = Buffer.from(header.slice("Bearer ".length).trim());
  const expected = Buffer.from(getEventWebhookApiKey());

  // timingSafeEqual throws on length mismatch — guard first.
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** Resolve the user that webhook-created events are attributed to. */
async function resolveOwnerUserId(): Promise<string | null> {
  const override = process.env.EVENT_WEBHOOK_OWNER_USER_ID?.trim();
  if (override) {
    const user = await prisma.user.findFirst({
      where: { id: override, isActive: true },
      select: { id: true },
    });
    if (user) return user.id;
  }

  // Prefer the oldest active ADMIN, then fall back to SUPER_ADMIN.
  const admin =
    (await prisma.user.findFirst({
      where: { role: "ADMIN", isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }));

  return admin?.id ?? null;
}

export async function POST(request: NextRequest) {
  // 1. Authenticate
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse JSON body
  const body = await request.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // 3. Validate against the same schema the UI uses (unknown keys like
  //    `externalId` are stripped by Zod, so we read it separately below).
  const parsed = EventSchema.create.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const externalIdRaw = (body as Record<string, unknown>).externalId;
  const externalId =
    typeof externalIdRaw === "string" && externalIdRaw.trim()
      ? externalIdRaw.trim()
      : null;

  try {
    // 4. Idempotency — if this externalId was already processed, return it.
    if (externalId) {
      const existing = await prisma.event.findFirst({
        where: {
          customFields: {
            array_contains: [
              { label: WEBHOOK_EXTERNAL_ID_LABEL, value: externalId },
            ],
          },
        },
        select: { id: true, eventId: true },
      });
      if (existing) {
        return NextResponse.json(
          { ok: true, duplicate: true, id: existing.id, eventId: existing.eventId },
          { status: 200 }
        );
      }
    }

    // 5. Resolve owning admin
    const ownerUserId = await resolveOwnerUserId();
    if (!ownerUserId) {
      return NextResponse.json(
        { ok: false, error: "No admin account available to own webhook events" },
        { status: 500 }
      );
    }

    // 6. Stash externalId into customFields for idempotency on future deliveries.
    const data = { ...parsed.data };
    if (externalId) {
      data.customFields = [
        ...(data.customFields ?? []),
        { label: WEBHOOK_EXTERNAL_ID_LABEL, value: externalId },
      ];
    }

    // 7. Create the event
    const event = await new EventService(prisma).create(data, ownerUserId);

    return NextResponse.json(
      { ok: true, id: event.id, eventId: event.eventId },
      { status: 201 }
    );
  } catch (error) {
    console.error("Event webhook failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create event";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
