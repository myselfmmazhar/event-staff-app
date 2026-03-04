'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { EventStatus } from '@prisma/client';
import { SendIcon, XIcon, PaperclipIcon, SpinnerIcon } from '@/components/ui/icons';
import { FileUpload } from '@/components/ui/file-upload';

interface TaskMessageModalProps {
    event: { id: string; title: string; client?: { businessName: string } | null } | null;
    open: boolean;
    onClose: () => void;
}

interface Attachment {
    filename: string;
    path: string;
}

export function TaskMessageModal({ event, open, onClose }: TaskMessageModalProps) {
    const [recipients, setRecipients] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<EventStatus | null>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

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

    useEffect(() => {
        if (event && open) {
            setSubject(`Message regarding Task: ${event.title}`);
            setBody(`Hello,\n\nI'm writing regarding the task "${event.title}".\n\nBest regards,`);
            setRecipients('');
            setSelectedStatus(null);
            setAttachments([]);
        }
    }, [event, open]);

    const handleFileUpload = async (files: File[]) => {
        // Only upload files that haven't been uploaded yet
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
                    path: data.absolutePath, // Local absolute path for backend
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

        const recipientList = recipients.split(',').map(e => e.trim()).filter(e => e !== '');
        if (recipientList.length === 0) {
            toast({ title: 'Error', description: 'At least one recipient is required', variant: 'destructive' });
            return;
        }

        sendMessageMutation.mutate({
            eventId: event.id,
            recipients: recipientList,
            subject,
            body,
            statusToUpdate: selectedStatus || undefined,
            attachments: attachments.length > 0 ? attachments : undefined,
        });
    };

    const handleStatusClick = (type: 'ACCEPTED' | 'REJECTED' | 'COMPLETED') => {
        if (!event) return;

        let newSubject = '';
        let newBody = '';
        let status: EventStatus | null = null;

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
        }

        setSubject(newSubject);
        setBody(newBody);
        setSelectedStatus(status);
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogHeader>
                <DialogTitle>Send Task Message</DialogTitle>
            </DialogHeader>

            <DialogContent className="sm:max-w-[500px]">
                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">1. Select Template & Action</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                size="sm"
                                variant={selectedStatus === EventStatus.IN_PROGRESS ? "default" : "outline"}
                                onClick={() => handleStatusClick('ACCEPTED')}
                                className={`flex-1 ${selectedStatus === EventStatus.IN_PROGRESS ? 'bg-green-600 hover:bg-green-700' : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'}`}
                            >
                                Accepted
                            </Button>
                            <Button
                                size="sm"
                                variant={selectedStatus === EventStatus.CANCELLED ? "default" : "outline"}
                                onClick={() => handleStatusClick('REJECTED')}
                                className={`flex-1 ${selectedStatus === EventStatus.CANCELLED ? 'bg-red-600 hover:bg-red-700' : 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200'}`}
                            >
                                Rejected
                            </Button>
                            <Button
                                size="sm"
                                variant={selectedStatus === EventStatus.COMPLETED ? "default" : "outline"}
                                onClick={() => handleStatusClick('COMPLETED')}
                                className={`flex-1 ${selectedStatus === EventStatus.COMPLETED ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'}`}
                            >
                                Completed
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">2. Recipients</Label>
                        <Input
                            placeholder="email1@example.com, email2@example.com"
                            value={recipients}
                            onChange={(e) => setRecipients(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">Separate multiple emails with commas.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">3. Message Content</Label>
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

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-sm font-semibold">4. Attachments ({attachments.length})</Label>
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
                    {selectedStatus ? `Will update status to ${selectedStatus.replace('_', ' ')}` : 'Message only (no status change)'}
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
