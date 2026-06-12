import type { EmailTemplateType, SmsTemplateType } from '@prisma/client';

/**
 * Template variable definitions by category
 */
export const TEMPLATE_VARIABLES = {
  common: ['{{firstName}}', '{{email}}', '{{companyName}}'],
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
    '{{description}}',
    '{{requirements}}',
    '{{preEventInstructions}}',
    '{{privateNotes}}',
    '{{internalNotes}}',
    '{{assignmentInstructions}}',
    '{{acceptUrl}}',
    '{{rejectUrl}}',
    '{{detailsUrl}}',
  ],
  change: ['{{changesList}}', '{{changesSummary}}'],
  reminder: ['{{meetingPoint}}', '{{pocName}}', '{{pocPhone}}'],
} as const;

/**
 * Template variable descriptions for UI display
 */
export const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  '{{firstName}}': 'Recipient\'s first name',
  '{{email}}': 'Recipient\'s email address',
  '{{companyName}}': 'Company name from company profile',
  '{{staffTermLabel}}': 'Organization\'s term for staff (e.g., Staff, Talent)',
  '{{inviteUrl}}': 'URL to accept the invitation',
  '{{loginUrl}}': 'URL to the login page',
  '{{tempPassword}}': 'Temporary password for account',
  '{{role}}': 'User role (e.g., Admin, Manager)',
  '{{positionName}}': 'Position/role name for the call time',
  '{{eventTitle}}': 'Title of the event',
  '{{eventVenue}}': 'Venue name of the event',
  '{{eventLocation}}': 'Location (street, city, state) of the event',
  '{{startDate}}': 'Start date of the call time',
  '{{endDate}}': 'End date of the call time',
  '{{startTime}}': 'Start time of the call time',
  '{{endTime}}': 'End time of the call time',
  '{{payRate}}': 'Pay rate amount',
  '{{payRateType}}': 'Pay rate type (per hour, per shift, etc.)',
  '{{dashboardUrl}}': 'URL to the user\'s dashboard/schedule',
  '{{description}}': 'Event description',
  '{{requirements}}': 'Event requirements',
  '{{preEventInstructions}}': 'Pre-event task instructions',
  '{{privateNotes}}': 'Private notes/comments for the event',
  '{{internalNotes}}': 'Internal notes (admin-only) for the event',
  '{{assignmentInstructions}}': 'Specific instructions for this assignment',
  '{{acceptUrl}}': 'Direct URL to accept the offer from email',
  '{{rejectUrl}}': 'Direct URL to reject the offer from email',
  '{{detailsUrl}}': 'URL to view the full invitation details in the talent portal',
  '{{confirmationStatus}}': 'Confirmation status label (e.g., "Confirmed" or "Waitlisted")',
  '{{statusMessage}}': 'Long-form status message shown after accepting',
  '{{isWaitlisted}}': 'Set to "true" when the acceptance landed on the waitlist (otherwise empty)',
  '{{requirementTitle}}': 'Title of the document requirement (e.g., "Driver\'s License")',
  '{{expiresAt}}': 'Formatted expiry date of the document',
  '{{daysRemaining}}': 'Number of days until the document expires',
  '{{profileUrl}}': 'URL to the talent\'s profile page where they can upload an updated document',
  '{{changesList}}': 'HTML list of fields that changed (e.g. <ul><li>start time</li><li>pay rate</li></ul>)',
  '{{changesSummary}}': 'Comma-separated summary of changed fields (e.g. "start time, pay rate")',
  '{{meetingPoint}}': 'Designated meeting point at the venue (from the event)',
  '{{pocName}}': 'On-site Point of Contact name (from the event)',
  '{{pocPhone}}': 'On-site Point of Contact phone number (from the event)',
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
    subject: "You've Been Invited to Join {{companyName}}'s Talent Network",
    headerTitle: "You've Been Invited, {{firstName}}!",
    description: 'Sent when a new staff member is invited to create their account',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      ...TEMPLATE_VARIABLES.staff,
      '{{description}}',
      '{{requirements}}',
      '{{preEventInstructions}}',
      '{{privateNotes}}',
      '{{internalNotes}}',
    ],
    bodyHtml: `<p>You have been invited to join <strong>{{companyName}}</strong>'s Talent Network through the Tripod platform.</p>

<p>As part of the Talent Network, you may receive opportunities for upcoming assignments, tasks, or service work based on your skills, availability, and preferences.</p>

<p>Complete your profile and onboarding to begin receiving assignment opportunities.</p>

{{button:Join Talent Network|{{inviteUrl}}}}

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
  <p><strong>Instructions:</strong> {{assignmentInstructions}}</p>
  <p><strong>Event Description:</strong> {{description}}</p>
  <p><strong>Requirements:</strong> {{requirements}}</p>
  <p><strong>Pre-Event Instructions:</strong> {{preEventInstructions}}</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  {{action_button:Accept Offer|{{acceptUrl}}}}
  {{danger_button:Decline Offer|{{rejectUrl}}}}
  <a href="{{detailsUrl}}" style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin: 5px;">View More Details</a>
</div>

<p class="note">You can also view more details and respond in your <a href="{{dashboardUrl}}">Talent Portal</a>.</p>
<p class="note">Please respond as soon as possible. Positions are filled on a first-come, first-served basis.</p>
<p class="note">If the buttons don't work, copy and paste this link into your browser: {{dashboardUrl}}</p>`,
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
      '{{description}}',
      '{{requirements}}',
      '{{preEventInstructions}}',
      '{{privateNotes}}',
      '{{assignmentInstructions}}',
    ],
    bodyHtml: `<p>Great news! You've been confirmed for <strong>{{positionName}}</strong> at the following event:</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Date:</strong> {{startDate}}</p>
  <p><strong>Time:</strong> {{startTime}}</p>
  <p><strong>Instructions:</strong> {{assignmentInstructions}}</p>
  <p><strong>Event Description:</strong> {{description}}</p>
  <p><strong>Requirements:</strong> {{requirements}}</p>
  <p><strong>Pre-Event Instructions:</strong> {{preEventInstructions}}</p>
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
      '{{description}}',
      '{{requirements}}',
      '{{preEventInstructions}}',
      '{{privateNotes}}',
      '{{assignmentInstructions}}',
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
  {
    type: 'CALL_INVITATION_BATCH',
    subject: "Call Invitation Batch: {{eventTitle}}",
    headerTitle: "Call Invitation Batch, {{firstName}}!",
    description: 'Sent when staff is invited to multiple positions or a batch of call times',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.callTime],
    bodyHtml: `<p>We have several positions available for <strong>{{eventTitle}}</strong> that might interest you. Click the button below to view all available shifts and respond.</p>

