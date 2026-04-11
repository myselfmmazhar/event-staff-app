'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { SendIcon, SpinnerIcon } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import type { StaffWithRelations } from './staff-table';

interface StaffMessageModalProps {
    staff: StaffWithRelations | null;
    open: boolean;
    onClose: () => void;
}

export function StaffMessageModal({ staff, open, onClose }: StaffMessageModalProps) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [commMethod, setCommMethod] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');

    const { toast } = useToast();

    const sendEmailMutation = trpc.communication.sendEmailAdHoc.useMutation({
        onSuccess: () => {
            toast({ title: 'Success', description: 'Email sent successfully' });
            onClose();
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const sendMessageMutation = trpc.communication.sendMessageAdHoc.useMutation({
        onSuccess: () => {
            toast({ title: 'Success', description: 'Message sent successfully' });
            onClose();
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    useEffect(() => {
        if (staff && open) {
            setSubject(`Message from Admin to ${staff.firstName}`);
            setBody(`Hello ${staff.firstName},\n\n`);
            setCommMethod('EMAIL');
        }
    }, [staff, open]);

    const handleSend = () => {
        if (!staff) return;

        if (commMethod === 'EMAIL') {
            if (!staff.email) {
                toast({ title: 'Error', description: 'Staff has no email address', variant: 'destructive' });
                return;
            }
            sendEmailMutation.mutate({
                to: staff.email,
                subject,
                content: body,
            });
        } else {
            if (!staff.phone) {
                toast({ title: 'Error', description: 'Staff has no phone number', variant: 'destructive' });
                return;
            }
            sendMessageMutation.mutate({
                to: staff.phone,
                content: body,
                type: commMethod === 'WHATSAPP' ? 'WHATSAPP' : 'SMS',
            });
        }
    };

    const isPending = sendEmailMutation.isPending || sendMessageMutation.isPending;

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>Send Message</DialogTitle>
            </DialogHeader>

            <DialogContent className="sm:max-w-[500px]">
                <div className="space-y-6 py-4">
                    {/* 1. Comm Method */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">1. Select Communication Method</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                size="sm"
                                variant={commMethod === 'EMAIL' ? "default" : "outline"}
                                onClick={() => setCommMethod('EMAIL')}
                                className={cn("flex-1", commMethod === 'EMAIL' ? 'bg-blue-600 hover:bg-blue-700' : 'text-blue-700 border-blue-200 hover:bg-blue-50')}
                            >
                                Email
                            </Button>
                            <Button
                                size="sm"
                                variant={commMethod === 'SMS' ? "default" : "outline"}
                                onClick={() => setCommMethod('SMS')}
                                className={cn("flex-1", commMethod === 'SMS' ? 'bg-primary' : '')}
                            >
                                SMS
                            </Button>
                            <Button
                                size="sm"
                                variant={commMethod === 'WHATSAPP' ? "default" : "outline"}
                                onClick={() => setCommMethod('WHATSAPP')}
                                className={cn("flex-1", commMethod === 'WHATSAPP' ? 'bg-green-600 hover:bg-green-700' : 'text-green-700 border-green-200 hover:bg-green-50')}
                            >
                                WhatsApp
                            </Button>
                        </div>
                    </div>

                    {/* 2. Recipient */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">2. Recipient</Label>
                        <Input
                            readOnly
                            value={commMethod === 'EMAIL' ? (staff?.email || 'N/A') : (staff?.phone || 'N/A')}
                            className="bg-muted text-muted-foreground cursor-not-allowed"
                        />
                    </div>

                    {/* 3. Content */}
                    <div className="space-y-4">
                        <Label className="text-sm font-semibold">3. Message Content</Label>
                        {commMethod === 'EMAIL' && (
                            <div className="space-y-2">
                                <Label htmlFor="subject" className="text-xs">Subject</Label>
                                <Input
                                    id="subject"
                                    placeholder="Subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="body" className="text-xs">Message</Label>
                            <Textarea
                                id="body"
                                placeholder="Message body..."
                                rows={6}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </DialogContent>

            <DialogFooter className="flex sm:justify-end gap-2 mt-4">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSend}
                    disabled={isPending || (!staff?.email && commMethod === 'EMAIL') || (!staff?.phone && commMethod !== 'EMAIL')}
                    className="shadow-sm"
                >
                    {isPending ? <SpinnerIcon className="h-4 w-4 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
                    Send
                </Button>
            </DialogFooter>
        </Dialog>
    );
}
