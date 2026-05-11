'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import {
    REQ_TEMPLATE_CARDS,
    REQ_TEMPLATE_IDS,
    type ReqTemplateId,
} from '@/lib/requirement-templates';
import { StaffDocumentStatus } from '@prisma/client';

interface AdminDocumentHistoryTableProps {
    staffId: string;
    legacyDocuments: Array<{ name: string; url: string; type?: string; size?: number }>;
}

function getRequirementTitle(id: string): string {
    return REQ_TEMPLATE_CARDS.find((c) => c.id === id)?.title ?? id;
}

function statusVariant(status: StaffDocumentStatus) {
    switch (status) {
        case StaffDocumentStatus.APPROVED:
            return 'success' as const;
        case StaffDocumentStatus.PENDING:
            return 'warning' as const;
        case StaffDocumentStatus.REJECTED:
            return 'destructive' as const;
        case StaffDocumentStatus.SUPERSEDED:
        default:
            return 'secondary' as const;
    }
}

export function AdminDocumentHistoryTable({
    staffId,
    legacyDocuments,
}: AdminDocumentHistoryTableProps) {
    const utils = trpc.useUtils();
    const { data: history = [], isLoading } = trpc.staffDocument.getHistoryForStaff.useQuery({
        staffId,
    });

    const [categorizeFor, setCategorizeFor] = useState<number | null>(null);
    const [pickedTemplate, setPickedTemplate] = useState<ReqTemplateId | null>(null);
    const [pickedExpiresAt, setPickedExpiresAt] = useState<string>('');

    const categorizeMutation = trpc.staffDocument.categorizeLegacy.useMutation({
        onSuccess: () => {
            toast({ message: 'Document categorized', type: 'success' });
            setCategorizeFor(null);
            setPickedTemplate(null);
            setPickedExpiresAt('');
            utils.staffDocument.getHistoryForStaff.invalidate({ staffId });
            utils.staff.getById.invalidate({ id: staffId });
        },
        onError: (error) => {
            toast({
                message: error.message || 'Failed to categorize',
                type: 'error',
            });
        },
    });

    const grouped = useMemo(() => {
        const map = new Map<string, typeof history>();
        for (const doc of history) {
            const list = map.get(doc.requirementTemplateId) || [];
            list.push(doc);
            map.set(doc.requirementTemplateId, list);
        }
        return Array.from(map.entries());
    }, [history]);

    if (isLoading) {
        return <p className="text-sm text-muted-foreground">Loading document history…</p>;
    }

    return (
        <div className="space-y-6">
            {grouped.length === 0 && legacyDocuments.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                    No documents on file for this talent.
                </p>
            )}

            {grouped.map(([templateId, docs]) => (
                <div key={templateId} className="rounded-lg border border-border">
                    <div className="border-b border-border bg-muted/30 px-4 py-2 text-sm font-semibold">
                        {getRequirementTitle(templateId)}
                    </div>
                    <div className="divide-y divide-border">
                        {docs.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-start gap-3 px-4 py-3 text-sm"
                            >
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-medium truncate">
                                            {doc.name}
                                        </span>
                                        <Badge variant={statusVariant(doc.status)}>
                                            {doc.status}
                                        </Badge>
                                        {doc.isCurrent && (
                                            <Badge variant="default">Current</Badge>
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                            v{doc.version}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                        <span>
                                            Uploaded {format(new Date(doc.createdAt), 'PP p')}
                                        </span>
                                        {doc.expiresAt && (
                                            <span>
                                                Expires{' '}
                                                {format(new Date(doc.expiresAt), 'PP')}
                                            </span>
                                        )}
                                        {doc.reviewedAt && (
                                            <span>
                                                Reviewed{' '}
                                                {format(new Date(doc.reviewedAt), 'PP p')}
                                                {doc.reviewer
                                                    ? ` by ${doc.reviewer.firstName} ${doc.reviewer.lastName}`
                                                    : ''}
                                            </span>
                                        )}
                                    </div>
                                    {doc.rejectionReason && (
                                        <p className="mt-1 text-xs text-red-700">
                                            Reason: {doc.rejectionReason}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(doc.url, '_blank')}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {legacyDocuments.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/40">
                    <div className="border-b border-amber-200 bg-amber-100/40 px-4 py-2 text-sm font-semibold text-amber-900">
                        Legacy / Uncategorized Documents
                    </div>
                    <div className="divide-y divide-amber-200">
                        {legacyDocuments.map((doc, idx) => (
                            <div
                                key={idx}
                                className="flex items-start gap-3 px-4 py-3 text-sm"
                            >
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{doc.name}</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(doc.url, '_blank')}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setCategorizeFor(idx);
                                        setPickedTemplate(null);
                                        setPickedExpiresAt('');
                                    }}
                                >
                                    Categorize
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <Dialog
                open={categorizeFor !== null}
                onClose={() => {
                    if (!categorizeMutation.isPending) {
                        setCategorizeFor(null);
                        setPickedTemplate(null);
                        setPickedExpiresAt('');
                    }
                }}
                className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-0"
            >
                <DialogContent className="p-6">
                    <DialogHeader>
                        <DialogTitle>Categorize Legacy Document</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium">
                                Requirement Slot
                            </label>
                            <Select
                                value={pickedTemplate ?? ''}
                                onValueChange={(v) => setPickedTemplate(v as ReqTemplateId)}
                                disabled={categorizeMutation.isPending}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose requirement…" />
                                </SelectTrigger>
                                <SelectContent>
                                    {REQ_TEMPLATE_IDS.map((id) => (
                                        <SelectItem key={id} value={id}>
                                            {getRequirementTitle(id)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="mt-1 text-xs text-muted-foreground">
                                The document will become the current approved entry for this
                                requirement.
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium">
                                Expiry Date (optional)
                            </label>
                            <Input
                                type="date"
                                value={pickedExpiresAt}
                                onChange={(e) => setPickedExpiresAt(e.target.value)}
                                disabled={categorizeMutation.isPending}
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-6 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setCategorizeFor(null);
                                setPickedTemplate(null);
                                setPickedExpiresAt('');
                            }}
                            disabled={categorizeMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                if (categorizeFor === null || !pickedTemplate) return;
                                categorizeMutation.mutate({
                                    staffId,
                                    legacyIndex: categorizeFor,
                                    requirementTemplateId: pickedTemplate,
                                    expiresAt: pickedExpiresAt || null,
                                });
                            }}
                            disabled={
                                !pickedTemplate ||
                                categorizeMutation.isPending ||
                                categorizeFor === null
                            }
                            isLoading={categorizeMutation.isPending}
                        >
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