{{button:View Available Shifts|{{dashboardUrl}}}}

<p class="note">Location: {{eventVenue}}, {{eventLocation}}</p>
<p class="note">Dates: {{startDate}} - {{endDate}}</p>

<p class="note">Please respond as soon as possible. Positions are filled on a first-come, first-served basis.</p>`,
  },
  {
    type: 'CALL_TIME_INVITATION_ACCEPTED',
    subject: 'Invitation Accepted: {{positionName}} at {{eventTitle}}',
    headerTitle: 'Invitation Accepted',
    description: 'Shown on the confirmation page after a staff member accepts an invitation from the email link',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{positionName}}',
      '{{eventTitle}}',
      '{{eventVenue}}',
      '{{eventLocation}}',
      '{{startDate}}',
      '{{endDate}}',
      '{{startTime}}',
      '{{endTime}}',
      '{{loginUrl}}',
      '{{dashboardUrl}}',
      '{{confirmationStatus}}',
      '{{statusMessage}}',
      '{{isWaitlisted}}',
    ],
    bodyHtml: `<p>{{statusMessage}}</p>

<div class="info-box">
  <p><strong>Position:</strong> {{positionName}}</p>
  <p><strong>Event:</strong> {{eventTitle}}</p>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Date:</strong> {{startDate}}</p>
  <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
  <p><strong>Status:</strong> {{confirmationStatus}}</p>
</div>

{{button:Log In to View My Schedule|{{loginUrl}}}}`,
  },
  {
    type: 'TALENT_DOCUMENT_EXPIRING',
    subject: 'Your {{requirementTitle}} expires in {{daysRemaining}} days',
    headerTitle: 'Document Expiring Soon',
    description: 'Sent to a talent when one of their approved documents is approaching its expiry date (30/15/7/5/2 day buckets)',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{requirementTitle}}',
      '{{expiresAt}}',
      '{{daysRemaining}}',
      '{{profileUrl}}',
    ],
    bodyHtml: `<p>Hi {{firstName}},</p>

<p>Your <strong>{{requirementTitle}}</strong> on file is approaching its expiry date.</p>

<div class="info-box">
  <p><strong>Document:</strong> {{requirementTitle}}</p>
  <p><strong>Expires on:</strong> {{expiresAt}}</p>
  <p><strong>Days remaining:</strong> {{daysRemaining}}</p>
