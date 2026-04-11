'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmailTemplateList } from '@/components/settings/templates/email-template-list';
import { SmsTemplateList } from '@/components/settings/templates/sms-template-list';
import { BrandingSettingsPanel } from '@/components/settings/templates/branding-settings-panel';
import { Search } from 'lucide-react';

export default function TemplateSettingsPage() {
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [smsSearchQuery, setSmsSearchQuery] = useState('');
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Email & SMS Templates</h1>
        <p className="mt-2 text-muted-foreground">
          Customize the emails and SMS messages sent by the system. Use variables to personalize content.
        </p>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="email" className="space-y-6">
        <TabsList>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            SMS Templates
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="13.5" cy="6.5" r=".5" />
              <circle cx="17.5" cy="10.5" r=".5" />
              <circle cx="8.5" cy="7.5" r=".5" />
              <circle cx="6.5" cy="12.5" r=".5" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
            </svg>
            Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Email Templates</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Customize the content and design of emails sent to staff and clients.
              </p>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={emailSearchQuery}
                onChange={(e) => setEmailSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <EmailTemplateList searchQuery={emailSearchQuery} />
          </Card>
        </TabsContent>

        <TabsContent value="sms">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">SMS Templates</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Customize SMS messages. Keep messages concise to stay within character limits.
              </p>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={smsSearchQuery}
                onChange={(e) => setSmsSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <SmsTemplateList searchQuery={smsSearchQuery} />
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Email Branding</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure colors, logo, and styling applied to all email templates.
              </p>
            </div>
            <BrandingSettingsPanel />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
