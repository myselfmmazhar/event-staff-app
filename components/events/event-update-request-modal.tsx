'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/client/trpc';
import { PencilIcon } from 'lucide-react';

interface EventUpdateRequestModalProps {
    open: boolean;
    onClose: () => void;
    eventId: string;
    eventTitle: string;
}

export function EventUpdateRequestModal({ open, onClose, eventId, eventTitle }: EventUpdateRequestModalProps) {
    const [note, setNote] = useState('');
    const { toast } = useToast();
    const utils = trpc.useUtils();

    const submit = trpc.eventUpdateRequest.submit.useMutation({
        onSuccess: () => {
            toast({ title: 'Update request submitted', description: 'The admin will review your request shortly.' });
            utils.eventUpdateRequest.getMyUpdateRequests.invalidate();
            setNote('');
            onClose();
        },
        onError: (err) => {
            toast({ title: 'Failed to submit', description: err.message, variant: 'destructive' });
        },
    });

    function handleSubmit() {
        if (note.trim().length < 10) {
            toast({ title: 'Note too short', description: 'Please provide at least 10 characters.', variant: 'destructive' });
            return;
        }
        submit.mutate({ eventId, note });
    }

    function handleClose() {
        setNote('');
        onClose();
    }

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <PencilIcon className="h-4 w-4 text-muted-foreground" />
                        Request Event Update
                    </DialogTitle>
                </DialogHeader>

                <div className="px-6 py-2 space-y-4">
                    <div className="rounded-lg bg-muted/40 border border-border px-4 py-2.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Event</p>
                        <p className="text-sm font-medium text-foreground">{eventTitle}</p>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground">
                            Describe what you'd like to change
                            <span className="text-destructive ml-1">*</span>
                        </label>
                        <Textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="E.g. Please update the venue address to 123 Main St, or change the start time to 9:00 AM..."
                            rows={5}
                            maxLength={2000}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground text-right">{note.length}/2000</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={submit.isPending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submit.isPending || note.trim().length < 10}>
                        {submit.isPending ? 'Submitting…' : 'Submit Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
