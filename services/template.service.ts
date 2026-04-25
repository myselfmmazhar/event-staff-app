import type { PrismaClient, EmailTemplateType, SmsTemplateType } from '@prisma/client';
import {
  getDefaultEmailTemplate,
  getDefaultSmsTemplate,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_SMS_TEMPLATES,
  DEFAULT_BRANDING,
  getSampleVariables,
  type DefaultEmailTemplate,
  type DefaultSmsTemplate,
} from '@/lib/config/default-templates';

export interface EmailTemplateWithMeta {
  id: string | null;
  type: EmailTemplateType;
  subject: string;
  headerTitle: string | null;
  bodyHtml: string;
  isCustomized: boolean;
  description: string;
  availableVariables: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface SmsTemplateWithMeta {
  id: string | null;
  type: SmsTemplateType;
  body: string;
  isCustomized: boolean;
  description: string;
  availableVariables: string[];
  maxLength: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface BrandingSettings {
  id: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  buttonStyle: string;
  buttonBorderRadius: string;
  fontFamily: string;
  headerBackground: string;
  footerText: string | null;
}

export interface RenderedEmail {
  subject: string;
  html: string;
}

/**
 * Template Service
 * Manages email templates, SMS templates, and branding settings
 */
export class TemplateService {
  constructor(private prisma: PrismaClient) { }

  private normalizeCallTimeInvitationBody(bodyHtml: string): string {
    // Auto-upgrade legacy single-CTA invitation templates to dual accept/reject actions.
    const hasAccept = bodyHtml.includes('{{acceptUrl}}');
    const hasReject = bodyHtml.includes('{{rejectUrl}}');
    if (hasAccept && hasReject) return bodyHtml;

    const legacyCtaRegex = /\{\{button:[^|]+\|\{\{dashboardUrl\}\}\}\}/;
    const replacement = `<div style="text-align: center; margin: 30px 0;">
  {{action_button:Accept Offer|{{acceptUrl}}}}
  {{danger_button:Reject Offer|{{rejectUrl}}}}
</div>`;

    if (legacyCtaRegex.test(bodyHtml)) {
      return bodyHtml.replace(legacyCtaRegex, replacement);
    }

    return `${bodyHtml}\n\n${replacement}`;
  }

  // ============ EMAIL TEMPLATES ============

  /**
   * Get email template by type (with fallback to default)
   */
  async getEmailTemplate(type: EmailTemplateType): Promise<EmailTemplateWithMeta> {
    let customTemplate = null;
    try {
      // Don't query DB for batch until it's synced
      if (type !== 'CALL_INVITATION_BATCH' as any) {
        customTemplate = await this.prisma.emailTemplate.findUnique({
          where: { type },
        });
      }
    } catch (e) {
      console.warn(`Could not fetch custom email template for ${type}:`, e);
    }

    const defaultTemplate = getDefaultEmailTemplate(type);
    if (!defaultTemplate) {
      throw new Error(`No default template found for type: ${type}`);
    }

    if (customTemplate) {
      const normalizedBody =
        type === 'CALL_TIME_INVITATION'
          ? this.normalizeCallTimeInvitationBody(customTemplate.bodyHtml)
          : customTemplate.bodyHtml;
      return {
        id: customTemplate.id,
        type: customTemplate.type,
        subject: customTemplate.subject,
        headerTitle: null, // Custom templates can set this via subject
        bodyHtml: normalizedBody,
        isCustomized: customTemplate.isCustomized,
        description: defaultTemplate.description,
        availableVariables: defaultTemplate.availableVariables,
        createdAt: customTemplate.createdAt,
        updatedAt: customTemplate.updatedAt,
      };
    }

    return {
      id: null,
      type,
      subject: defaultTemplate.subject,
      headerTitle: defaultTemplate.headerTitle ?? null,
      bodyHtml: defaultTemplate.bodyHtml,
      isCustomized: false,
      description: defaultTemplate.description,
      availableVariables: defaultTemplate.availableVariables,
      createdAt: null,
      updatedAt: null,
    };
  }

  /**
   * Get all email templates (custom + defaults for uncustomized)
   */
  async getAllEmailTemplates(): Promise<EmailTemplateWithMeta[]> {
    const customTemplates = await this.prisma.emailTemplate.findMany();

    return DEFAULT_EMAIL_TEMPLATES.map(defaultTemplate => {
      const customTemplate = customTemplates.find(t => t.type === defaultTemplate.type);

      if (customTemplate) {
        const normalizedBody =
          defaultTemplate.type === 'CALL_TIME_INVITATION'
            ? this.normalizeCallTimeInvitationBody(customTemplate.bodyHtml)
            : customTemplate.bodyHtml;
        return {
          id: customTemplate.id,
          type: customTemplate.type,
          subject: customTemplate.subject,
          headerTitle: null,
          bodyHtml: normalizedBody,
          isCustomized: customTemplate.isCustomized,
          description: defaultTemplate.description,
          availableVariables: defaultTemplate.availableVariables,
          createdAt: customTemplate.createdAt,
          updatedAt: customTemplate.updatedAt,
        };
      }

      return {
        id: null,
        type: defaultTemplate.type,
        subject: defaultTemplate.subject,
        headerTitle: defaultTemplate.headerTitle ?? null,
        bodyHtml: defaultTemplate.bodyHtml,
        isCustomized: false,
        description: defaultTemplate.description,
        availableVariables: defaultTemplate.availableVariables,
        createdAt: null,
        updatedAt: null,
      };
    });
  }

  /**
   * Update or create email template
   */
  async updateEmailTemplate(
    type: EmailTemplateType,
    data: { subject: string; bodyHtml: string }
  ) {
    return await this.prisma.emailTemplate.upsert({
      where: { type },
      update: {
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        isCustomized: true,
      },
      create: {
        type,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        isCustomized: true,
      },
    });
  }

  /**
   * Reset email template to default
   */
  async resetEmailTemplate(type: EmailTemplateType): Promise<DefaultEmailTemplate | undefined> {
    await this.prisma.emailTemplate.deleteMany({
      where: { type },
    });

    return getDefaultEmailTemplate(type);
  }

  // ============ SMS TEMPLATES ============

  /**
   * Get SMS template by type (with fallback to default)
   */
  async getSmsTemplate(type: SmsTemplateType): Promise<SmsTemplateWithMeta> {
    let customTemplate = null;
    try {
      // Don't query DB for batch until it's synced
      if (type !== 'CALL_INVITATION_BATCH' as any) {
        customTemplate = await this.prisma.smsTemplate.findUnique({
          where: { type },
        });
      }
    } catch (e) {
      console.warn(`Could not fetch custom SMS template for ${type}:`, e);
    }

    const defaultTemplate = getDefaultSmsTemplate(type);
    if (!defaultTemplate) {
      throw new Error(`No default template found for type: ${type}`);
    }

    if (customTemplate) {
      return {
        id: customTemplate.id,
        type: customTemplate.type,
        body: customTemplate.body,
        isCustomized: customTemplate.isCustomized,
        description: defaultTemplate.description,
        availableVariables: defaultTemplate.availableVariables,
        maxLength: defaultTemplate.maxLength,
        createdAt: customTemplate.createdAt,
        updatedAt: customTemplate.updatedAt,
      };
    }

    return {
      id: null,
      type,
      body: defaultTemplate.body,
      isCustomized: false,
      description: defaultTemplate.description,
      availableVariables: defaultTemplate.availableVariables,
      maxLength: defaultTemplate.maxLength,
      createdAt: null,
      updatedAt: null,
    };
  }

  /**
   * Get all SMS templates (custom + defaults for uncustomized)
   */
  async getAllSmsTemplates(): Promise<SmsTemplateWithMeta[]> {
    const customTemplates = await this.prisma.smsTemplate.findMany();

    return DEFAULT_SMS_TEMPLATES.map(defaultTemplate => {
      const customTemplate = customTemplates.find(t => t.type === defaultTemplate.type);

      if (customTemplate) {
        return {
          id: customTemplate.id,
          type: customTemplate.type,
          body: customTemplate.body,
          isCustomized: customTemplate.isCustomized,
          description: defaultTemplate.description,
          availableVariables: defaultTemplate.availableVariables,
          maxLength: defaultTemplate.maxLength,
          createdAt: customTemplate.createdAt,
          updatedAt: customTemplate.updatedAt,
        };
      }

      return {
        id: null,
        type: defaultTemplate.type,
        body: defaultTemplate.body,
        isCustomized: false,
        description: defaultTemplate.description,
        availableVariables: defaultTemplate.availableVariables,
        maxLength: defaultTemplate.maxLength,
        createdAt: null,
        updatedAt: null,
      };
    });
  }

  /**
   * Update or create SMS template
   */
  async updateSmsTemplate(
    type: SmsTemplateType,
    data: { body: string }
  ) {
    return await this.prisma.smsTemplate.upsert({
      where: { type },
      update: {
        body: data.body,
        isCustomized: true,
      },
      create: {
        type,
        body: data.body,
        isCustomized: true,
      },
    });
  }

  /**
   * Reset SMS template to default
   */
  async resetSmsTemplate(type: SmsTemplateType): Promise<DefaultSmsTemplate | undefined> {
    await this.prisma.smsTemplate.deleteMany({
      where: { type },
    });

    return getDefaultSmsTemplate(type);
  }

  // ============ BRANDING SETTINGS ============

  /**
   * Get branding settings (with defaults)
   */
  async getBrandingSettings(): Promise<BrandingSettings> {
    const settings = await this.prisma.emailBrandingSettings.findFirst();

    if (settings) {
      return {
        id: settings.id,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        buttonStyle: settings.buttonStyle,
        buttonBorderRadius: settings.buttonBorderRadius,
        fontFamily: settings.fontFamily,
        headerBackground: settings.headerBackground,
        footerText: settings.footerText,
      };
    }

    return {
      id: null,
      ...DEFAULT_BRANDING,
    };
  }

  /**
   * Update branding settings
   */
  async updateBrandingSettings(data: Partial<{
    logoUrl: string | null;
    primaryColor: string;
    secondaryColor: string;
    buttonStyle: string;
    buttonBorderRadius: string;
    fontFamily: string;
    headerBackground: string;
    footerText: string | null;
  }>) {
    const existing = await this.prisma.emailBrandingSettings.findFirst();

    if (existing) {
      return await this.prisma.emailBrandingSettings.update({
        where: { id: existing.id },
        data,
      });
    }

    return await this.prisma.emailBrandingSettings.create({
      data: {
        logoUrl: data.logoUrl ?? DEFAULT_BRANDING.logoUrl,
        primaryColor: data.primaryColor ?? DEFAULT_BRANDING.primaryColor,
        secondaryColor: data.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
        buttonStyle: data.buttonStyle ?? DEFAULT_BRANDING.buttonStyle,
        buttonBorderRadius: data.buttonBorderRadius ?? DEFAULT_BRANDING.buttonBorderRadius,
        fontFamily: data.fontFamily ?? DEFAULT_BRANDING.fontFamily,
        headerBackground: data.headerBackground ?? DEFAULT_BRANDING.headerBackground,
        footerText: data.footerText ?? DEFAULT_BRANDING.footerText,
      },
    });
  }

  /**
   * Reset branding to defaults
   */
  async resetBrandingSettings(): Promise<BrandingSettings> {
    await this.prisma.emailBrandingSettings.deleteMany({});

    return {
      id: null,
      ...DEFAULT_BRANDING,
    };
  }

  // ============ TEMPLATE RENDERING ============

  /**
   * Render email template with variables and branding
   */
  async renderEmail(
    type: EmailTemplateType,
    variables: Record<string, string>
  ): Promise<RenderedEmail> {
    const template = await this.getEmailTemplate(type);
    const branding = await this.getBrandingSettings();

    // Replace variables in subject and body
    const subject = this.replaceVariables(template.subject, variables);
    const bodyContent = this.replaceVariables(template.bodyHtml, variables);

    // Get header title (use template's headerTitle, or fall back to subject)
    const headerTitle = template.headerTitle
      ? this.replaceVariables(template.headerTitle, variables)
      : subject;

    // Build full email HTML
    const html = this.buildEmailHtml(bodyContent, headerTitle, branding);

    return { subject, html };
  }

  /**
   * Render email template with sample data for preview
   */
  async renderEmailPreview(
    type: EmailTemplateType,
    customSubject?: string,
    customBodyHtml?: string
  ): Promise<RenderedEmail> {
    const template = await this.getEmailTemplate(type);
    const branding = await this.getBrandingSettings();
    const sampleVars = getSampleVariables(type);

    const subject = customSubject ?? template.subject;
    const bodyContent = customBodyHtml ?? template.bodyHtml;

    // Replace variables with sample data
    const renderedSubject = this.replaceVariables(subject, sampleVars);
    const renderedBody = this.replaceVariables(bodyContent, sampleVars);

    // Get header title
    const headerTitle = template.headerTitle
      ? this.replaceVariables(template.headerTitle, sampleVars)
      : renderedSubject;

    // Build full email HTML
    const html = this.buildEmailHtml(renderedBody, headerTitle, branding);

    return { subject: renderedSubject, html };
  }

  /**
   * Render SMS template with variables
   */
  async renderSms(
    type: SmsTemplateType,
    variables: Record<string, string>
  ): Promise<string> {
    const template = await this.getSmsTemplate(type);
    return this.replaceVariables(template.body, variables);
  }

  /**
   * Render SMS template with sample data for preview
   */
  async renderSmsPreview(
    type: SmsTemplateType,
    customBody?: string
  ): Promise<string> {
    const template = await this.getSmsTemplate(type);
    const sampleVars = getSampleVariables(type);

    const body = customBody ?? template.body;
    return this.replaceVariables(body, sampleVars);
  }

  // ============ PRIVATE HELPERS ============

  /**
   * Replace template variables
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      // Support both {{key}} and key formats
      const keyWithBraces = key.startsWith('{{') ? key : `{{${key}}}`;
      const regex = new RegExp(keyWithBraces.replace(/[{}]/g, '\\$&'), 'g');
      result = result.replace(regex, value);
    }

    return result;
  }

  /**
   * Build the complete email HTML with wrapper styling
   */
  private buildEmailHtml(content: string, headerTitle: string, branding: BrandingSettings): string {
    // Process special syntax in content
    let processedContent = this.processActionButtonSyntax(content, branding);
    processedContent = this.processDangerButtonSyntax(processedContent, branding);
    processedContent = this.processButtonSyntax(processedContent, branding);
    processedContent = this.processSpecialClasses(processedContent, branding);

    // Get header background style
    const headerBg = branding.headerBackground === 'gradient'
      ? `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`
      : branding.primaryColor;

    // Build logo HTML if present
    const logoHtml = branding.logoUrl
      ? `<div style="text-align: center; margin-bottom: 20px;"><img src="${branding.logoUrl}" alt="Logo" style="max-height: 60px; max-width: 200px;"></div>`
      : '';

    // Build footer HTML if present
    const footerHtml = branding.footerText
      ? `<p style="font-size: 12px; color: #9ca3af; margin-top: 20px; text-align: center;">${branding.footerText}</p>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: ${branding.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
  ${logoHtml}
  
  <!-- Header -->
  <div style="background: ${headerBg}; padding: 30px; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${headerTitle}</h1>
  </div>
  
  <!-- Content -->
  <div style="background: #ffffff; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none; overflow-wrap: break-word; word-wrap: break-word;">
    ${processedContent}
    ${footerHtml}
  </div>
</body>
</html>`;
  }

  /**
   * Process {{button:Label|URL}} syntax into styled buttons with centered div wrapper
   */
  private processButtonSyntax(content: string, branding: BrandingSettings): string {
    const buttonRegex = /\{\{button:([^|]+)\|([^}]+)\}\}/g;

    return content.replace(buttonRegex, (_, label, url) => {
      const buttonStyle = this.getButtonStyles(branding);
      return `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="${buttonStyle} color: white; padding: 14px 28px; text-decoration: none; font-weight: 600; display: inline-block;">${label}</a>
        </div>
      `;
    });
  }

  /**
   * Process {{action_button:Label|URL}} syntax into styled buttons without div wrapper
   */
  private processActionButtonSyntax(content: string, branding: BrandingSettings): string {
    const buttonRegex = /\{\{action_button:([^|]+)\|([^}]+)\}\}/g;

    return content.replace(buttonRegex, (_, label, url) => {
      const buttonStyle = this.getButtonStyles(branding);
      return `<a href="${url}" style="${buttonStyle} color: white; padding: 12px 24px; text-decoration: none; font-weight: 600; display: inline-block; margin: 5px;">${label}</a>`;
    });
  }

