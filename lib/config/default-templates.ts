import type { EmailTemplateType, SmsTemplateType } from '@prisma/client';

/**
 * Template variable definitions by category
 */
export const TEMPLATE_VARIABLES = {
  common: ['{{firstName}}', '{{email}}'],
  staff: ['{{staffTermLabel}}', '{{inviteUrl}}'],
  client: ['{{inviteUrl}}'],
  credentials: ['{{tempPassword}}', '{{loginUrl}}'],
  user: ['{{role}}', '{{inviteUrl}}'],
  callTime: [
    '{{positionName}}',
    '{{eventTitle}}',
    '{{eventVenue}}',
    '{{eventLocation}}',
    '{{startDate}}',
    '{{endDate}}',
    '{{startTime}}',
    '{{endTime}}',
    '{{payRate}}',
    '{{payRateType}}',
    '{{dashboardUrl}}',
  ],
} as const;

/**
 * Template variable descriptions for UI display
 */
export const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  '{{firstName}}': 'Recipient\'s first name',
  '{{email}}': 'Recipient\'s email address',
  '{{staffTermLabel}}': 'Organization\'s term for staff (e.g., Staff, Talent)',
  '{{inviteUrl}}': 'URL to accept the invitation',
  '{{loginUrl}}': 'URL to the login page',
  '{{tempPassword}}': 'Temporary password for account',
  '{{role}}': 'User role (e.g., Admin, Manager)',
  '{{positionName}}': 'Position/role name for the call time',
  '{{eventTitle}}': 'Title of the event',
  '{{eventVenue}}': 'Venue name of the event',
  '{{eventLocation}}': 'Location (city, state) of the event',
  '{{startDate}}': 'Start date of the call time',
  '{{endDate}}': 'End date of the call time',
  '{{startTime}}': 'Start time of the call time',
  '{{endTime}}': 'End time of the call time',
  '{{payRate}}': 'Pay rate amount',
  '{{payRateType}}': 'Pay rate type (per hour, per shift, etc.)',
  '{{dashboardUrl}}': 'URL to the user\'s dashboard/schedule',
};

export interface DefaultEmailTemplate {
  type: EmailTemplateType;
  subject: string;
  headerTitle?: string; // Optional header title, falls back to subject
  bodyHtml: string; // Content only, no wrapper styling
  description: string;
  availableVariables: string[];
}

export interface DefaultSmsTemplate {
  type: SmsTemplateType;
  body: string;
  description: string;
  availableVariables: string[];
  maxLength: number;
}

/**
 * Default email templates
 * These contain CONTENT ONLY - the email wrapper/styling is applied during rendering
 * 
 * Special syntax:
 * - {{button:Label|URL}} - Creates a styled CTA button
 * - <p class="note">...</p> - Smaller gray text for notes
 * - <p class="warning">...</p> - Warning/important text in red
 */
