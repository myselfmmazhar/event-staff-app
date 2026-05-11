'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/client/trpc';
import {
    FileText,
    Download,
    Upload,
    AlertTriangle,
    Clock,
    CheckCircle2,
} from 'lucide-react';
import { REQ_TEMPLATE_CARDS, type ReqTemplateId } from '@/lib/requirement-templates';
import { format } from 'date-fns';

function getRequirementTitle(id: string): string {
    return REQ_TEMPLATE_CARDS.find((c) => c.id === id)?.title ?? id;
}

function formatDate(d: Date | string | null | undefined): string {
    if (!d) return '—';
    return format(new Date(d), 'PP');
}

export function TalentDocumentsPanel() {
    const utils = trpc.useUtils();
    const { data: slots = [], isLoading } = trpc.staffDocument.listMine.useQuery();

    const [uploadOpen, setUploadOpen] = useState<ReqTemplateId | null>(null);
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const uploadMutation = trpc.staffDocument.uploadUpdate.useMutation({
        onSuccess: () => {
            toast({
                message: 'Update submitted for review',
                type: 'success',
            });
            setUploadOpen(null);
            setPendingFile(null);
            utils.staffDocument.listMine.invalidate();
        },
        onError: (error) => {
            toast({
                message: error.message || 'Failed to submit update',
                type: 'error',
            });
        },
    });

    const handleSubmit = async () => {
        if (!uploadOpen || !pendingFile) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', pendingFile);
            formData.append('bucket', 'staff-documents');
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err?.error || 'Failed to upload file');
            }
            const data = await response.json();
            uploadMutation.mutate({
                requirementTemplateId: uploadOpen,
                name: data.name || pendingFile.name,
                url: data.url,
                type: data.type || pendingFile.type,
                size: data.size || pendingFile.size,
            });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Upload failed';
            toast({ message: msg, type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse h-32 bg-muted rounded" />
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        My Documents
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {slots.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No documents on file yet. Documents uploaded during onboarding will
                            appear here.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {slots.map((slot) => {
                                const title = getRequirementTitle(slot.requirementTemplateId);
                                return (
                                    <div
                                        key={slot.requirementTemplateId}
                                        className="rounded-lg border border-border p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold">{title}</p>
                                                {slot.current ? (
                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                                        <span className="font-medium truncate">
                                                            {slot.current.name}
                                                        </span>
                                                        <Badge variant="success">Approved</Badge>
                                                        {slot.current.expiresAt && (
                                                            <span className="text-xs text-muted-foreground">
                                                                Expires{' '}
                                                                {formatDate(slot.current.expiresAt)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="mt-2 text-sm italic text-muted-foreground">
                                                        No approved document on file.
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-2">
                                                {slot.current && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            window.open(slot.current!.url, '_blank')
                                                        }
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={!!slot.pending}
                                                    onClick={() =>
                                                        setUploadOpen(
                                                            slot.requirementTemplateId as ReqTemplateId,
                                                        )
                                                    }
                                                >
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    Upload Update
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Pending banner */}
                                        {slot.pending && (
                                            <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                                                <Clock className="h-4 w-4 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p>
                                                        <span className="font-semibold">
                                                            {slot.pending.name}
                                                        </span>{' '}
                                                        is awaiting admin review.
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        window.open(slot.pending!.url, '_blank')
                                                    }
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}

                                        {/* Last rejected banner (only when no fresh pending) */}
                                        {!slot.pending && slot.lastRejected && (
                                            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold">
                                                        Last update was rejected
                                                    </p>
                                                    {slot.lastRejected.rejectionReason && (
                                                        <p className="mt-0.5 text-xs">
                                                            Reason:{' '}
                                                            {slot.lastRejected.rejectionReason}
                                                        </p>
                                                    )}
                                                    <p className="mt-0.5 text-xs">
                                                        Showing your last approved document above.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={uploadOpen !== null}
                onClose={() => {
                    if (!isUploading && !uploadMutation.isPending) {
                        setUploadOpen(null);
                        setPendingFile(null);
                    }
                }}
                className="mx-4 w-full max-w-lg rounded-xl border border-border bg-card p-0"
            >
                <DialogContent className="p-6">
                    <DialogHeader>
                        <DialogTitle>
                            Upload {uploadOpen ? getRequirementTitle(uploadOpen) : ''}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium">File</label>
                            <Input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif"
                                onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                                disabled={isUploading || uploadMutation.isPending}
                            />
                            {pendingFile && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Selected: {pendingFile.name}
                                </p>
                            )}
                        </div>
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                            <div className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                <p>
                                    Once submitted your update will be reviewed by an admin. You
                                    will be notified when it is approved or rejected. Your
                                    current approved document remains active until then.
                                </p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setUploadOpen(null);
                                setPendingFile(null);
                            }}
                            disabled={isUploading || uploadMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSubmit}
                            disabled={
                                !pendingFile || isUploading || uploadMutation.isPending
                            }
                            isLoading={isUploading || uploadMutation.isPending}
                        >
                            {isUploading || uploadMutation.isPending ? (
                                <>
                                    <Spinner className="mr-2 h-4 w-4" />
                                    Submitting…
                                </>
                            ) : (
                                'Submit for Review'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
