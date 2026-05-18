'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { FileText, Upload, X, Download, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    REQ_TEMPLATE_CARDS,
    isDocumentTemplateId,
    type ReqTemplateId,
    type DocumentReqTemplateId,
} from '@/lib/requirement-templates';

export type CategorizedDocument = {
    requirementTemplateId: DocumentReqTemplateId;
    name: string;
    url: string;
    type?: string;
    size?: number;
};

interface PerRequirementDocumentUploadProps {
    requiredTemplates: Set<ReqTemplateId>;
    documents: Partial<Record<ReqTemplateId, CategorizedDocument>>;
    onChange: (docs: Partial<Record<ReqTemplateId, CategorizedDocument>>) => void;
    disabled?: boolean;
}

function formatFileSize(bytes?: number) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PerRequirementDocumentUpload({
    requiredTemplates,
    documents,
    onChange,
    disabled = false,
}: PerRequirementDocumentUploadProps) {
    const [uploadingFor, setUploadingFor] = useState<ReqTemplateId | null>(null);

    // Only document-requiring templates render an upload slot
    const slots = REQ_TEMPLATE_CARDS.filter(
        (card) => requiredTemplates.has(card.id) && isDocumentTemplateId(card.id),
    );

    const handleUpload = async (templateId: ReqTemplateId, file: File) => {
        setUploadingFor(templateId);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'staff-documents');

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error || `Failed to upload ${file.name}`);
            }

            const data = await response.json();
            const next: Partial<Record<ReqTemplateId, CategorizedDocument>> = {
                ...documents,
                [templateId]: {
                    requirementTemplateId: templateId,
                    name: data.name || file.name,
                    url: data.url,
                    type: data.type || file.type,
                    size: data.size || file.size,
                },
            };
            onChange(next);
            toast({ message: 'Document uploaded', type: 'success' });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Failed to upload document';
            toast({ message: msg, type: 'error' });
        } finally {
            setUploadingFor(null);
        }
    };

    const handleRemove = (templateId: ReqTemplateId) => {
        const next = { ...documents };
        delete next[templateId];
        onChange(next);
    };

    if (slots.length === 0) {
        return (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-4 text-center text-sm font-bold italic text-slate-400">
                No document uploads required.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {slots.map((card) => {
                const doc = documents[card.id];
                const isUploading = uploadingFor === card.id;
                return (
                    <div
                        key={card.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600">
                                <card.Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900">
                                    {card.title}
                                </p>
                                <p className="text-xs text-slate-500">{card.description}</p>
                            </div>
                            {doc && (
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                            )}
                        </div>

                        <div className="mt-3 pl-13">
                            {doc ? (
                                <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900">
                                                {doc.name}
                                            </p>
                                            {doc.size && (
                                                <p className="text-xs text-slate-500">
                                                    {formatFileSize(doc.size)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => window.open(doc.url, '_blank')}
                                            disabled={disabled}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                            onClick={() => handleRemove(card.id)}
                                            disabled={disabled}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <label
                                    className={cn(
                                        'flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 hover:border-primary/50',
                                        (disabled || isUploading) &&
                                            'opacity-50 cursor-not-allowed',
                                    )}
                                >
                                    <Input
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
                                        className="hidden"
                                        disabled={disabled || isUploading}
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleUpload(card.id, f);
                                            e.target.value = '';
                                        }}
                                    />
                                    {isUploading ? (
                                        <>
                                            <Spinner className="h-4 w-4 text-primary" />
                                            Uploading…
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="h-4 w-4" />
                                            Choose file
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