export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    type: 'STAFF_INVITATION',
    subject: "You've been invited to join as {{staffTermLabel}}",
    headerTitle: 'Welcome, {{firstName}}!',
    description: 'Sent when a new staff member is invited to create their account',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.staff],
    bodyHtml: `<p>You've been invited to join the team as <strong>{{staffTermLabel}}</strong>. Click the button below to create your account and complete your profile.</p>

{{button:Accept Invitation|{{inviteUrl}}}}

<p class="note">This invitation link will expire in 7 days.</p>
<p class="note">If you didn't expect this invitation, you can safely ignore this email.</p>
<p class="note">If the button doesn't work, copy and paste this link into your browser: {{inviteUrl}}</p>`,
  },
  {
    type: 'CLIENT_INVITATION',
    subject: "You've been invited to the Client Portal",
    headerTitle: 'Welcome, {{firstName}}!',
    description: 'Sent when a client is invited to access the client portal',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.client],
    bodyHtml: `<p>You've been invited to access the Client Portal. Click the button below to create your account and view your events.</p>

{{button:Accept Invitation|{{inviteUrl}}}}

<p class="note">This invitation link will expire in 7 days.</p>
<p class="note">If you didn't expect this invitation, you can safely ignore this email.</p>
<p class="note">If the button doesn't work, copy and paste this link into your browser: {{inviteUrl}}</p>`,
  },
  {
    type: 'STAFF_CREDENTIALS',
    subject: 'Your {{staffTermLabel}} account has been activated',
    headerTitle: 'Account Activated!',
    description: 'Sent when an existing staff member is granted login access with credentials',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.staff.filter(v => v !== '{{inviteUrl}}'), ...TEMPLATE_VARIABLES.credentials],
    bodyHtml: `<p>Hi {{firstName}}, your <strong>{{staffTermLabel}}</strong> account has been activated. You can now log in using the following credentials:</p>

<div class="info-box">
  <p><strong>Email:</strong> {{email}}</p>
  <p><strong>Temporary Password:</strong> <code>{{tempPassword}}</code></p>
</div>

<p class="warning">Please change your password after your first login.</p>

{{button:Log In Now|{{loginUrl}}}}`,
  },
  {
    type: 'CALL_TIME_INVITATION',
    subject: "You're invited: {{positionName}} at {{eventTitle}}",
    headerTitle: "You're Invited, {{firstName}}!",
    description: 'Sent when staff is invited to a call time/shift',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.callTime],
    bodyHtml: `<p>You've been invited to work as <strong>{{positionName}}</strong> at the following event:</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Date:</strong> {{startDate}} - {{endDate}}</p>
  <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
  <p><strong>Pay Rate:</strong> {{payRate}} {{payRateType}}</p>
</div>

{{button:View & Respond|{{dashboardUrl}}}}

<p class="note">Please respond as soon as possible. Positions are filled on a first-come, first-served basis.</p>
<p class="note">If the button doesn't work, copy and paste this link into your browser: {{dashboardUrl}}</p>`,
  },
  {
    type: 'CALL_TIME_CONFIRMATION',
    subject: 'Confirmed: {{positionName}} at {{eventTitle}}',
    headerTitle: "You're Confirmed, {{firstName}}!",
    description: 'Sent when staff is confirmed for a call time/shift',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{positionName}}',
      '{{eventTitle}}',
      '{{eventVenue}}',
      '{{eventLocation}}',
      '{{startDate}}',
      '{{startTime}}',
      '{{dashboardUrl}}',
    ],
    bodyHtml: `<p>Great news! You've been confirmed for <strong>{{positionName}}</strong> at the following event:</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Date:</strong> {{startDate}}</p>
  <p><strong>Time:</strong> {{startTime}}</p>
</div>

{{button:View My Schedule|{{dashboardUrl}}}}

<p class="note">Please make sure to arrive on time. If you need to cancel, please do so as soon as possible.</p>`,
  },
  {
    type: 'CALL_TIME_WAITLISTED',
    subject: 'Waitlisted: {{positionName}} at {{eventTitle}}',
    headerTitle: "You're on the Waitlist, {{firstName}}",
    description: 'Sent when staff is added to the waitlist for a call time/shift',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{positionName}}',
      '{{eventTitle}}',
      '{{dashboardUrl}}',
    ],
    bodyHtml: `<p>Thank you for accepting the invitation for <strong>{{positionName}}</strong> at <strong>{{eventTitle}}</strong>.</p>

<p>Unfortunately, all positions have been filled. You've been added to the waitlist and will be notified if a spot becomes available.</p>

{{button:View My Schedule|{{dashboardUrl}}}}`,
  },
  {
    type: 'USER_INVITATION',
    subject: "You've been invited to join as {{role}}",
    headerTitle: 'Welcome, {{firstName}}!',
    description: 'Sent when a new admin portal user (manager/admin) is invited to create their account',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.user],
    bodyHtml: `<p>You've been invited to join as a <strong>{{role}}</strong>. Click the button below to create your password and activate your account.</p>

{{button:Accept Invitation|{{inviteUrl}}}}

<p class="note">This invitation link will expire in 7 days.</p>
<p class="note">If you didn't expect this invitation, you can safely ignore this email.</p>
<p class="note">If the button doesn't work, copy and paste this link into your browser: {{inviteUrl}}</p>`,
  },
];

/**
 * Default SMS templates
 * These are plain text templates for SMS notifications
 */
export const DEFAULT_SMS_TEMPLATES: DefaultSmsTemplate[] = [
  {
    type: 'STAFF_INVITATION',
    body: "Hi {{firstName}}, you've been invited to join as {{staffTermLabel}}. Check your email for the full invitation or visit: {{inviteUrl}}",
    description: 'SMS notification for staff invitation',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.staff],
    maxLength: 160,
  },
  {
    type: 'CLIENT_INVITATION',
    body: "Hi {{firstName}}, you've been invited to the Client Portal. Check your email for details or visit: {{inviteUrl}}",
    description: 'SMS notification for client portal invitation',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.client],
    maxLength: 160,
  },
  {
    type: 'STAFF_CREDENTIALS',
    body: "Hi {{firstName}}, your {{staffTermLabel}} account is now active. Log in at {{loginUrl}} with your email. Check your email for your temporary password.",
    description: 'SMS notification for staff credentials',
    availableVariables: [...TEMPLATE_VARIABLES.common, '{{staffTermLabel}}', '{{loginUrl}}'],
    maxLength: 160,
  },
  {
    type: 'CALL_TIME_INVITATION',
    body: "Hi {{firstName}}, you're invited to work as {{positionName}} at {{eventTitle}} on {{startDate}}. View details: {{dashboardUrl}}",
    description: 'SMS notification for call time invitation',
    availableVariables: ['{{firstName}}', '{{positionName}}', '{{eventTitle}}', '{{startDate}}', '{{dashboardUrl}}'],
    maxLength: 160,
  },
  {
    type: 'CALL_TIME_CONFIRMATION',
    body: "Confirmed! {{firstName}}, you're booked for {{positionName}} at {{eventTitle}} on {{startDate}}. View schedule: {{dashboardUrl}}",
    description: 'SMS notification for call time confirmation',
    availableVariables: ['{{firstName}}', '{{positionName}}', '{{eventTitle}}', '{{startDate}}', '{{dashboardUrl}}'],
    maxLength: 160,
  },
  {
    type: 'CALL_TIME_WAITLISTED',
    body: "Hi {{firstName}}, you're on the waitlist for {{positionName}} at {{eventTitle}}. We'll notify you if a spot opens. View: {{dashboardUrl}}",
    description: 'SMS notification for waitlist status',
    availableVariables: ['{{firstName}}', '{{positionName}}', '{{eventTitle}}', '{{dashboardUrl}}'],
    maxLength: 160,
  },
  {
    type: 'USER_INVITATION',
    body: "Hi {{firstName}}, you've been invited to join as {{role}}. Check your email for the full invitation or visit: {{inviteUrl}}",
    description: 'SMS notification for admin portal user invitation',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.user],
    maxLength: 160,
  },
];

