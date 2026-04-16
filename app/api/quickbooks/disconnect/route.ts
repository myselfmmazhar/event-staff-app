import { NextResponse } from "next/server";
import { QuickBooksService } from "@/services/quickbooks.service";
import { prisma } from "@/lib/server/prisma";

/**
 * POST /api/quickbooks/disconnect
 * Revokes the QB token and removes the stored connection.
 */
export async function POST() {
  try {
    const qbService = new QuickBooksService(prisma);
    await qbService.disconnect();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("QuickBooks disconnect error:", err);
    return NextResponse.json(
      { error: "Failed to disconnect from QuickBooks" },
      { status: 500 }
    );
  }
}
