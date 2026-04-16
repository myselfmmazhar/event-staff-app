import { router, adminProcedure, protectedProcedure } from "../trpc";
import { QuickBooksSchema } from "@/lib/schemas/quickbooks.schema";
import { QuickBooksService } from "@/services/quickbooks.service";
import { TRPCError } from "@trpc/server";

export const quickbooksRouter = router({
  /** Returns whether a QB connection exists and connection metadata. */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const qbService = new QuickBooksService(ctx.prisma);
    const conn = await qbService.getConnection();
    if (!conn) return { connected: false, realmId: null, environment: null, tokenExpiry: null };
    return {
      connected: true,
      realmId: conn.realmId,
      environment: conn.environment,
      tokenExpiry: conn.tokenExpiry,
    };
  }),

  /** Returns how many entities of each type have been synced to QB. */
  getSyncStats: adminProcedure.query(async ({ ctx }) => {
    const qbService = new QuickBooksService(ctx.prisma);
    const connected = await qbService.isConnected();
    if (!connected) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "QuickBooks is not connected." });
    return qbService.getSyncStats();
  }),

  /** Push a single invoice to QuickBooks. */
  syncInvoice: adminProcedure
    .input(QuickBooksSchema.syncOne)
    .mutation(async ({ ctx, input }) => {
      const qbService = new QuickBooksService(ctx.prisma);
      try {
        return await qbService.syncInvoice(input.id);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to sync invoice",
        });
      }
    }),

  /** Push a single bill to QuickBooks. */
  syncBill: adminProcedure
    .input(QuickBooksSchema.syncOne)
    .mutation(async ({ ctx, input }) => {
      const qbService = new QuickBooksService(ctx.prisma);
      try {
        return await qbService.syncBill(input.id);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to sync bill",
        });
      }
    }),

  /** Push a single client as a QB Customer. */
  syncClient: adminProcedure
    .input(QuickBooksSchema.syncOne)
    .mutation(async ({ ctx, input }) => {
      const qbService = new QuickBooksService(ctx.prisma);
      try {
        return await qbService.syncClient(input.id);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to sync client",
        });
      }
    }),

  /** Push a single staff member as a QB Vendor. */
  syncStaff: adminProcedure
    .input(QuickBooksSchema.syncOne)
    .mutation(async ({ ctx, input }) => {
      const qbService = new QuickBooksService(ctx.prisma);
      try {
        return await qbService.syncStaff(input.id);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to sync staff",
        });
      }
    }),

  /** Disconnect QuickBooks — revokes token and removes connection record. */
  disconnect: adminProcedure.mutation(async ({ ctx }) => {
    const qbService = new QuickBooksService(ctx.prisma);
    try {
      await qbService.disconnect();
      return { success: true };
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : "Failed to disconnect",
      });
    }
  }),
});