</div>

<p>Please upload an updated copy before it expires so your records stay current.</p>

{{button:Upload Updated Document|{{profileUrl}}}}

<p class="note">If the button doesn't work, copy and paste this link into your browser: {{profileUrl}}</p>`,
  },
  {
    type: 'EVENT_UPDATE',
    subject: 'Event Updated: {{eventTitle}}',
    headerTitle: 'Event Details Updated',
    description: 'Sent to assigned staff when the event they are working has been modified (title, date/time, location, requirements)',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{eventTitle}}',
      '{{eventVenue}}',
      '{{eventLocation}}',
      '{{startDate}}',
      '{{endDate}}',
      '{{startTime}}',
      '{{endTime}}',
      '{{dashboardUrl}}',
      '{{detailsUrl}}',
      ...TEMPLATE_VARIABLES.change,
    ],
    bodyHtml: `<p>Hi {{firstName}},</p>

<p>The event you are scheduled to work has been updated. Please review the changes below.</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Date:</strong> {{startDate}} - {{endDate}}</p>
  <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
</div>

<p><strong>What changed:</strong></p>
{{changesList}}

{{button:View Updated Details|{{detailsUrl}}}}

<p class="note">If anything no longer works for you, please contact us as soon as possible.</p>
<p class="note">If the button doesn't work, copy and paste this link into your browser: {{dashboardUrl}}</p>`,
  },
  {
    type: 'EVENT_CANCELLED',
    subject: 'Event Cancelled: {{eventTitle}}',
    headerTitle: 'Event Cancelled',
    description: 'Sent to assigned staff when an event they were scheduled to work is cancelled',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{eventTitle}}',
      '{{eventVenue}}',
      '{{eventLocation}}',
      '{{startDate}}',
      '{{endDate}}',
      '{{dashboardUrl}}',
    ],
    bodyHtml: `<p>Hi {{firstName}},</p>

<p class="warning">The following event has been cancelled. You no longer need to attend.</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Date:</strong> {{startDate}} - {{endDate}}</p>
</div>

{{button:View My Schedule|{{dashboardUrl}}}}

<p class="note">If you have any questions about this cancellation, please contact us.</p>`,
  },
  {
    type: 'CALL_TIME_UPDATE',
    subject: 'Shift Updated: {{positionName}} at {{eventTitle}}',
    headerTitle: 'Your Shift Has Changed',
    description: 'Sent to staff with pending or accepted invitations when their assignment (call time) is modified — times, pay rate, instructions, etc.',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      ...TEMPLATE_VARIABLES.callTime,
      ...TEMPLATE_VARIABLES.change,
    ],
    bodyHtml: `<p>Hi {{firstName}},</p>

<p>Your <strong>{{positionName}}</strong> assignment for <strong>{{eventTitle}}</strong> has been updated. Please review the latest details below.</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Position:</strong> {{positionName}}</p>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Date:</strong> {{startDate}} - {{endDate}}</p>
  <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
  <p><strong>Pay Rate:</strong> {{payRate}} {{payRateType}}</p>
  <p><strong>Instructions:</strong> {{assignmentInstructions}}</p>
</div>

<p><strong>What changed:</strong></p>
{{changesList}}

{{button:View Updated Shift|{{detailsUrl}}}}

<p class="note">If these changes no longer work for you, please contact us as soon as possible.</p>
<p class="note">If the button doesn't work, copy and paste this link into your browser: {{dashboardUrl}}</p>`,
  },
  {
    type: 'CALL_TIME_CANCELLED',
    subject: 'Shift Cancelled: {{positionName}} at {{eventTitle}}',
    headerTitle: 'Your Shift Has Been Cancelled',
    description: 'Sent to staff when their specific call time / assignment is cancelled (even if the event itself is not)',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{positionName}}',
      '{{eventTitle}}',
      '{{eventVenue}}',
      '{{eventLocation}}',
      '{{startDate}}',
      '{{endDate}}',
      '{{startTime}}',
      '{{endTime}}',
      '{{dashboardUrl}}',
    ],
    bodyHtml: `<p>Hi {{firstName}},</p>

<p class="warning">Your <strong>{{positionName}}</strong> assignment for the following event has been cancelled.</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Position:</strong> {{positionName}}</p>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Date:</strong> {{startDate}} - {{endDate}}</p>
  <p><strong>Time:</strong> {{startTime}} - {{endTime}}</p>
</div>

{{button:View My Schedule|{{dashboardUrl}}}}

<p class="note">If you have any questions about this cancellation, please contact us.</p>`,
  },
  {
    type: 'SHIFT_REMINDER_48H',
    subject: 'Reminder: {{positionName}} at {{eventTitle}} on {{startDate}}',
    headerTitle: 'Upcoming Shift Reminder',
    description: 'Sent to scheduled contractors 2 days before their call time',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{positionName}}',
      '{{eventTitle}}',
      '{{eventVenue}}',
      '{{eventLocation}}',
      '{{startDate}}',
      '{{startTime}}',
      '{{dashboardUrl}}',
      ...TEMPLATE_VARIABLES.reminder,
    ],
    bodyHtml: `<p>Hi {{firstName}},</p>

<p>This is a friendly reminder to arrive and check in with the POC at the venue meeting point at least 10 minutes before your scheduled call time (<strong>{{startDate}} at {{startTime}}</strong>). Punctuality is crucial to ensure a smooth start and proper coordination for the day&rsquo;s activities.</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Position:</strong> {{positionName}}</p>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Call Time:</strong> {{startDate}} at {{startTime}}</p>
  <p><strong>Meeting Point:</strong> {{meetingPoint}}</p>
</div>

<p>Please also remember to clock in only once you are physically present at the designated meeting point. Early clock in or clocking in outside of the meeting point is not accepted.</p>

<p>Your cooperation and professionalism are greatly appreciated.</p>

<p>Thank you!</p>

{{button:View My Schedule|{{dashboardUrl}}}}`,
  },
  {
    type: 'SHIFT_REMINDER_2H',
    subject: 'Final Check: {{positionName}} at {{eventTitle}} today at {{startTime}}',
    headerTitle: 'Final Check-In Before Call Time',
    description: 'Final check sent to scheduled contractors 2 hours before their call time',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      '{{positionName}}',
      '{{eventTitle}}',
      '{{eventVenue}}',
      '{{eventLocation}}',
      '{{startDate}}',
      '{{startTime}}',
      '{{dashboardUrl}}',
      ...TEMPLATE_VARIABLES.reminder,
    ],
    bodyHtml: `<p>Hi Team. Final check in before the Event call time (<strong>{{startDate}} at {{startTime}}</strong>). Please report to the Point of Contact (POC) at the designated sign-in/meeting location no later than ten (10) minutes before the shift starts for sign-in and assignments. Note that clock in time is only approved once you are physically present at the designated meeting point. If you are late, your pay will be switched to hourly and reflect the actual time worked.</p>

<p>No response needed if there are no issues.</p>

<div class="info-box">
  <h3>{{eventTitle}}</h3>
  <p><strong>Position:</strong> {{positionName}}</p>
  <p><strong>Location:</strong> {{eventVenue}}, {{eventLocation}}</p>
  <p><strong>Call Time:</strong> {{startDate}} at {{startTime}}</p>
  <p><strong>Meeting Point:</strong> {{meetingPoint}}</p>
  <p><strong>POC:</strong> {{pocName}} &mdash; {{pocPhone}}</p>
</div>

<p class="warning">For urgent matters, please reply or call 502-558-0339 for assistance.</p>

{{button:View My Schedule|{{dashboardUrl}}}}`,
  },
];

