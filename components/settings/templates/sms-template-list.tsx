'use client';

import { useState } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { SmsTemplateEditorModal } from './sms-template-editor-modal';
import { TEMPLATE_TYPE_LABELS } from '@/lib/config/default-templates';
import type { SmsTemplateType } from '@prisma/client';
import { toast } from '@/components/ui/use-toast';
import { useMemo } from 'react';

interface SmsTemplateListProps {
  searchQuery?: string;
}

export function SmsTemplateList({ searchQuery = '' }: SmsTemplateListProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<SmsTemplateType | null>(null);

  const { data: templates, isLoading, refetch } = trpc.template.getAllSmsTemplates.useQuery();

  const resetMutation = trpc.template.resetSmsTemplate.useMutation({
    onSuccess: () => {
      refetch();
      toast({ title: 'Template reset to default', type: 'success' });
    },
    onError: (error) => {
      toast({ title: error.message || 'Failed to reset template', type: 'error' });
    },
  });

  const handleReset = (type: SmsTemplateType) => {
    if (confirm('Are you sure you want to reset this template to its default? Your customizations will be lost.')) {
      resetMutation.mutate({ type });
    }
  };

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!searchQuery.trim()) return templates;

    const query = searchQuery.toLowerCase();
    return templates.filter((template) => {
      const label = TEMPLATE_TYPE_LABELS[template.type] || template.type;
      return label.toLowerCase().includes(query);
    });
  }, [templates, searchQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No SMS templates found.
      </div>
    );
  }

  if (filteredTemplates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No templates match your search.
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 mt-0.5"
            style={{ color: '#2563eb' }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: '#1e3a5f' }}>
              SMS Integration Coming Soon
            </p>
            <p className="text-sm" style={{ color: '#334155' }}>
              SMS sending is not yet enabled. You can customize templates now, and they will be used once Twilio integration is configured.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTemplates.map((template) => (
          <Card key={template.type} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">
                    {TEMPLATE_TYPE_LABELS[template.type] || template.type}
                  </h3>
                  {template.isCustomized ? (
                    <Badge variant="primary" size="sm">
                      Customized
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {template.description}
                </p>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-sm font-mono truncate">{template.body}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {template.body.length} / {template.maxLength} characters
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTemplate(template.type)}
                >
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
                    className="mr-1"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Edit
                </Button>
                {template.isCustomized && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReset(template.type)}
                    disabled={resetMutation.isPending}
                  >
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
                      className="mr-1"
                    >
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Editor Modal */}
      {selectedTemplate && (
        <SmsTemplateEditorModal
          type={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSave={() => {
            refetch();
            setSelectedTemplate(null);
          }}
        />
      )}
    </>
  );
}