  /**
   * Process {{danger_button:Label|URL}} syntax into styled red buttons without div wrapper
   */
  private processDangerButtonSyntax(content: string, branding: BrandingSettings): string {
    const buttonRegex = /\{\{danger_button:([^|]+)\|([^}]+)\}\}/g;

    return content.replace(buttonRegex, (_, label, url) => {
      const borderRadius = branding.buttonBorderRadius;
      return `<a href="${url}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: ${borderRadius}; font-weight: 600; display: inline-block; margin: 5px;">${label}</a>`;
    });
  }

  /**
   * Process special CSS classes into styled HTML
   */
  private processSpecialClasses(content: string, branding: BrandingSettings): string {
    let result = content;

    // Process <p class="note">...</p> -> gray smaller text with word-break for long URLs
    result = result.replace(
      /<p class="note">([\s\S]*?)<\/p>/g,
      '<p style="font-size: 14px; color: #6b7280; margin-top: 10px; word-wrap: break-word; overflow-wrap: break-word; word-break: break-word;">$1</p>'
    );

    // Process <p class="warning">...</p> -> red text
    result = result.replace(
      /<p class="warning">([\s\S]*?)<\/p>/g,
      '<p style="font-size: 14px; color: #ef4444; font-weight: 500; margin-top: 10px;">$1</p>'
    );

    // Process <div class="info-box">...</div> -> styled info box
    result = result.replace(
      /<div class="info-box">([\s\S]*?)<\/div>/g,
      `<div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">$1</div>`
    );

    // Process <h3> inside info-box -> styled heading
    result = result.replace(
      /<h3>([\s\S]*?)<\/h3>/g,
      `<h2 style="margin: 0 0 15px 0; color: ${branding.primaryColor}; font-size: 20px;">$1</h2>`
    );

    // Process <code>...</code> -> styled code
    result = result.replace(
      /<code>([\s\S]*?)<\/code>/g,
      '<code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">$1</code>'
    );

    // Convert plain URLs to clickable links (but not URLs already in href attributes)
    result = this.linkifyUrls(result);

    return result;
  }

  /**
   * Convert plain URLs in text to clickable anchor tags
   * Skips URLs that are already inside href attributes
   */
  private linkifyUrls(content: string): string {
    // Match URLs that are NOT already inside an href attribute
    // This regex looks for http/https URLs that are not preceded by href=" or href='
    const urlRegex = /(?<!href=["'])(?<!href=["'][^"']*)(https?:\/\/[^\s<>"']+)/g;

    return content.replace(urlRegex, (url) => {
      return `<a href="${url}" style="color: #6b7280; text-decoration: underline; word-wrap: break-word; overflow-wrap: break-word; word-break: break-all;">${url}</a>`;
    });
  }

  /**
   * Get button CSS styles based on branding
   */
  private getButtonStyles(branding: BrandingSettings): string {
    const borderRadius = branding.buttonBorderRadius;

    switch (branding.buttonStyle) {
      case 'gradient':
        return `background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%); border-radius: ${borderRadius};`;
      case 'solid':
        return `background: ${branding.primaryColor}; border-radius: ${borderRadius};`;
      case 'outline':
        return `background: transparent; border: 2px solid ${branding.primaryColor}; color: ${branding.primaryColor} !important; border-radius: ${borderRadius};`;
      default:
        return `background: linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%); border-radius: ${borderRadius};`;
    }
  }
}
