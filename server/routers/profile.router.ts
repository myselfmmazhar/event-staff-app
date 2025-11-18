import { router, protectedProcedure } from "../trpc";
import { UserService } from "@/services/user.service";
import { z } from "zod";

/**
 * Profile Router - Current user profile operations
 */
export const profileRouter = router({
  /**
   * Get current user's profile
   */
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    const userService = new UserService(ctx.prisma);
    // ctx.userId is guaranteed to be a string by protectedProcedure middleware
    return await userService.findOne(ctx.userId!);
  }),

  /**
   * Update current user's profile
   * Users can update their own firstName, lastName, phone, address, emergencyContact
   * They cannot change their role, email, or isActive status
   */
  updateMyProfile: protectedProcedure
    .input(
      z.object({
        firstName: z.string().min(1, "First name is required").optional(),
        lastName: z.string().min(1, "Last name is required").optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        emergencyContact: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      // ctx.userId is guaranteed to be a string by protectedProcedure middleware
      return await userService.update(ctx.userId!, input);
    }),

  /**
   * Change current user's password
   */
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(8),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);

      // Get current user with password
      // ctx.session is guaranteed to exist by protectedProcedure middleware
      const user = await userService.findByEmail(ctx.session!.user.email);

      if (!user) {
        throw new Error("User not found");
      }

      // Verify current password
      const bcrypt = await import("bcryptjs");
      const isValid = await bcrypt.compare(input.currentPassword, user.password!);

      if (!isValid) {
        throw new Error("Current password is incorrect");
      }

      // Update to new password
      // ctx.userId is guaranteed to be a string by protectedProcedure middleware
      return await userService.update(ctx.userId!, {
        password: input.newPassword,
      });
    }),
});
