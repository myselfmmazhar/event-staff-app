import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/server/prisma";
import { EventService } from "@/services/event.service";

/**
 * Cron endpoint to update event statuses based on time
 * - ASSIGNED → IN_PROGRESS: when start datetime is reached
 * - IN_PROGRESS → COMPLETED: when end datetime has passed
 *
 * This endpoint is platform-agnostic and can be called by:
 * - Vercel Cron (configured in vercel.json)
 * - AWS CloudWatch/EventBridge
 * - System crontab
 * - Any external scheduler
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  console.log("[CRON] Event status update job started", {
    timestamp: new Date().toISOString(),
  });

  // Verify cron secret for security (required in production)
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!cronSecret && !isDev) {
    console.error("[CRON] CRON_SECRET environment variable is not configured");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  // Skip auth check in development if no secret is configured
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const cronHeader = request.headers.get("x-cron-secret");

    // Allow Vercel's internal cron calls (they use Authorization: Bearer <CRON_SECRET>)
    // Or custom x-cron-secret header for manual/external calls
    const providedSecret =
      authHeader?.replace("Bearer ", "") || cronHeader;

    if (providedSecret !== cronSecret) {
      console.warn("[CRON] Unauthorized access attempt", {
        hasAuthHeader: !!authHeader,
        hasCronHeader: !!cronHeader,
      });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    const eventService = new EventService(prisma);
    const result = await eventService.updateStatusesBasedOnTime();

    const duration = Date.now() - startTime;
    console.log("[CRON] Event status update job completed", {
      toInProgress: result.toInProgress,
      toCompleted: result.toCompleted,
      totalUpdated: result.toInProgress + result.toCompleted,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      updated: {
        toInProgress: result.toInProgress,
        toCompleted: result.toCompleted,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[CRON] Event status update job failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: duration,
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update event statuses",
      },
      { status: 500 }
    );
  }
}