/**
 * Default SMS templates
 * These are plain text templates for SMS notifications
 */
export const DEFAULT_SMS_TEMPLATES: DefaultSmsTemplate[] = [
  {
    type: 'STAFF_INVITATION',
    body: "Hi {{firstName}}, you've been invited to join {{companyName}}'s Talent Network. Check your email or visit: {{inviteUrl}}",
    description: 'SMS notification for staff invitation',
    availableVariables: [
      ...TEMPLATE_VARIABLES.common,
      ...TEMPLATE_VARIABLES.staff,
      '{{description}}',
      '{{requirements}}',
      '{{preEventInstructions}}',
      '{{privateNotes}}',
      '{{internalNotes}}',
      '{{assignmentInstructions}}',
    ],
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
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.callTime],
    maxLength: 160,
  },
  {
    type: 'CALL_TIME_CONFIRMATION',
    body: "Confirmed! {{firstName}}, you're booked for {{positionName}} at {{eventTitle}} on {{startDate}}. View schedule: {{dashboardUrl}}",
    description: 'SMS notification for call time confirmation',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.callTime],
    maxLength: 160,
  },
  {
    type: 'CALL_TIME_WAITLISTED',
    body: "Hi {{firstName}}, you're on the waitlist for {{positionName}} at {{eventTitle}}. We'll notify you if a spot opens. View: {{dashboardUrl}}",
    description: 'SMS notification for waitlist status',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.callTime],
    maxLength: 160,
  },
  {
    type: 'USER_INVITATION',
    body: "Hi {{firstName}}, you've been invited to join as {{role}}. Check your email for the full invitation or visit: {{inviteUrl}}",
    description: 'SMS notification for admin portal user invitation',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.user],
    maxLength: 160,
  },
  {
    type: 'CALL_INVITATION_BATCH',
    body: "Call Invitation Batch: Hi {{firstName}}, we have several positions available for {{eventTitle}}. View and respond here: {{dashboardUrl}}",
    description: 'SMS notification for batch call time invitation',
    availableVariables: [...TEMPLATE_VARIABLES.common, ...TEMPLATE_VARIABLES.callTime],
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
  CALL_INVITATION_BATCH: 'Call Invitation Batch',
  CALL_TIME_INVITATION_ACCEPTED: 'Invitation Accepted Page',
  TALENT_DOCUMENT_EXPIRING: 'Talent Document Expiring',
  EVENT_UPDATE: 'Event Updated',
  EVENT_CANCELLED: 'Event Cancelled',
  CALL_TIME_UPDATE: 'Shift Updated',
  CALL_TIME_CANCELLED: 'Shift Cancelled',
  SHIFT_REMINDER_48H: 'Shift Reminder (2 Days Before)',
  SHIFT_REMINDER_2H: 'Shift Final Check (2 Hours Before)',
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
    'CALL_INVITATION_BATCH',
    'CALL_TIME_INVITATION_ACCEPTED',
    'TALENT_DOCUMENT_EXPIRING',
    'EVENT_UPDATE',
    'EVENT_CANCELLED',
    'CALL_TIME_UPDATE',
    'CALL_TIME_CANCELLED',
    'SHIFT_REMINDER_48H',
    'SHIFT_REMINDER_2H',
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
    companyName: 'Acme Events Co.',
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
    description: 'This is a sample event description.',
    requirements: 'Sample requirements: Must be on time.',
    preEventInstructions: 'Please check in at the front desk.',
    privateNotes: 'Sample private notes.',
    internalNotes: 'Sample internal notes (admin-only).',
    assignmentInstructions: 'Sample assignment instructions: Wear black uniform.',
    acceptUrl: 'https://example.com/api/public/invitation/respond?token=sample&action=accept',
    rejectUrl: 'https://example.com/api/public/invitation/respond?token=sample&action=reject',
  };

  switch (type) {
    case 'STAFF_INVITATION':
      return {
        ...common,
        inviteUrl: 'https://example.com/accept-invitation/staff?token=abc123',
        description: '',
        requirements: '',
        preEventInstructions: '',
        privateNotes: '',
        internalNotes: '',
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
    case 'CALL_INVITATION_BATCH':
      return callTimeCommon;
    case 'CALL_TIME_INVITATION_ACCEPTED':
      return {
        ...callTimeCommon,
        loginUrl: 'https://example.com/login',
        confirmationStatus: 'Confirmed',
        statusMessage: 'Great! You have been confirmed for this position.',
        isWaitlisted: '',
      };
    case 'TALENT_DOCUMENT_EXPIRING':
      return {
        ...common,
        requirementTitle: "Driver's License",
        expiresAt: 'June 14, 2026',
        daysRemaining: '30',
        profileUrl: 'https://example.com/profile',
      };
    case 'EVENT_UPDATE':
      return {
        ...callTimeCommon,
        detailsUrl: 'https://example.com/my-schedule',
        changesList: '<ul><li>start time</li><li>location</li></ul>',
        changesSummary: 'start time, location',
      };
    case 'EVENT_CANCELLED':
      return callTimeCommon;
    case 'CALL_TIME_UPDATE':
      return {
        ...callTimeCommon,
        detailsUrl: 'https://example.com/my-schedule',
        changesList: '<ul><li>start time</li><li>pay rate</li></ul>',
        changesSummary: 'start time, pay rate',
      };
    case 'CALL_TIME_CANCELLED':
      return callTimeCommon;
    case 'SHIFT_REMINDER_48H':
    case 'SHIFT_REMINDER_2H':
      return {
        ...callTimeCommon,
        meetingPoint: 'Main lobby, front desk',
        pocName: 'Jane Smith',
        pocPhone: '(502) 555-0123',
      };
    default:
      return common;
  }
}
