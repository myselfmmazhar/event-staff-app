'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ConfirmModal } from '@/components/common/confirm-modal';
import { trpc as api } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { InternalReviewRating } from '@prisma/client';
import { INTERNAL_REVIEW_LABELS } from '@/lib/schemas/call-time.schema';
import { CalendarIcon, MapPinIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon, EditIcon } from 'lucide-react';

interface AssignmentHistoryProps {
    staffId: string;
}

type TabType = 'upcoming' | 'current' | 'past';

export function AssignmentHistory({ staffId }: AssignmentHistoryProps) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('upcoming');
    const [reviewingInvitation, setReviewingInvitation] = useState<string | null>(null);
    const [selectedRating, setSelectedRating] = useState<InternalReviewRating>(InternalReviewRating.MET_EXPECTATIONS);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const { data, isLoading, refetch } = api.callTime.getStaffAssignmentHistory.useQuery({ staffId });

    const submitReviewMutation = api.callTime.submitReview.useMutation({
        onSuccess: () => {
            toast({
                title: 'Review Saved',
                description: 'The internal review has been saved successfully.',
            });
            setReviewingInvitation(null);
            setSelectedRating(InternalReviewRating.MET_EXPECTATIONS);
            setReviewNotes('');
            setIsConfirmOpen(false);
            refetch();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save review',
                variant: 'error',
            });
        },
    });

    const handleOpenReview = (invitationId: string, existingRating?: InternalReviewRating | null, existingNotes?: string | null) => {
        setReviewingInvitation(invitationId);
        setSelectedRating(existingRating ?? InternalReviewRating.MET_EXPECTATIONS);
        setReviewNotes(existingNotes ?? '');
    };

    const handleSubmitReview = () => {
        if (!reviewingInvitation) return;

        // Validate NO_CALL_NO_SHOW requires notes
        if (selectedRating === InternalReviewRating.NO_CALL_NO_SHOW && !reviewNotes.trim()) {
            toast({
                title: 'Notes Required',
                description: 'Please add notes for No Call / No Show',
                variant: 'error',
            });
            return;
        }

        setIsConfirmOpen(true);
    };

    const handleConfirmSubmit = () => {
        if (!reviewingInvitation) return;

        submitReviewMutation.mutate({
            invitationId: reviewingInvitation,
            rating: selectedRating,
            notes: reviewNotes.trim() || null,
        });
    };

    const tabs: { key: TabType; label: string; count: number }[] = [
        { key: 'upcoming', label: 'Upcoming', count: data?.upcoming?.length ?? 0 },
        { key: 'current', label: 'Current', count: data?.current?.length ?? 0 },
        { key: 'past', label: 'Past', count: data?.past?.length ?? 0 },
    ];

    const getActiveAssignments = () => {
        if (!data) return [];
        switch (activeTab) {
            case 'upcoming':
                return data.upcoming ?? [];
            case 'current':
                return data.current ?? [];
            case 'past':
                return data.past ?? [];
            default:
                return [];
        }
    };

    const assignments = getActiveAssignments();

    const getReviewBadgeVariant = (rating: InternalReviewRating): 'success' | 'warning' | 'danger' | 'secondary' => {
        switch (rating) {
            case InternalReviewRating.MET_EXPECTATIONS:
                return 'success';
            case InternalReviewRating.NEEDS_IMPROVEMENT:
                return 'warning';
            case InternalReviewRating.DID_NOT_MEET:
            case InternalReviewRating.NO_CALL_NO_SHOW:
                return 'danger';
            default:
                return 'secondary';
        }
    };

    if (isLoading) {
        return (
            <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
                <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Assignment History</h3>
                <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
            </div>
        );
    }

    return (
        <div className="bg-accent/5 border border-border/30 p-5 rounded-lg mb-6">
            <h3 className="text-lg font-semibold border-b border-border pb-2 mb-4">Assignment History</h3>

            {/* Tabs */}
            <div className="flex gap-2 mb-4 border-b border-border">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === tab.key
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab.label} ({tab.count})
                    </button>
                ))}
            </div>

            {/* Assignments List */}
            {assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    No {activeTab} assignments found
                </div>
            ) : (
                <div className="space-y-4">
                    {assignments.map((inv) => (
                        <div
                            key={inv.id}
                            className="p-4 bg-muted/30 border border-border/30 rounded-lg"
                        >
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                {/* Assignment Details */}
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium">{inv.callTime.event.title}</h4>
                                        <Badge variant="secondary">{inv.callTime.service?.title ?? 'Service'}</Badge>
                                        {inv.status === 'ACCEPTED' && inv.isConfirmed && (
                                            <Badge variant="success">Confirmed</Badge>
                                        )}
                                        {inv.status === 'PENDING' && (
                                            <Badge variant="warning">Pending</Badge>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                                        {inv.callTime.startDate && (
                                            <div className="flex items-center gap-1">
                                                <CalendarIcon className="h-4 w-4" />
                                                {format(new Date(inv.callTime.startDate), 'MMM dd, yyyy')}
                                                {inv.callTime.endDate && inv.callTime.endDate !== inv.callTime.startDate && (
                                                    <> - {format(new Date(inv.callTime.endDate), 'MMM dd, yyyy')}</>
                                                )}
                                            </div>
                                        )}
                                        {inv.callTime.startTime && (
                                            <div className="flex items-center gap-1">
                                                <ClockIcon className="h-4 w-4" />
                                                {inv.callTime.startTime}
                                                {inv.callTime.endTime && <> - {inv.callTime.endTime}</>}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <MapPinIcon className="h-4 w-4" />
                                            {inv.callTime.event.venueName}, {inv.callTime.event.city}, {inv.callTime.event.state}
                                        </div>
                                    </div>

                                    {/* Event ID */}
                                    <p className="text-xs text-muted-foreground">
                                        Event: {inv.callTime.event.eventId}
                                    </p>
                                </div>

                                {/* Internal Review Section */}
                                <div className="lg:w-80 shrink-0">
                                    {activeTab === 'past' ? (
                                        // Past assignment - show review form or existing review (editable)
                                        reviewingInvitation === inv.id ? (
                                            <div className="p-4 bg-background border border-border rounded-lg shadow-sm space-y-4">
                                                <div className="flex items-center justify-between border-b border-border pb-3">
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircleIcon className="h-4 w-4 text-primary" />
                                                        <span className="font-medium">
                                                            {inv.reviewedAt ? 'Edit Review' : 'Add Internal Review'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-sm font-medium text-muted-foreground">Rating</label>
                                                    <Select
                                                        value={selectedRating}
                                                        onValueChange={(val) => setSelectedRating(val as InternalReviewRating)}
                                                    >
                                                        <SelectTrigger className="w-full h-10">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {Object.entries(INTERNAL_REVIEW_LABELS).map(([key, { label, description }]) => (
                                                                <SelectItem key={key} value={key}>
                                                                    <div className="flex flex-col py-0.5">
                                                                        <span className="font-medium">{label}</span>
                                                                        <span className="text-xs text-muted-foreground">{description}</span>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-sm font-medium text-muted-foreground">
                                                        Notes {selectedRating === InternalReviewRating.NO_CALL_NO_SHOW && <span className="text-destructive">*</span>}
                                                    </label>
                                                    <Textarea
                                                        placeholder={
                                                            selectedRating === InternalReviewRating.NO_CALL_NO_SHOW
                                                                ? 'Required - explain the circumstances...'
                                                                : 'Add any additional notes...'
                                                        }
                                                        value={reviewNotes}
                                                        onChange={(e) => setReviewNotes(e.target.value)}
                                                        rows={3}
                                                        className="text-sm resize-none"
                                                    />
                                                </div>

                                                <div className="flex gap-2 pt-2 border-t border-border">
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSubmitReview}
                                                        disabled={submitReviewMutation.isPending}
                                                        className="flex-1"
                                                    >
                                                        {submitReviewMutation.isPending ? 'Saving...' : 'Save Review'}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setReviewingInvitation(null)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : inv.reviewedAt ? (
                                            // Has existing review - show it with edit button
                                            <div className="p-4 bg-background border border-border rounded-lg shadow-sm">
                                                <div className="flex items-center justify-between border-b border-border pb-2 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircleIcon className="h-4 w-4 text-success" />
                                                        <span className="font-medium">Internal Review</span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 w-7 p-0 hover:bg-muted"
                                                        onClick={() => handleOpenReview(inv.id, inv.internalReviewRating, inv.internalReviewNotes)}
                                                        title="Edit review"
                                                    >
                                                        <EditIcon className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    <Badge variant={getReviewBadgeVariant(inv.internalReviewRating!)}>
                                                        {INTERNAL_REVIEW_LABELS[inv.internalReviewRating!].label}
                                                    </Badge>
                                                    {inv.internalReviewNotes && (
                                                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                                            {inv.internalReviewNotes}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-muted-foreground pt-1">
                                                        By {inv.reviewer?.firstName} {inv.reviewer?.lastName} on{' '}
                                                        {format(new Date(inv.reviewedAt), 'MMM dd, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            // No review yet - show add button
                                            <div className="p-4 bg-background border border-dashed border-border rounded-lg">
                                                <div className="text-center space-y-2">
                                                    <p className="text-sm text-muted-foreground">No review yet</p>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleOpenReview(inv.id)}
                                                        className="w-full"
                                                    >
                                                        <AlertCircleIcon className="h-4 w-4 mr-2" />
                                                        Add Internal Review
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    ) : (
                                        // Not past - not eligible for review yet
                                        <div className="p-4 bg-muted/30 border border-border/50 rounded-lg">
                                            <p className="text-sm text-muted-foreground text-center">
                                                Review available after completion
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                open={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmSubmit}
                isLoading={submitReviewMutation.isPending}
                title="Save Review"
                description="Are you sure you want to save this internal review?"
                confirmText="Save Review"
                variant="default"
            >
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Rating:</span>
                        <Badge variant={getReviewBadgeVariant(selectedRating)}>
                            {INTERNAL_REVIEW_LABELS[selectedRating].label}
                        </Badge>
                    </div>
                    {reviewNotes && (
                        <div>
                            <span className="text-sm font-medium">Notes:</span>
                            <p className="text-sm text-muted-foreground">{reviewNotes}</p>
                        </div>
                    )}
                </div>
            </ConfirmModal>
        </div>
    );
}
