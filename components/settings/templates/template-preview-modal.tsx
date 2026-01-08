'use client';

import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { TEMPLATE_TYPE_LABELS } from '@/lib/config/default-templates';
import type { EmailTemplateType, SmsTemplateType } from '@prisma/client';
import { Loader2 } from 'lucide-react';

interface TemplatePreviewModalProps {
  type: EmailTemplateType | SmsTemplateType;
  templateType: 'email' | 'sms';
  onClose: () => void;
}

export function TemplatePreviewModal({
  type,
  templateType,
  onClose,
}: TemplatePreviewModalProps) {
  const emailPreview = trpc.template.previewEmailTemplate.useQuery(
    { type: type as EmailTemplateType },
    { enabled: templateType === 'email' }
  );

  const smsPreview = trpc.template.previewSmsTemplate.useQuery(
    { type: type as SmsTemplateType },
    { enabled: templateType === 'sms' }
  );

  const isLoading =
    templateType === 'email' ? emailPreview.isLoading : smsPreview.isLoading;

  return (
    <Dialog open onClose={onClose} className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>
          Preview: {TEMPLATE_TYPE_LABELS[type] || type}
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : templateType === 'email' ? (
          <div className="space-y-4">
            {/* Email Preview */}
            <div className="bg-muted rounded-lg p-3">
              <p className="text-sm">
                <span className="font-medium">Subject:</span>{' '}
                {emailPreview.data?.subject}
              </p>
            </div>
            <div className="border rounded-lg overflow-hidden bg-white">
              <iframe
                srcDoc={emailPreview.data?.html}
                title="Email Preview"
                className="w-full h-[500px] border-0"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        ) : (
          <div>
            {/* SMS Preview */}
            <div className="bg-muted rounded-lg p-6">
              <p className="text-sm text-muted-foreground mb-4">
                SMS Message Preview:
              </p>
              <div className="flex justify-start">
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-bl-sm p-4 max-w-[300px]">
                  <p className="text-sm whitespace-pre-wrap">{smsPreview.data}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Character count: {smsPreview.data?.length || 0}
              </p>
            </div>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </Dialog>
  );
}
