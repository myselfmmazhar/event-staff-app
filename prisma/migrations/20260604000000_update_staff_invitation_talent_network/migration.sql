-- Update STAFF_INVITATION email and SMS templates to the new Talent Network
-- copy. Overwrites any tenant-customized rows so the new wording is the
-- source of truth going forward. Resets isCustomized so the Settings UI
-- shows these as defaults again.

UPDATE "email_templates"
SET
  "subject" = 'You''ve Been Invited to Join {{companyName}}''s Talent Network',
  "bodyHtml" = '<p>You have been invited to join <strong>{{companyName}}</strong>''s Talent Network through the Tripod platform.</p>

<p>As part of the Talent Network, you may receive opportunities for upcoming assignments, tasks, or service work based on your skills, availability, and preferences.</p>

<p>Complete your profile and onboarding to begin receiving assignment opportunities.</p>

{{button:Join Talent Network|{{inviteUrl}}}}

<p class="note">This invitation link will expire in 7 days.</p>
<p class="note">If you didn''t expect this invitation, you can safely ignore this email.</p>
<p class="note">If the button doesn''t work, copy and paste this link into your browser: {{inviteUrl}}</p>',
  "isCustomized" = false,
  "updatedAt" = NOW()
WHERE "type" = 'STAFF_INVITATION';

UPDATE "sms_templates"
SET
  "body" = 'Hi {{firstName}}, you''ve been invited to join {{companyName}}''s Talent Network. Check your email or visit: {{inviteUrl}}',
  "isCustomized" = false,
  "updatedAt" = NOW()
WHERE "type" = 'STAFF_INVITATION';
