import { router, publicProcedure, managerProcedure, adminProcedure } from "../trpc";
import { z } from "zod";
import { UserService } from "@/services/user.service";
import { UserSchema } from "@/lib/schemas";
import { emailService } from "@/services/email.service";

/**
 * User Router - All user-related tRPC procedures
 * Includes invitation-based registration flow
 */
export const userRouter = router({
  /**
   * Get all users with pagination, search, and filters
   * Requires: Manager or higher
   */
  getAll: managerProcedure
    .input(UserSchema.query)
    .query(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.findAll(input);
    }),

  /**
   * Get a single user by ID
   * Requires: Manager or higher
   */
  getById: managerProcedure
    .input(UserSchema.id)
    .query(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.findOne(input.id);
    }),

  /**
   * Invite a new user (invitation-based registration)
   * Requires: Admin or higher
   */
  invite: adminProcedure
    .input(UserSchema.invite)
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);

      // Create the user with invitation token
      const user = await userService.invite(input);

      // Send invitation email
      if (user.invitationToken) {
        await emailService.sendUserInvitation(
          user.email,
          user.firstName,
          user.invitationToken,
          user.role
        );
      }

      return user;
    }),

  /**
   * Get invitation info by token (public - for invitation acceptance page)
   */
  getInvitationInfo: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.getInvitationInfo(input.token);
    }),

  /**
   * Accept user invitation (public - user sets their password)
   */
  acceptInvitation: publicProcedure
    .input(UserSchema.acceptInvitation)
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.acceptInvitation(input);
    }),

  /**
   * Resend user invitation email
   * Requires: Admin or higher
   */
  resendInvitation: adminProcedure
    .input(UserSchema.resendInvitation)
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);

      // Regenerate invitation token
      const user = await userService.resendInvitation(input.id);

      // Send invitation email
      if (user.invitationToken) {
        await emailService.sendUserInvitation(
          user.email,
          user.firstName,
          user.invitationToken,
          user.role
        );
      }

      return user;
    }),

  /**
   * Create a new user (legacy - direct creation with password)
   * Requires: Admin or higher
   * @deprecated Use invite() for new users
   */
  create: adminProcedure
    .input(UserSchema.create)
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.create(input);
    }),

  /**
   * Update a user
   * Requires: Admin or higher
   */
  update: adminProcedure
    .input(UserSchema.update)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const userService = new UserService(ctx.prisma);
      return await userService.update(id, data);
    }),

  /**
   * Delete a user
   * Requires: Admin or higher
   */
  delete: adminProcedure
    .input(UserSchema.id)
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.remove(input.id);
    }),

  /**
   * Delete multiple users
   * Requires: Admin or higher
   */
  deleteMany: adminProcedure
    .input(UserSchema.deleteMany)
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.deleteMany(input.ids);
    }),

  /**
   * Deactivate a user
   * Requires: Admin or higher
   */
  deactivate: adminProcedure
    .input(UserSchema.id)
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.deactivate(input.id);
    }),

  /**
   * Activate a user
   * Requires: Admin or higher
   */
  activate: adminProcedure
    .input(UserSchema.id)
    .mutation(async ({ ctx, input }) => {
      const userService = new UserService(ctx.prisma);
      return await userService.activate(input.id);
    }),

  /**
   * Get user statistics for dashboard
   * Requires: Manager or higher
   */
  getStats: managerProcedure.query(async ({ ctx }) => {
    const userService = new UserService(ctx.prisma);
    return await userService.getStats();
  }),
});
