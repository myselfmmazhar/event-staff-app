'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { EventStatus } from '@prisma/client';
import { SendIcon, XIcon, PaperclipIcon, SpinnerIcon, TrashIcon, PlusIcon } from '@/components/ui/icons';
import { FileUpload } from '@/components/ui/file-upload';
import { cn } from '@/lib/utils';

interface StaffInfo {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string | null;
}

interface TaskMessageModalProps {
    event: {
        id: string;
        title: string;
        client?: { businessName: string } | null;
        callTimes?: Array<{
            invitations: Array<{
                status: string;
                isConfirmed: boolean;
                staff: StaffInfo;
            }>
        }>
    } | null;
    open: boolean;
    onClose: () => void;
}

interface Attachment {
    filename: string;
    path: string;
}

interface CustomRecipient {
    id: string;
    value: string;
}

export function TaskMessageModal({ event, open, onClose }: TaskMessageModalProps) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<EventStatus | 'ALL' | null>('ALL');
    const [commMethod, setCommMethod] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Recipient selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [customRecipients, setCustomRecipients] = useState<CustomRecipient[]>([]);
    const [newCustomVal, setNewCustomVal] = useState('');

    const { toast } = useToast();
    const utils = trpc.useUtils();

    const sendMessageMutation = trpc.event.sendMessage.useMutation({
        onSuccess: (data) => {
            const failed = data.results.filter(r => !r.success);
            if (failed.length > 0) {
                toast({
                    title: 'Partial Success',
                    description: `Sent to ${data.results.length - failed.length} recipients. Failed for: ${failed.map(f => f.email).join(', ')}`,
                });
            } else {
                toast({
                    title: 'Success',
                    description: 'Message sent successfully',
                });
            }
            utils.event.getAll.invalidate();
            onClose();
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    // Extract unique staff members from event
    const allStaff = useMemo(() => {
        if (!event?.callTimes) return [];
        const seen = new Set();
        const staff: StaffInfo[] = [];
        event.callTimes.forEach(ct => {
            ct.invitations.forEach(inv => {
                if (!seen.has(inv.staff.id)) {
                    seen.add(inv.staff.id);
                    staff.push(inv.staff);
                }
            });
        });
        return staff.sort((a, b) => a.firstName.localeCompare(b.firstName));
    }, [event]);

    // Derived list of valid staff for the current commMethod
    const validStaff = useMemo(() => {
        return allStaff.filter(s => {
            if (commMethod === 'EMAIL') return !!s.email;
            return !!s.phone;
        });
    }, [allStaff, commMethod]);

    useEffect(() => {
        if (event && open) {
            setSubject(`Message regarding Task: ${event.title}`);
            setBody(`Hello,\n\nI'm writing regarding the task "${event.title}".\n\nBest regards,`);
            setAttachments([]);
            setCommMethod('EMAIL');
            setCustomRecipients([]);
            setNewCustomVal('');

            // Set "All" as default
            setSelectedStatus('ALL');
            if (event.callTimes) {
                const allInvitations = event.callTimes.flatMap(ct => ct.invitations);
                const allStaffIds = new Set(allInvitations.map(i => i.staff.id));
                // Filter these IDs to only include staff valid for the current commMethod
                const validIds = new Set(Array.from(allStaffIds).filter(id => validStaff.some(s => s.id === id)));
                setSelectedIds(validIds);
            } else {
                setSelectedIds(new Set());
            }
        }
    }, [event, open, validStaff]);

    const toggleStaffSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
            setSelectedStatus(null); // Deselect template match if manually changed
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const toggleAllStaff = () => {
        if (selectedIds.size === validStaff.length) {
            setSelectedIds(new Set());
            setSelectedStatus(null);
        } else {
            setSelectedIds(new Set(validStaff.map(s => s.id)));
            setSelectedStatus('ALL');
        }
    };

    const addCustomRecipient = () => {
        if (!newCustomVal.trim()) return;
        setCustomRecipients(prev => [...prev, { id: crypto.randomUUID(), value: newCustomVal.trim() }]);
        setNewCustomVal('');
    };

    const removeCustomRecipient = (id: string) => {
        setCustomRecipients(prev => prev.filter(r => r.id !== id));
    };

    const handleFileUpload = async (files: File[]) => {
        const newFilesToUpload = files.filter(file =>
            !attachments.some(attr => attr.filename === file.name)
        );

        if (newFilesToUpload.length === 0) return;

        setIsUploading(true);
        try {
            const uploadedAttachments: Attachment[] = [];
            for (const file of newFilesToUpload) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('bucket', 'email-attachments');

                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) throw new Error(`Failed to upload ${file.name}`);

                const data = await res.json();
                uploadedAttachments.push({
                    filename: data.name,
                    path: data.absolutePath,
                });
            }
            setAttachments(prev => [...prev, ...uploadedAttachments]);
            toast({ title: 'Success', description: `${newFilesToUpload.length} file(s) uploaded` });
        } catch (error) {
            toast({
                title: 'Upload Error',
                description: error instanceof Error ? error.message : 'Failed to upload files',
                variant: 'destructive',
            });
        } finally {
            setIsUploading(false);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSend = () => {
        if (!event) return;

        // Collect all target addresses (email or phone)
        const recipientList: string[] = [];

        // From selected staff
        validStaff.forEach(s => {
            if (selectedIds.has(s.id)) {
                if (commMethod === 'EMAIL') {
                    if (s.email) recipientList.push(s.email);
                } else {
                    if (s.phone) recipientList.push(s.phone);
                }
            }
        });

        // From custom recipients
        customRecipients.forEach(r => recipientList.push(r.value));

        const uniqueRecipients = Array.from(new Set(recipientList));

        if (uniqueRecipients.length === 0) {
            toast({ title: 'Error', description: 'At least one recipient is required', variant: 'destructive' });
            return;
        }

        sendMessageMutation.mutate({
            eventId: event.id,
            recipients: uniqueRecipients,
            subject,
            body,
            statusToUpdate: (selectedStatus && selectedStatus !== 'ALL') ? (selectedStatus as EventStatus) : undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
            commMethod: commMethod,
        });
    };

    const handleStatusClick = (type: 'ALL' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED') => {
        if (!event) return;

        let newSubject = `Message regarding Task: ${event.title}`;
        let newBody = `Hello,\n\nI'm writing regarding the task "${event.title}".\n\nBest regards,`;
        let status: EventStatus | 'ALL' | null = type === 'ALL' ? 'ALL' : null;

        switch (type) {
            case 'ACCEPTED':
                newSubject = `Task Accepted: ${event.title}`;
                newBody = `Hello,\n\nWe are pleased to inform you that the task "${event.title}" has been ACCEPTED.\n\nBest regards,`;
                status = EventStatus.IN_PROGRESS;
                break;
            case 'REJECTED':
                newSubject = `Task Rejected: ${event.title}`;
                newBody = `Hello,\n\nWe regret to inform you that the task "${event.title}" has been REJECTED.\n\nBest regards,`;
                status = EventStatus.CANCELLED;
                break;
            case 'COMPLETED':
                newSubject = `Task Completed: ${event.title}`;
                newBody = `Hello,\n\nThis is to notify you that the task "${event.title}" has been successfully COMPLETED.\n\nBest regards,`;
                status = EventStatus.COMPLETED;
                break;
            case 'ALL':
                // Already set defaults above
                break;
        }

        setSubject(newSubject);
        setBody(newBody);
        setSelectedStatus(status);

        // Selection logic based on invitations
        if (event.callTimes) {
            const allInvitations = event.callTimes.flatMap(ct => ct.invitations);
            let nextIds = new Set<string>();

            if (type === 'ACCEPTED') {
                nextIds = new Set(allInvitations.filter(i => i.status === 'ACCEPTED').map(i => i.staff.id));
            } else if (type === 'REJECTED') {
                nextIds = new Set(allInvitations.filter(i => i.status === 'DECLINED' || i.status === 'REJECTED').map(i => i.staff.id));
            } else if (type === 'COMPLETED' || type === 'ALL') {
                nextIds = new Set(allInvitations.map(i => i.staff.id));
            }

            // Only select those valid for current method
            setSelectedIds(new Set(Array.from(nextIds).filter(id => validStaff.some(s => s.id === id))));
        }
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>Send Task Message</DialogTitle>
            </DialogHeader>

            <DialogContent className="sm:max-w-[550px]">
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

                    {/* 2. Template */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">2. Select Template & Action</Label>
                        <div className="grid grid-cols-4 gap-2">
                            <Button
                                size="sm"
                                variant={selectedStatus === 'ALL' ? "default" : "outline"}
                                onClick={() => handleStatusClick('ALL')}
                                className={cn("flex-1", selectedStatus === 'ALL' ? 'bg-primary' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200')}
                            >
                                All
                            </Button>
                            <Button
                                size="sm"
                                variant={selectedStatus === EventStatus.IN_PROGRESS ? "default" : "outline"}
                                onClick={() => handleStatusClick('ACCEPTED')}
                                className={cn("flex-1", selectedStatus === EventStatus.IN_PROGRESS ? 'bg-green-600 hover:bg-green-700' : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200')}
                            >
                                Accepted
                            </Button>
                            <Button
                                size="sm"
                                variant={selectedStatus === EventStatus.CANCELLED ? "default" : "outline"}
                                onClick={() => handleStatusClick('REJECTED')}
                                className={cn("flex-1", selectedStatus === EventStatus.CANCELLED ? 'bg-red-600 hover:bg-red-700' : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200')}
                            >
                                Declined
                            </Button>
                            <Button
                                size="sm"
                                variant={selectedStatus === EventStatus.COMPLETED ? "default" : "outline"}
                                onClick={() => handleStatusClick('COMPLETED')}
                                className={cn("flex-1", selectedStatus === EventStatus.COMPLETED ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200')}
                            >
                                Completed
                            </Button>
                        </div>
                    </div>

                    {/* 3. Recipients with Checkboxes */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-semibold">3. Recipients ({selectedIds.size + customRecipients.length})</Label>
                            {validStaff.length > 0 && (
                                <Button variant="ghost" size="sm" onClick={toggleAllStaff} className="text-[10px] h-6">
                                    {selectedIds.size === validStaff.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            )}
                        </div>

                        {validStaff.length > 0 ? (
                            <div className="border rounded-md divide-y max-h-[160px] overflow-y-auto bg-muted/5">
                                {validStaff.map(staff => (
                                    <div
                                        key={staff.id}
                                        className="flex items-center gap-3 p-2 px-3 hover:bg-muted/10 transition-colors cursor-pointer group"
                                        onClick={() => toggleStaffSelection(staff.id)}
                                    >
                                        <Checkbox
                                            checked={selectedIds.has(staff.id)}
                                            onChange={() => toggleStaffSelection(staff.id)} // Internal toggle handled by parent div too
                                            readOnly
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-medium truncate">{staff.firstName} {staff.lastName}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {commMethod === 'EMAIL' ? staff.email : staff.phone}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 border border-dashed rounded-md bg-muted/5">
                                <p className="text-xs text-muted-foreground italic">No staff available with {commMethod.toLowerCase()} info</p>
                            </div>
                        )}

                        {/* Custom Recipients */}
                        <div className="space-y-2 pt-1">
                            <div className="flex gap-2">
                                <Input
                                    size="sm"
                                    className="h-8 text-xs"
                                    placeholder={commMethod === 'EMAIL' ? "Add custom email..." : "Add custom number..."}
                                    value={newCustomVal}
                                    onChange={(e) => setNewCustomVal(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRecipient())}
                                />
                                <Button size="sm" className="h-8 px-2" onClick={addCustomRecipient} variant="outline">
                                    <PlusIcon className="h-3.5 w-3.5" />
                                </Button>
                            </div>

                            {customRecipients.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {customRecipients.map(r => (
                                        <div key={r.id} className="flex items-center gap-1 bg-primary/10 text-primary-foreground border border-primary/20 rounded-full px-2 py-0.5 text-[10px]">
                                            <span className="max-w-[120px] truncate">{r.value}</span>
                                            <button onClick={() => removeCustomRecipient(r.id)} className="hover:text-red-500">
                                                <XIcon className="h-2.5 w-2.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Content */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">4. Message Content</Label>
                        <div className="space-y-2">
                            <Input
                                placeholder="Subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                            <Textarea
                                placeholder="Message body..."
                                rows={5}
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 5. Attachments */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-semibold">5. Attachments ({attachments.length})</Label>
                            {isUploading && <SpinnerIcon className="h-4 w-4 animate-spin text-primary" />}
                        </div>

                        <FileUpload
                            onFilesChange={handleFileUpload}
                            showList={false}
                            maxFiles={5}
                            accept={{
                                'image/*': [],
                                'application/pdf': [],
                                'application/msword': [],
                                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
                                'text/plain': []
                            }}
                        />

                        {attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs p-2 border rounded bg-muted/30">
                                        <div className="flex items-center gap-2 truncate">
                                            <PaperclipIcon className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{file.filename}</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:text-red-600"
                                            onClick={() => removeAttachment(idx)}
                                        >
                                            <XIcon className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>

            <DialogFooter className="flex sm:justify-between items-center sm:gap-4 mt-4">
                <p className="hidden sm:block text-[10px] text-muted-foreground italic flex-1">
                    {selectedStatus && selectedStatus !== 'ALL' ? `Will update status to ${selectedStatus.replace('_', ' ')}` : 'Message only (no status change)'}
                </p>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSend}
                        disabled={sendMessageMutation.isPending || isUploading}
                        className="flex-1 sm:flex-none shadow-sm"
                    >
                        {sendMessageMutation.isPending ? <SpinnerIcon className="h-4 w-4 animate-spin mr-2" /> : <SendIcon className="h-4 w-4 mr-2" />}
                        Send
                    </Button>
                </div>
            </DialogFooter>
        </Dialog>
    );
}
