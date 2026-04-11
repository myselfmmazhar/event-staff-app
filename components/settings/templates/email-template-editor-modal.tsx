'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RichTextEditor } from './rich-text-editor';
import { VariableInserter } from './variable-inserter';
import { TEMPLATE_TYPE_LABELS } from '@/lib/config/default-templates';
import type { EmailTemplateType } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Link as LinkIcon } from 'lucide-react';
import { useActionLabels } from '@/lib/hooks/use-labels';

interface EmailTemplateEditorModalProps {
  type: EmailTemplateType;
  onClose: () => void;
  onSave: () => void;
}

export function EmailTemplateEditorModal({
  type,
  onClose,
  onSave,
}: EmailTemplateEditorModalProps) {
  const actionLabels = useActionLabels();
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');

  const { data: template, isLoading } = trpc.template.getEmailTemplate.useQuery(
    { type },
    { enabled: !!type }
  );

  const updateMutation = trpc.template.updateEmailTemplate.useMutation({
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
      setSubject(template.subject);
      setBodyHtml(template.bodyHtml);
    }
  }, [template]);

  const handleSave = () => {
    if (!subject.trim()) {
      toast({ title: 'Subject is required', type: 'error' });
      return;
    }
    if (!bodyHtml.trim()) {
      toast({ title: 'Template body is required', type: 'error' });
      return;
    }

    updateMutation.mutate({
      type,
      subject,
      bodyHtml,
    });
  };

  const handleInsertVariable = (variable: string) => {
    // Insert variable at cursor position in the subject field
    const subjectInput = document.getElementById('template-subject') as HTMLInputElement;
    if (subjectInput && document.activeElement === subjectInput) {
      const start = subjectInput.selectionStart || 0;
      const end = subjectInput.selectionEnd || 0;
      const newSubject =
        subject.substring(0, start) + variable + subject.substring(end);
      setSubject(newSubject);
      setTimeout(() => {
        subjectInput.setSelectionRange(start + variable.length, start + variable.length);
        subjectInput.focus();
      }, 0);
    } else {
      // Insert into body HTML at the end
      setBodyHtml((prev) => prev + variable);
    }
  };

  const handleInsertButton = () => {
    const label = prompt('Enter button text:', 'Click Here');
    if (!label) return;

    const url = prompt('Enter button URL (use {{variableName}} for dynamic URLs):', '{{inviteUrl}}');
    if (!url) return;

    const buttonSyntax = `{{button:${label}|${url}}}`;
    setBodyHtml((prev) => prev + '\n' + buttonSyntax);
    toast({ title: 'Button added to template', type: 'success' });
  };

  return (
    <Dialog open onClose={onClose} className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>
          Edit {TEMPLATE_TYPE_LABELS[type] || type} Template
        </DialogTitle>
      </DialogHeader>

      <DialogContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Helper Tools */}
            {template && (
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-sm text-muted-foreground">
                  Edit the content below. The email header and styling are applied automatically.
                </p>
                <div className="flex items-center gap-2">
                  <VariableInserter
                    variables={template.availableVariables}
                    onInsert={handleInsertVariable}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInsertButton}
                    className="gap-1.5"
                  >
                    <LinkIcon className="h-3.5 w-3.5" />
                    Insert Button
                  </Button>
                </div>
              </div>
            )}

            {/* Subject Line */}
            <div className="space-y-2">
              <Label htmlFor="template-subject">Subject Line</Label>
              <Input
                id="template-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter email subject..."
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The subject is also used as the email header title if no custom header is set.
              </p>
            </div>

            {/* Body Editor */}
            <div className="space-y-2">
              <Label>Email Content</Label>
              <RichTextEditor
                content={bodyHtml}
                onChange={setBodyHtml}
                className="min-h-[350px]"
              />
              <p className="text-xs text-muted-foreground">
                Format your content using the toolbar. Use variables like {'{{firstName}}'} for personalization.
                Buttons appear as {'{{button:Label|URL}}'} in the editor but render styled in the email.
              </p>
            </div>

            {/* Syntax Help */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Quick Reference:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-muted-foreground">
                <span><code className="bg-muted px-1 rounded">{'{{button:Text|URL}}'}</code> → Styled CTA button</span>
                <span><code className="bg-muted px-1 rounded">{'{{firstName}}'}</code> → Recipient's name</span>
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