/**
 * Template type labels for UI display
 */
export const TEMPLATE_TYPE_LABELS: Record<EmailTemplateType | SmsTemplateType, string> = {
  STAFF_INVITATION: 'Staff Invitation',
  CLIENT_INVITATION: 'Client Invitation',
  STAFF_CREDENTIALS: 'Staff Credentials',
  CALL_TIME_INVITATION: 'Call Time Invitation',
  CALL_TIME_CONFIRMATION: 'Call Time Confirmation',
  CALL_TIME_WAITLISTED: 'Call Time Waitlisted',
  USER_INVITATION: 'User Invitation',
};

/**
 * Get default email template by type
 */
export function getDefaultEmailTemplate(type: EmailTemplateType): DefaultEmailTemplate | undefined {
  return DEFAULT_EMAIL_TEMPLATES.find(t => t.type === type);
}

/**
 * Get default SMS template by type
 */
export function getDefaultSmsTemplate(type: SmsTemplateType): DefaultSmsTemplate | undefined {
  return DEFAULT_SMS_TEMPLATES.find(t => t.type === type);
}

/**
 * Get all template types
 */
export function getAllTemplateTypes(): (EmailTemplateType | SmsTemplateType)[] {
  return [
    'STAFF_INVITATION',
    'CLIENT_INVITATION',
    'STAFF_CREDENTIALS',
    'CALL_TIME_INVITATION',
    'CALL_TIME_CONFIRMATION',
    'CALL_TIME_WAITLISTED',
    'USER_INVITATION',
  ];
}

/**
 * Default branding settings
 */
export const DEFAULT_BRANDING = {
  logoUrl: null,
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  buttonStyle: 'gradient',
  buttonBorderRadius: '8px',
  fontFamily: 'system-ui',
  headerBackground: 'gradient',
  footerText: null,
} as const;

/**
 * Sample variables for template preview
 */
export function getSampleVariables(type: EmailTemplateType | SmsTemplateType): Record<string, string> {
  const common = {
    firstName: 'John',
    email: 'john.doe@example.com',
    staffTermLabel: 'Staff',
  };

  const callTimeCommon = {
    ...common,
    positionName: 'Event Coordinator',
    eventTitle: 'Annual Gala 2024',
    eventVenue: 'Grand Ballroom',
    eventLocation: 'Los Angeles, CA',
    startDate: 'Saturday, March 15, 2024',
    endDate: 'Saturday, March 15, 2024',
    startTime: '6:00 PM',
    endTime: '11:00 PM',
    payRate: '$25.00',
    payRateType: 'per hour',
    dashboardUrl: 'https://example.com/my-schedule',
  };

  switch (type) {
    case 'STAFF_INVITATION':
      return {
        ...common,
        inviteUrl: 'https://example.com/accept-invitation/staff?token=abc123',
      };
    case 'CLIENT_INVITATION':
      return {
        ...common,
        inviteUrl: 'https://example.com/accept-invitation/client?token=abc123',
      };
    case 'STAFF_CREDENTIALS':
      return {
        ...common,
        tempPassword: 'TempPass123!',
        loginUrl: 'https://example.com/login',
      };
    case 'CALL_TIME_INVITATION':
      return callTimeCommon;
    case 'CALL_TIME_CONFIRMATION':
      return callTimeCommon;
    case 'CALL_TIME_WAITLISTED':
      return callTimeCommon;
    case 'USER_INVITATION':
      return {
        ...common,
        role: 'Manager',
        inviteUrl: 'https://example.com/accept-invitation/user?token=abc123',
      };
    default:
      return common;
  }
}
