import { Resend } from 'resend';
import nodemailer from 'nodemailer';

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

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@example.com';
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
   * Send email using configured provider
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isEnabled()) {
      // Log invitation URL to console for development
      console.log('\n📧 EMAIL WOULD BE SENT:');
      console.log(`   To: ${to}`);
      console.log(`   Subject: ${subject}`);
      console.log('   (Configure SMTP or Resend to send actual emails)\n');
      return { success: true };
    }

    try {
      if (this.provider === 'smtp' && this.smtpTransport) {
        await this.smtpTransport.sendMail({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        return { success: true };
      }

      if (this.provider === 'resend' && this.resend) {
        const { error } = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      }

      return { success: false, error: 'No email provider available' };
    } catch (error) {
      console.error('Error sending email:', error);
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
    staffTermLabel: string = 'Staff'
  ): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${this.appUrl}/accept-invitation/staff?token=${invitationToken}`;

    return this.sendEmail(
      email,
      `You've been invited to join as ${staffTermLabel}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome, ${firstName}!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              You've been invited to join the team as ${staffTermLabel}. Click the button below to create your account and complete your profile.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              This invitation link will expire in 7 days.
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `
    );
  }

  /**
   * Send user invitation email
   */
  async sendUserInvitation(
    email: string,
    firstName: string,
    invitationToken: string,
    role: string
  ): Promise<{ success: boolean; error?: string }> {
    const inviteUrl = `${this.appUrl}/accept-invitation/user?token=${invitationToken}`;

    return this.sendEmail(
      email,
      `You've been invited to join as ${role}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome, ${firstName}!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              You've been invited to join as a <strong>${role}</strong>. Click the button below to create your password and activate your account.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              This invitation link will expire in 7 days.
            </p>
            <p style="font-size: 14px; color: #6b7280;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color: #667eea; word-break: break-all;">${inviteUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `
    );
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

    return this.sendEmail(
      email,
      `Your ${staffTermLabel} account has been activated`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Account Activated!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Hi ${firstName}, your ${staffTermLabel} account has been activated. You can now log in using the following credentials:
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
            </div>
            <p style="font-size: 14px; color: #ef4444; font-weight: 500;">
              Please change your password after your first login.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Log In Now
              </a>
            </div>
          </div>
        </body>
        </html>
      `
    );
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
      startDate: Date;
      startTime?: string | null;
      endDate: Date;
      endTime?: string | null;
      payRate: number;
      payRateType: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const dashboardUrl = `${this.appUrl}/my-schedule`;

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

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

    const isSameDay =
      callTimeDetails.startDate.toDateString() ===
      callTimeDetails.endDate.toDateString();

    return this.sendEmail(
      email,
      `You're invited: ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited, ${firstName}!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              You've been invited to work as <strong>${callTimeDetails.positionName}</strong> at the following event:
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #667eea; font-size: 20px;">${callTimeDetails.eventTitle}</h2>
              <p style="margin: 8px 0;"><strong>Location:</strong> ${callTimeDetails.eventVenue}, ${callTimeDetails.eventLocation}</p>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${formatDate(callTimeDetails.startDate)}${!isSameDay ? ` - ${formatDate(callTimeDetails.endDate)}` : ''}</p>
              <p style="margin: 8px 0;"><strong>Time:</strong> ${formatTime(callTimeDetails.startTime)} - ${formatTime(callTimeDetails.endTime)}</p>
              <p style="margin: 8px 0;"><strong>Pay Rate:</strong> $${callTimeDetails.payRate.toFixed(2)} ${formatRateType(callTimeDetails.payRateType)}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                View & Respond
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Please respond as soon as possible. Positions are filled on a first-come, first-served basis.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">

            <p style="font-size: 12px; color: #9ca3af;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${dashboardUrl}" style="color: #667eea; word-break: break-all;">${dashboardUrl}</a>
            </p>
          </div>
        </body>
        </html>
      `
    );
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
      startDate: Date;
      startTime?: string | null;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const dashboardUrl = `${this.appUrl}/my-schedule`;

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    const formatTime = (time: string | null | undefined) => {
      if (!time) return 'TBD';
      const [hours, minutes] = time.split(':');
      if (!hours || !minutes) return 'TBD';
      const hour = Number.parseInt(hours, 10);
      if (Number.isNaN(hour)) return 'TBD';
      return `${hour > 12 ? hour - 12 : hour}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
    };

    return this.sendEmail(
      email,
      `Confirmed: ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Confirmed, ${firstName}!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Great news! You've been confirmed for <strong>${callTimeDetails.positionName}</strong> at the following event:
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
              <h2 style="margin: 0 0 15px 0; color: #10b981; font-size: 20px;">${callTimeDetails.eventTitle}</h2>
              <p style="margin: 8px 0;"><strong>Location:</strong> ${callTimeDetails.eventVenue}, ${callTimeDetails.eventLocation}</p>
              <p style="margin: 8px 0;"><strong>Date:</strong> ${formatDate(callTimeDetails.startDate)}</p>
              <p style="margin: 8px 0;"><strong>Time:</strong> ${formatTime(callTimeDetails.startTime)}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                View My Schedule
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              Please make sure to arrive on time. If you need to cancel, please do so as soon as possible.
            </p>
          </div>
        </body>
        </html>
      `
    );
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

    return this.sendEmail(
      email,
      `Waitlisted: ${callTimeDetails.positionName} at ${callTimeDetails.eventTitle}`,
      `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're on the Waitlist, ${firstName}</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; margin-bottom: 20px;">
              Thank you for accepting the invitation for <strong>${callTimeDetails.positionName}</strong> at <strong>${callTimeDetails.eventTitle}</strong>.
            </p>

            <p style="font-size: 16px; margin-bottom: 20px;">
              Unfortunately, all positions have been filled. You've been added to the waitlist and will be notified if a spot becomes available.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                View My Schedule
              </a>
            </div>
          </div>
        </body>
        </html>
      `
    );
  }
}

// Singleton instance
export const emailService = new EmailService();
