'use client';

import { useState } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { EmailTemplateEditorModal } from './email-template-editor-modal';
import { TemplatePreviewModal } from './template-preview-modal';
import { TEMPLATE_TYPE_LABELS } from '@/lib/config/default-templates';
import type { EmailTemplateType } from '@prisma/client';
import { useMemo } from 'react';

interface EmailTemplateListProps {
  searchQuery?: string;
}

export function EmailTemplateList({ searchQuery = '' }: EmailTemplateListProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplateType | null>(null);

  const { data: templates, isLoading, refetch } = trpc.template.getAllEmailTemplates.useQuery();

  const resetMutation = trpc.template.resetEmailTemplate.useMutation({
    onSuccess: () => {
      refetch();
      toast({ title: 'Template reset to default', type: 'success' });
    },
    onError: (error) => {
      toast({ title: error.message || 'Failed to reset template', type: 'error' });
    },
  });

  const handleReset = (type: EmailTemplateType) => {
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
        No email templates found.
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
                <p className="text-sm text-muted-foreground">
                  {template.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                  Subject: {template.subject}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreviewTemplate(template.type)}
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
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Preview
                </Button>
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
        <EmailTemplateEditorModal
          type={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onSave={() => {
            refetch();
            setSelectedTemplate(null);
          }}
        />
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          type={previewTemplate}
          templateType="email"
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </>
  );
}
