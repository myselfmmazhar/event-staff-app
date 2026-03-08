import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/server/prisma';
import { TemplateService } from './template.service';
import type { EmailTemplateType } from '@prisma/client';

type EmailProvider = 'resend' | 'smtp' | 'none';

/**
 * Email Service supporting multiple providers:
 * - Resend (production)
 * - SMTP/Mailtrap (development)
 */
export class EmailService {
  private resend: Resend | null = null;
  private smtpTransport: nodemailer.Transporter | null = null;
  private fromEmail: string;
  private appUrl: string;
  private provider: EmailProvider = 'none';
  private templateService: TemplateService;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    this.templateService = new TemplateService(prisma);

    // Try SMTP first (Mailtrap for development)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.smtpTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      this.provider = 'smtp';
      console.log('📧 Email service using SMTP (Mailtrap)');
    }
    // Fallback to Resend
    else if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
      this.provider = 'resend';
      console.log('📧 Email service using Resend');
    }
    // No email provider configured
    else {
      console.warn('⚠️ No email provider configured. Email sending will be disabled.');
      console.warn('   Set SMTP_HOST/SMTP_USER/SMTP_PASS for Mailtrap, or RESEND_API_KEY for Resend.');
    }
  }

  /**
   * Check if email service is configured and available
   */
  isEnabled(): boolean {
    return this.provider !== 'none';
  }

  /**
   * Send email using configured provider and log the communication
   */
  private async sendEmail(to: string, subject: string, html: string, senderId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { sendEmail: utilsSendEmail } = await import('@/lib/utils/email');
      const result = await utilsSendEmail(prisma, to, subject, html);

      // Log the communication if senderId is provided
      if (senderId) {
        try {
          await prisma.communicationLog.create({
            data: {
              type: 'EMAIL',
              recipient: to,
              subject,
              content: html,
              status: 'SENT',
              senderId: senderId,
            }
          });
        } catch (logError) {
          console.error('Error logging communication:', logError);
          // Don't fail the whole email flow if logging fails
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending email:', error);

      // Fallback to basic logging to console if no provider is configured
      if (!this.isEnabled()) {
        console.log('\n📧 EMAIL WOULD BE SENT (Log to Console Only):');
        console.log(`   To: ${to}`);
        console.log(`   Subject: ${subject}`);
        console.log('   (Configure SMTP or Resend to send actual emails)\n');

        // Even in dev mode, we might want to log it to the DB if a senderId exists
        if (senderId) {
          await prisma.communicationLog.create({
            data: {
              type: 'EMAIL',
              recipient: to,
              subject,
              content: html,
              status: 'SENT', // Mark as sent for dev visibility
              senderId: senderId,
            }
          }).catch(() => { });
        }

        return { success: true };
      }

      // Log failed attempt if senderId is provided
      if (senderId) {
        await prisma.communicationLog.create({
          data: {
            type: 'EMAIL',
            recipient: to,
            subject,
            content: html,
            status: 'FAILED',
            error: error instanceof Error ? error.message : 'Unknown error',
            senderId: senderId,
          }
        }).catch(() => { });
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send staff invitation email
   */
  async sendStaffInvitation(
    email: string,
    firstName: string,
    invitationToken: string,
    staffTermLabel: string = 'Staff',
    senderId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${this.appUrl}/accept-invitation/staff?token=${invitationToken}`;

    try {
      const { subject, html } = await this.templateService.renderEmail(
        'STAFF_INVITATION',
        {
          firstName,
          email,
          staffTermLabel,
          inviteUrl,
        }
      );

      return this.sendEmail(email, subject, html, senderId);
    } catch (error) {
      console.error('Error rendering staff invitation template:', error);
      // Fallback to basic email if template rendering fails
      return this.sendEmail(
        email,
        `You've been invited to join as ${staffTermLabel}`,
        `<p>Hi ${firstName}, you've been invited to join as ${staffTermLabel}.</p><p><a href="${inviteUrl}">Accept Invitation</a></p>`,
        senderId
      );
    }
  }

  /**
   * Send client portal invitation email
   */
  async sendClientInvitation(
    email: string,
    firstName: string,
    invitationToken: string,
    senderId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${this.appUrl}/accept-invitation/client?token=${invitationToken}`;

    try {
      const { subject, html } = await this.templateService.renderEmail(
        'CLIENT_INVITATION',
        {
          firstName,
          email,
          inviteUrl,
        }
      );

      return this.sendEmail(email, subject, html, senderId);
    } catch (error) {
      console.error('Error rendering client invitation template:', error);
      return this.sendEmail(
        email,
        `You've been invited to the Client Portal`,
        `<p>Hi ${firstName}, you've been invited to access the Client Portal.</p><p><a href="${inviteUrl}">Accept Invitation</a></p>`,
        senderId
      );
    }
  }

  /**
   * Send user invitation email
   */
  async sendUserInvitation(
    email: string,
    firstName: string,
    invitationToken: string,
    role: string,
    senderId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${this.appUrl}/accept-invitation/user?token=${invitationToken}`;

    try {
      const { subject, html } = await this.templateService.renderEmail(
        'USER_INVITATION',
        {
          firstName,
          email,
          role,
          inviteUrl,
        }
      );

      return this.sendEmail(email, subject, html, senderId);
    } catch (error) {
      console.error('Error rendering user invitation template:', error);
      // Fallback to basic email if template rendering fails
      return this.sendEmail(
        email,
        `You've been invited to join as ${role}`,
        `<p>Hi ${firstName}, you've been invited to join as ${role}.</p><p><a href="${inviteUrl}">Accept Invitation</a></p>`,
        senderId
      );
    }
  }

  /**
   * Send staff login credentials email (for grant login access)
   */
  async sendStaffCredentials(
    email: string,
    firstName: string,
    tempPassword: string,
    staffTermLabel: string = 'Staff'
  ): Promise<{ success: boolean; error?: string }> {
    const loginUrl = `${this.appUrl}/login`;

    try {
      const { subject, html } = await this.templateService.renderEmail(
        'STAFF_CREDENTIALS',
        {
          firstName,
          email,
          staffTermLabel,
          tempPassword,
          loginUrl,
        }
      );

      return this.sendEmail(email, subject, html);
    } catch (error) {
      console.error('Error rendering staff credentials template:', error);
      return this.sendEmail(
        email,
        `Your ${staffTermLabel} account has been activated`,
        `<p>Hi ${firstName}, your ${staffTermLabel} account has been activated.</p><p>Email: ${email}</p><p>Temporary Password: ${tempPassword}</p><p><a href="${loginUrl}">Log In Now</a></p>`
      );
    }
  }

  /**
   * Send call time invitation email
   */
  async sendCallTimeInvitation(
    email: string,
    firstName: string,
    callTimeDetails: {
      positionName: string;
      eventTitle: string;
      eventVenue: string;
      eventLocation: string;
      startDate: Date | null;
      startTime?: string | null;
      endDate: Date | null;
      endTime?: string | null;
      payRate: number;
      payRateType: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const dashboardUrl = `${this.appUrl}/my-schedule`;

    const formatDate = (date: Date | null) => {
      if (!date || date.getFullYear() === 1970) return 'UBD';
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatTime = (time: string | null | undefined) => {
      if (!time) return 'TBD';
      const [hours, minutes] = time.split(':');
      if (!hours || !minutes) return 'TBD';
      const hour = Number.parseInt(hours, 10);
      if (Number.isNaN(hour)) return 'TBD';
      return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
    };

    const formatRateType = (type: string) => {
      const labels: Record<string, string> = {
        PER_HOUR: 'per hour',
        PER_SHIFT: 'per shift',
        PER_DAY: 'per day',
        PER_EVENT: 'per event',
      };
      return labels[type] || type.toLowerCase().replace('_', ' ');
    };

    const startD = callTimeDetails.startDate;
    const endD = callTimeDetails.endDate;
    const isSameDay = startD && endD && startD.getFullYear() !== 1970 && endD.getFullYear() !== 1970 &&
      startD.toDateString() === endD.toDateString();

    try {
      const { subject, html } = await this.templateService.renderEmail(
        'CALL_TIME_INVITATION',
        {
          firstName,
          email,
          positionName: callTimeDetails.positionName,
          eventTitle: callTimeDetails.eventTitle,
          eventVenue: callTimeDetails.eventVenue,
          eventLocation: callTimeDetails.eventLocation,
          startDate: formatDate(callTimeDetails.startDate),
          endDate: isSameDay ? formatDate(callTimeDetails.startDate) : formatDate(callTimeDetails.endDate),
          startTime: formatTime(callTimeDetails.startTime),
          endTime: formatTime(callTimeDetails.endTime),
          payRate: `$${callTimeDetails.payRate.toFixed(2)}`,
          payRateType: formatRateType(callTimeDetails.payRateType),
          dashboardUrl,
        }
      );

      return this.sendEmail(email, subject, html);
    } catch (error) {
      console.error('Error rendering call time invitation template:', error);
      return this.sendEmail(
        email,
        `You're invited: ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}`,
        `<p>Hi ${firstName}, you've been invited to work as ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}.</p><p><a href="${dashboardUrl}">View & Respond</a></p>`
      );
    }
  }

  /**
   * Send call time confirmation email (when staff is confirmed)
   */
  async sendCallTimeConfirmation(
    email: string,
    firstName: string,
    callTimeDetails: {
      positionName: string;
      eventTitle: string;
      eventVenue: string;
      eventLocation: string;
      startDate: Date | null;
      startTime?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const dashboardUrl = `${this.appUrl}/my-schedule`;

    const formatDate = (date: Date | null) => {
      if (!date || date.getFullYear() === 1970) return 'UBD';
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatTime = (time: string | null | undefined) => {
      if (!time) return 'TBD';
      const [hours, minutes] = time.split(':');
      if (!hours || !minutes) return 'TBD';
      const hour = Number.parseInt(hours, 10);
      if (Number.isNaN(hour)) return 'TBD';
      return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
    };

    try {
      const { subject, html } = await this.templateService.renderEmail(
        'CALL_TIME_CONFIRMATION',
        {
          firstName,
          email,
          positionName: callTimeDetails.positionName,
          eventTitle: callTimeDetails.eventTitle,
          eventVenue: callTimeDetails.eventVenue,
          eventLocation: callTimeDetails.eventLocation,
          startDate: formatDate(callTimeDetails.startDate),
          startTime: formatTime(callTimeDetails.startTime),
          dashboardUrl,
        }
      );

      return this.sendEmail(email, subject, html);
    } catch (error) {
      console.error('Error rendering call time confirmation template:', error);
      return this.sendEmail(
        email,
        `Confirmed: ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}`,
        `<p>Hi ${firstName}, you've been confirmed for ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}.</p><p><a href="${dashboardUrl}">View My Schedule</a></p>`
      );
    }
  }

  /**
   * Send call time waitlist notification email
   */
  async sendCallTimeWaitlisted(
    email: string,
    firstName: string,
    callTimeDetails: {
      positionName: string;
      eventTitle: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const dashboardUrl = `${this.appUrl}/my-schedule`;

    try {
      const { subject, html } = await this.templateService.renderEmail(
        'CALL_TIME_WAITLISTED',
        {
          firstName,
          email,
          positionName: callTimeDetails.positionName,
          eventTitle: callTimeDetails.eventTitle,
          dashboardUrl,
        }
      );

      return this.sendEmail(email, subject, html);
    } catch (error) {
      console.error('Error rendering call time waitlisted template:', error);
      return this.sendEmail(
        email,
        `Waitlisted: ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}`,
        `<p>Hi ${firstName}, you're on the waitlist for ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}.</p><p><a href="${dashboardUrl}">View My Schedule</a></p>`
      );
    }
  }
}

// Singleton instance
export const emailService = new EmailService();
