'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { VariableInserter } from './variable-inserter';
import { TEMPLATE_TYPE_LABELS } from '@/lib/config/default-templates';
import type { SmsTemplateType } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useActionLabels } from '@/lib/hooks/use-labels';

interface SmsTemplateEditorModalProps {
  type: SmsTemplateType;
  onClose: () => void;
  onSave: () => void;
}

export function SmsTemplateEditorModal({
  type,
  onClose,
  onSave,
}: SmsTemplateEditorModalProps) {
  const actionLabels = useActionLabels();
  const [body, setBody] = useState('');
  const [maxLength, setMaxLength] = useState(160);

  const { data: template, isLoading } = trpc.template.getSmsTemplate.useQuery(
    { type },
    { enabled: !!type }
  );

  const previewQuery = trpc.template.previewSmsTemplate.useQuery(
    { type, body },
    { enabled: !!body }
  );

  const updateMutation = trpc.template.updateSmsTemplate.useMutation({
    onSuccess: () => {
      toast({ title: 'Template saved successfully', type: 'success' });
      onSave();
    },
    onError: (error) => {
      toast({ title: error.message || 'Failed to save template', type: 'error' });
    },
  });

  useEffect(() => {
    if (template) {
      setBody(template.body);
      setMaxLength(template.maxLength);
    }
  }, [template]);

  const handleSave = () => {
    if (!body.trim()) {
      toast({ title: 'Message body is required', type: 'error' });
      return;
    }

    updateMutation.mutate({
      type,
      body,
    });
  };

  const handleInsertVariable = (variable: string) => {
    const textarea = document.getElementById('sms-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const newBody = body.substring(0, start) + variable + body.substring(end);
      setBody(newBody);
      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.setSelectionRange(start + variable.length, start + variable.length);
        textarea.focus();
      }, 0);
    }
  };

  const characterCount = body.length;
  const isOverLimit = characterCount > maxLength;
  const segmentCount = Math.ceil(characterCount / 160);

  return (
    <Dialog open onClose={onClose} className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          Edit {TEMPLATE_TYPE_LABELS[type] || type} SMS Template
        </DialogTitle>
      </DialogHeader>

      <DialogContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Variable Inserter */}
            {template && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Use variables to personalize the message.
                </p>
                <VariableInserter
                  variables={template.availableVariables}
                  onInsert={handleInsertVariable}
                />
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-2">
              <Label htmlFor="sms-body">Message Body</Label>
              <Textarea
                id="sms-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter SMS message..."
                className="min-h-[120px] font-mono text-sm resize-none"
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`${isOverLimit ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                >
                  {characterCount} / {maxLength} characters
                  {segmentCount > 1 && (
                    <span className="ml-2 text-amber-600">
                      ({segmentCount} SMS segments)
                    </span>
                  )}
                </span>
                {isOverLimit && (
                  <span className="text-destructive">
                    Message exceeds recommended length
                  </span>
                )}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview (with sample data)</Label>
              <div className="bg-muted rounded-lg p-4">
                <div className="bg-primary text-primary-foreground rounded-lg p-3 max-w-[280px] text-sm">
                  {previewQuery.data || body || 'Enter a message to see preview...'}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {actionLabels.cancel}
        </Button>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || isLoading}
        >
          {updateMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {actionLabels.save}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
