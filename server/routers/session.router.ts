import { router, protectedProcedure } from "../trpc";
import { z } from "zod";

/**
 * Session Router - Session management operations
 */
export const sessionRouter = router({
  /**
   * Get all active sessions for current user
   */
  getMySessions: protectedProcedure.query(async ({ ctx }) => {
    // ctx.userId is guaranteed to be a string by protectedProcedure middleware
    const sessions = await ctx.prisma.session.findMany({
      where: {
        userId: ctx.userId!,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    return sessions;
  }),

  /**
   * Revoke a specific session
   */
  revokeSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only allow users to revoke their own sessions
      const session = await ctx.prisma.session.findUnique({
        where: { id: input.sessionId },
      });

      // ctx.userId is guaranteed to be a string by protectedProcedure middleware
      if (!session || session.userId !== ctx.userId!) {
        throw new Error("Session not found or unauthorized");
      }

      await ctx.prisma.session.delete({
        where: { id: input.sessionId },
      });

      return { success: true, message: "Session revoked successfully" };
    }),

  /**
   * Revoke all sessions except current one
   */
  revokeAllOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    // Get current session token from context
    // ctx.session is guaranteed to exist by protectedProcedure middleware
    const currentSessionToken = ctx.session!.session?.token;

    if (!currentSessionToken) {
      throw new Error("Could not identify current session");
    }

    // Delete all sessions except the current one
    // ctx.userId is guaranteed to be a string by protectedProcedure middleware
    await ctx.prisma.session.deleteMany({
      where: {
        userId: ctx.userId!,
        token: {
          not: currentSessionToken,
        },
      },
    });

    return { success: true, message: "All other sessions revoked successfully" };
  }),
});
