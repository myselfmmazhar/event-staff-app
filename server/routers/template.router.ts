import { router, adminProcedure } from '../trpc';
import { z } from 'zod';
import { TemplateService } from '@/services/template.service';
import {
  updateEmailTemplateSchema,
  updateSmsTemplateSchema,
  updateBrandingSchema,
  emailTemplateTypeSchema,
  smsTemplateTypeSchema,
} from '@/lib/schemas/template.schema';

const emailTemplateWithBatch = z.enum([
  'STAFF_INVITATION',
  'CLIENT_INVITATION',
  'CALL_TIME_INVITATION',
  'CALL_TIME_CONFIRMATION',
  'CALL_TIME_WAITLISTED',
  'STAFF_CREDENTIALS',
  'USER_INVITATION',
  'CALL_INVITATION_BATCH',
]);

const smsTemplateWithBatch = z.enum([
  'STAFF_INVITATION',
  'CLIENT_INVITATION',
  'CALL_TIME_INVITATION',
  'CALL_TIME_CONFIRMATION',
  'CALL_TIME_WAITLISTED',
  'STAFF_CREDENTIALS',
  'USER_INVITATION',
  'CALL_INVITATION_BATCH',
]);

/**
 * Template Router - Email and SMS template management
 * All endpoints are admin-only
 */
export const templateRouter = router({
  // ============ EMAIL TEMPLATES ============

  /**
   * Get all email templates
   */
  getAllEmailTemplates: adminProcedure.query(async ({ ctx }) => {
    const templateService = new TemplateService(ctx.prisma);
    return await templateService.getAllEmailTemplates();
  }),

  /**
   * Get single email template by type
   */
  getEmailTemplate: adminProcedure
    .input(z.object({ type: emailTemplateTypeSchema }))
    .query(async ({ ctx, input }) => {
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.getEmailTemplate(input.type);
    }),

  /**
   * Update email template
   */
  updateEmailTemplate: adminProcedure
    .input(updateEmailTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.updateEmailTemplate(input.type, {
        subject: input.subject,
        bodyHtml: input.bodyHtml,
      });
    }),

  /**
   * Reset email template to default
   */
  resetEmailTemplate: adminProcedure
    .input(z.object({ type: emailTemplateTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.resetEmailTemplate(input.type);
    }),

  /**
   * Preview email template with sample data
   */
  previewEmailTemplate: adminProcedure
    .input(
      z.object({
        type: emailTemplateTypeSchema,
        subject: z.string().optional(),
        bodyHtml: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      console.log('Previewing email template:', input.type);
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.renderEmailPreview(
        input.type,
        input.subject,
        input.bodyHtml
      );
    }),

  // ============ SMS TEMPLATES ============

  /**
   * Get all SMS templates
   */
  getAllSmsTemplates: adminProcedure.query(async ({ ctx }) => {
    const templateService = new TemplateService(ctx.prisma);
    return await templateService.getAllSmsTemplates();
  }),

  /**
   * Get single SMS template by type
   */
  getSmsTemplate: adminProcedure
    .input(z.object({ type: smsTemplateTypeSchema }))
    .query(async ({ ctx, input }) => {
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.getSmsTemplate(input.type);
    }),

  /**
   * Update SMS template
   */
  updateSmsTemplate: adminProcedure
    .input(updateSmsTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.updateSmsTemplate(input.type, {
        body: input.body,
      });
    }),

  /**
   * Reset SMS template to default
   */
  resetSmsTemplate: adminProcedure
    .input(z.object({ type: smsTemplateTypeSchema }))
    .mutation(async ({ ctx, input }) => {
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.resetSmsTemplate(input.type);
    }),

  /**
   * Preview SMS template with sample data
   */
  previewSmsTemplate: adminProcedure
    .input(
      z.object({
        type: smsTemplateTypeSchema,
        body: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.renderSmsPreview(input.type, input.body);
    }),

  // ============ BRANDING SETTINGS ============

  /**
   * Get branding settings
   */
  getBrandingSettings: adminProcedure.query(async ({ ctx }) => {
    const templateService = new TemplateService(ctx.prisma);
    return await templateService.getBrandingSettings();
  }),

  /**
   * Update branding settings
   */
  updateBrandingSettings: adminProcedure
    .input(updateBrandingSchema)
    .mutation(async ({ ctx, input }) => {
      const templateService = new TemplateService(ctx.prisma);
      return await templateService.updateBrandingSettings(input);
    }),

  /**
   * Reset branding to defaults
   */
  resetBrandingSettings: adminProcedure.mutation(async ({ ctx }) => {
    const templateService = new TemplateService(ctx.prisma);
    return await templateService.resetBrandingSettings();
  }),
});
