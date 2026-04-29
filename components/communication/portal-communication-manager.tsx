'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/client/trpc';
import { format, isToday, isYesterday } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Search,
    Mail,
    MessageSquare,
    Phone,
    Plus,
    Maximize2,
    Type,
    Image as ImageIcon,
    Code,
    MoreHorizontal,
    X,
    Paperclip,
    Send,
    Link,
    ChevronLeft,
    Users,
    AlertCircle,
    ChevronDown,
    Shield,
} from 'lucide-react';
import { MessageType } from '@prisma/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type AdminTeamMember = {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    role: string;
    profilePhoto?: string | null;
};

export function PortalCommunicationManager() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();
    const scrollRef = useRef<HTMLDivElement>(null);

    const activeTab = searchParams.get('tab') || 'email';

    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
    const [selectedAdminContact, setSelectedAdminContact] = useState<AdminTeamMember | null>(null);
    const [isDetailView, setIsDetailView] = useState(false);
    const [contactActionTab, setContactActionTab] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | 'COMMENT' | null>(null);

    useEffect(() => {
        const recipient = searchParams.get('recipient');
        const tab = searchParams.get('tab');
        if (recipient) {
            setSelectedRecipient(recipient);
            setContactActionTab(tab === 'messages' ? 'SMS' : 'EMAIL');
        }
    }, [searchParams]);

    const [search, setSearch] = useState('');

    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeType, setComposeType] = useState<'EMAIL' | 'MESSAGE'>('EMAIL');
    const [selectedComposeAdminId, setSelectedComposeAdminId] = useState('');
    const [emailForm, setEmailForm] = useState({ to: '', subject: '', content: '', configId: '' });
    const [messageForm, setMessageForm] = useState({ to: '', content: '', configId: '' });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
    const [contactActionEmailConfigId, setContactActionEmailConfigId] = useState('default');
    const [contactActionMsgConfigId, setContactActionMsgConfigId] = useState('default');
    const [contactActionSubject, setContactActionSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

    const toggleLog = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setExpandedLogs(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Queries
    const { data: companyProfile, isLoading: isCompanyLoading } = trpc.settings.getCompanyProfile.useQuery();

    const companyContact: AdminTeamMember | null = companyProfile?.companyEmail
        ? {
            id: 'company',
            name: companyProfile.companyName || 'Company',
            email: companyProfile.companyEmail,
            phone: companyProfile.companyPhone ?? null,
            role: 'COMPANY',
        }
        : null;

    const { data: conversations, isLoading: isConversationsLoading } = trpc.communication.getPortalConversations.useQuery(
        { type: activeTab === 'email' ? 'EMAIL' : 'MESSAGE' },
        { enabled: activeTab === 'email' || activeTab === 'messages' },
    );

    const { data: chatHistory, isLoading: isChatLoading } =
        trpc.communication.getPortalChatHistory.useQuery(
            { recipient: selectedRecipient!, type: activeTab === 'email' ? 'EMAIL' : 'MESSAGE' },
            { enabled: (activeTab === 'email' || activeTab === 'messages') && !!selectedRecipient },
        );

    const { data: smtpConfigs } = trpc.settings.listSmtpConfigs.useQuery();
    const { data: messagingConfigs } = trpc.settings.listMessagingConfigs.useQuery();

    const detailChatType: MessageType =
        contactActionTab === 'SMS' ? 'SMS'
            : contactActionTab === 'WHATSAPP' ? 'WHATSAPP'
                : 'EMAIL';

    const detailRecipient = (detailChatType === 'EMAIL'
        ? selectedAdminContact?.email
        : (selectedAdminContact?.phone ?? selectedAdminContact?.email)) ?? '';

    const { data: adminContactHistory, refetch: refetchAdminContactHistory } =
        trpc.communication.getPortalChatHistory.useQuery(
            { recipient: detailRecipient, type: detailChatType },
            { enabled: !!selectedAdminContact && isDetailView && !!detailRecipient },
        );

    useEffect(() => {
        if (selectedAdminContact && isDetailView) {
            refetchAdminContactHistory();
        }
    }, [selectedAdminContact, isDetailView, detailChatType, refetchAdminContactHistory]);

    // Mutations
    const sendEmailMutation = trpc.communication.sendPortalEmail.useMutation({
        onSuccess: () => {
            toast({ title: 'Email sent successfully' });
            setIsComposeOpen(false);
            setEmailForm({ to: '', subject: '', content: '', configId: '' });
            setSelectedComposeAdminId('');
            utils.communication.getPortalConversations.invalidate();
            refetchAdminContactHistory();
        },
        onError: (error) => {
            toast({ title: 'Failed to send email', description: error.message, variant: 'error' });
        },
    });

    const sendMessageMutation = trpc.communication.sendPortalMessage.useMutation({
        onSuccess: () => {
            if (!isComposeOpen) {
                setNewMessage('');
            } else {
                toast({ title: 'Message sent successfully' });
                setIsComposeOpen(false);
                setMessageForm({ to: '', content: '', configId: '' });
                setSelectedComposeAdminId('');
            }
            utils.communication.getPortalChatHistory.invalidate();
            utils.communication.getPortalConversations.invalidate();
            refetchAdminContactHistory();
        },
        onError: (error) => {
            toast({ title: 'Failed to send message', description: error.message, variant: 'error' });
        },
    });

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, activeTab]);

    // Populate SMTP config defaults
    useEffect(() => {
        if (smtpConfigs && smtpConfigs.length > 0 && contactActionEmailConfigId === 'default') {
            const def = smtpConfigs.find((c: any) => c.isDefault) || smtpConfigs[0];
            setContactActionEmailConfigId(def.id);
        }
    }, [smtpConfigs, contactActionEmailConfigId]);

    useEffect(() => {
        if (messagingConfigs && messagingConfigs.length > 0 && contactActionMsgConfigId === 'default') {
            const def = messagingConfigs.find((c: any) => c.isDefault) || messagingConfigs[0];
            setContactActionMsgConfigId(def.id);
        }
    }, [messagingConfigs, contactActionMsgConfigId]);

    // Helpers
    const getInitials = (name: string | null | undefined) => {
        if (!name) return '??';
        return name
            .split(/[.@ ]/)
            .filter(Boolean)
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const formatDate = (date: Date) => {
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'dd/MM/yyyy');
    };

    const selectedSmtpConfig =
        smtpConfigs?.find((c: any) => c.id === contactActionEmailConfigId) ||
        smtpConfigs?.find((c: any) => c.isDefault);

    const handleContactActionSubmit = async () => {
        if (!selectedAdminContact || (!newMessage.trim() && attachments.length === 0)) return;

        let uploadedFileLinks: { name: string; url: string; size: number; type: string }[] = [];
        if (attachments.length > 0) {
            setIsUploadingAttachments(true);
            try {
                uploadedFileLinks = await Promise.all(
                    attachments.map(async (file) => {
                        const fd = new FormData();
                        fd.append('file', file);
                        fd.append('bucket', 'event-documents');
                        const res = await fetch('/api/upload', { method: 'POST', body: fd });
                        if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
                        const data = await res.json();
                        return { name: file.name, url: data.url, size: file.size, type: file.type };
                    }),
                );
            } catch (err) {
                toast({
                    title: 'Attachment Upload Failed',
                    description: err instanceof Error ? err.message : 'Could not upload one or more attachments.',
                    variant: 'destructive',
                });
                setIsUploadingAttachments(false);
                return;
            } finally {
                setIsUploadingAttachments(false);
            }
        }

        if (contactActionTab === 'EMAIL') {
            sendEmailMutation.mutate({
                to: selectedAdminContact.email,
                subject: contactActionSubject || `Message for ${selectedAdminContact.name ?? selectedAdminContact.email}`,
                content: newMessage,
                configId: contactActionEmailConfigId === 'default' ? undefined : contactActionEmailConfigId,
                fileLinks: uploadedFileLinks.length > 0 ? uploadedFileLinks : undefined,
            });
        } else if (contactActionTab === 'SMS' || contactActionTab === 'WHATSAPP') {
            sendMessageMutation.mutate({
                to: selectedAdminContact.phone ?? '',
                content: newMessage,
                type: contactActionTab as 'SMS' | 'WHATSAPP',
                configId: contactActionMsgConfigId === 'default' ? undefined : contactActionMsgConfigId,
            });
        }
        setNewMessage('');
        setContactActionSubject('');
        setAttachments([]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleComposeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (composeType === 'EMAIL') {
            sendEmailMutation.mutate({
                ...emailForm,
                configId: emailForm.configId === 'default' || !emailForm.configId ? undefined : emailForm.configId,
            });
        } else {
            sendMessageMutation.mutate({
                ...messageForm,
                configId: messageForm.configId === 'default' || !messageForm.configId ? undefined : messageForm.configId,
            });
        }
    };

    const handleComposeAdminSelect = (_adminId: string) => {
        if (!companyContact) return;
        setSelectedComposeAdminId(companyContact.id);
        if (composeType === 'EMAIL') {
            setEmailForm(prev => ({ ...prev, to: companyContact.email }));
        } else {
            setMessageForm(prev => ({ ...prev, to: companyContact.phone ?? '' }));
        }
    };

    // Auto-fill company contact when compose modal opens
    const openCompose = (type: 'EMAIL' | 'MESSAGE') => {
        setComposeType(type);
        setIsComposeOpen(true);
        if (companyContact) {
            setSelectedComposeAdminId(companyContact.id);
            if (type === 'EMAIL') {
                setEmailForm(prev => ({ ...prev, to: companyContact.email }));
            } else {
                setMessageForm(prev => ({ ...prev, to: companyContact.phone ?? '' }));
            }
        }
    };

    // Shared compose box used in both inbox and contact detail views
    const ComposeBox = ({
        onSend,
        recipientLabel,
        showSubject,
        isSending,
        isUploading,
    }: {
        onSend: () => void;
        recipientLabel: string;
        showSubject: boolean;
        isSending: boolean;
        isUploading: boolean;
    }) => (
        <div className="bg-white border-t border-slate-200 z-10 flex flex-col shrink-0">
            <div className="p-4 flex-1 overflow-y-auto no-scrollbar max-h-[400px] bg-white">
                {showSubject && (
                    <div className="space-y-2 mb-2">
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-2 border-b border-slate-50 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-400 uppercase tracking-tighter">From Name:</span>
                                <Select value={contactActionEmailConfigId} onValueChange={setContactActionEmailConfigId}>
                                    <SelectTrigger className="h-auto p-0 border-none shadow-none bg-transparent font-bold text-slate-700 focus:ring-0 text-xs">
                                        <SelectValue placeholder="Select Name" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                        <SelectItem value="default" className="text-xs font-bold leading-none italic text-muted-foreground">Default (System Settings)</SelectItem>
                                        {smtpConfigs?.map((config: any) => (
                                            <SelectItem key={config.id} value={config.id} className="text-xs font-bold leading-none">{config.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-400 uppercase tracking-tighter">From email:</span>
                                <span className="font-bold text-slate-700">{selectedSmtpConfig?.from || selectedSmtpConfig?.user || 'Select Provider'}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400 w-6">To:</span>
                                <div className="flex items-center gap-1.5 bg-slate-100/80 px-1.5 py-0.5 rounded-full border border-slate-200/50">
                                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
                                        {getInitials(recipientLabel)}
                                    </div>
                                    <span className="text-xs font-bold text-slate-700">{recipientLabel}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 py-1.5 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-400 w-6 shrink-0">Subject:</span>
                            <Input
                                className="border-none shadow-none h-6 p-0 text-xs font-bold text-slate-700 focus-visible:ring-0 placeholder:text-slate-300"
                                placeholder="Subject line..."
                                value={contactActionSubject}
                                onChange={(e) => setContactActionSubject(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="min-h-[100px] relative group">
                    <Textarea
                        placeholder="Type a message..."
                        className="min-h-[100px] w-full border-none shadow-none resize-none px-0 text-sm font-medium text-slate-600 focus-visible:ring-0 placeholder:text-slate-300 placeholder:font-normal no-scrollbar"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 py-2 border-t border-slate-50 mt-1">
                            {attachments.map((file, i) => (
                                <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md group/file hover:border-primary/30 transition-all">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate max-w-[100px]">{file.name}</span>
                                    <button onClick={() => removeAttachment(i)} className="text-slate-300 hover:text-destructive group-hover/file:text-slate-500 transition-colors">
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-0.5">
                    <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileChange} />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all">
                        <Type className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all">
                        <Paperclip className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all">
                        <Link className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all">
                        <ImageIcon className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all">
                        <Code className="h-3.5 w-3.5" />
                    </Button>
                    <div className="h-3 w-[1px] bg-slate-200 mx-0.5" />
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">{newMessage.trim().split(/\s+/).filter(Boolean).length} words</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setNewMessage(''); setAttachments([]); }}
                        className="text-xs font-bold uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 rounded-lg h-8 transition-all"
                    >
                        Clear
                    </Button>
                    <Button
                        disabled={isUploading || isSending || (!newMessage.trim() && attachments.length === 0)}
                        onClick={onSend}
                        className="h-10 px-6 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 rounded-xl gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/95"
                    >
                        {(isUploading || isSending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        {isUploading ? 'Uploading...' : 'Send'}
                    </Button>
                </div>
            </div>
        </div>
    );

    const ChatTimeline = ({ logs, isLoading }: { logs: any[]; isLoading: boolean }) => (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
            <div className="flex justify-center mb-2">
                <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-widest px-3 py-0.5">Timeline Start</Badge>
            </div>
            <div className="space-y-6 relative">
                <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-border/40" />
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20 opacity-40">
                        <Mail className="h-12 w-12 mx-auto mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest">No history found</p>
                    </div>
                ) : (
                    [...logs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((log: any) => {
                        const isExpanded = expandedLogs.has(log.id);
                        return (
                            <div key={log.id} className="relative pl-10">
                                <div className={`absolute left-1.5 top-0 w-3 h-3 rounded-full ring-4 ring-background ${log.type === 'EMAIL' ? 'bg-indigo-500' : log.type === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-primary'}`} />
                                <div
                                    className="bg-card p-3 rounded-xl border shadow-sm space-y-1.5 hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={(e) => toggleLog(log.id, e)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${log.type === 'EMAIL' ? 'text-indigo-600' : log.type === 'WHATSAPP' ? 'text-emerald-600' : 'text-primary'}`}>
                                                {log.type}{log.subject ? ` - ${log.subject}` : ''}
                                            </span>
                                            {log.status === 'FAILED' && (
                                                <Badge variant="destructive" className="text-[8px] h-3 px-1 leading-none py-0">FAILED</Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[9px] font-medium text-muted-foreground whitespace-nowrap">
                                                {format(new Date(log.createdAt), 'MMM d, HH:mm aaa')}
                                            </span>
                                            <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    {isExpanded ? (
                                        <>
                                            <div className="text-sm prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: log.content }} />
                                            {log.fileLinks && Array.isArray(log.fileLinks) && (log.fileLinks as any[]).length > 0 && (
                                                <div className="flex flex-wrap gap-2 pt-1.5">
                                                    {(log.fileLinks as any[]).map((fl: any, idx: number) => (
                                                        <a key={idx} href={fl.url} target="_blank" rel="noopener noreferrer"
                                                            className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-primary/40 hover:bg-primary/5 px-2 py-0.5 rounded transition-all group/att"
                                                            onClick={(e) => e.stopPropagation()}>
                                                            <Paperclip className="h-2.5 w-2.5 text-slate-400 group-hover/att:text-primary transition-colors" />
                                                            <span className="text-[10px] font-bold text-slate-600 group-hover/att:text-primary transition-colors truncate max-w-[120px]">{fl.name}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                            {log.content.replace(new RegExp('<[^>]*>?', 'gm'), ' ')}
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between pt-1.5 border-t border-dashed overflow-hidden">
                                        <span className="text-[10px] text-muted-foreground italic truncate">
                                            {log.sender?.id === undefined ? 'You' : `Sent by ${log.sender?.name || 'System'}`}
                                        </span>
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0 px-1">{log.status}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
            <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
                {/* Top Tab Bar */}
                <div className="h-14 bg-card border-b flex items-center px-6 shrink-0 z-20">
                    <Tabs
                        value={activeTab === 'email' || activeTab === 'messages' ? 'inbox' : activeTab}
                        onValueChange={(val) => {
                            if (val === 'inbox') {
                                router.push('?tab=email');
                            } else {
                                router.push(`?tab=${val}`);
                            }
                        }}
                    >
                        <TabsList className="bg-transparent h-14 p-0 gap-8">
                            <TabsTrigger
                                value="inbox"
                                className={`h-14 rounded-none border-b-2 shadow-none px-4 text-sm font-medium transition-all ${(activeTab === 'email' || activeTab === 'messages')
                                    ? 'border-primary text-primary bg-transparent'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Inbox
                            </TabsTrigger>
                            <TabsTrigger
                                value="contacts"
                                className={`h-14 rounded-none border-b-2 shadow-none px-4 text-sm font-medium transition-all ${activeTab === 'contacts'
                                    ? 'border-primary text-primary bg-transparent'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                Contacts
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* ── INBOX TAB ── */}
                {(activeTab === 'email' || activeTab === 'messages') ? (
                    <div className="flex-1 flex overflow-hidden">
                        {/* Conversation List Sidebar */}
                        <div className="w-80 border-r bg-card flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
                            <div className="p-4 border-b space-y-4">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                    <Input
                                        placeholder="Search inbox..."
                                        className="h-10 pl-10 bg-muted/30 border-none focus-visible:ring-1 transition-all"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                    />
                                </div>
                                <Tabs value={activeTab === 'email' ? 'email' : 'messages'} onValueChange={(v) => router.push(`?tab=${v}`)} className="w-full">
                                    <TabsList className="w-full h-8 bg-muted/30 p-0.5 border-none">
                                        <TabsTrigger value="email" className="flex-1 text-[10px] font-bold uppercase tracking-wider h-7">Email</TabsTrigger>
                                        <TabsTrigger value="messages" className="flex-1 text-[10px] font-bold uppercase tracking-wider h-7">Messages</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            {conversations?.length || 0} Conversations
                                        </span>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[10px] font-bold uppercase gap-1"
                                        onClick={() => openCompose(activeTab === 'email' ? 'EMAIL' : 'MESSAGE')}
                                    >
                                        <Plus className="h-3 w-3" /> New
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {isConversationsLoading ? (
                                    Array(6).fill(0).map((_, i) => (
                                        <div key={i} className="p-4 border-b animate-pulse flex gap-3">
                                            <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-4 bg-muted rounded w-1/2" />
                                                <div className="h-3 bg-muted rounded w-3/4" />
                                            </div>
                                        </div>
                                    ))
                                ) : conversations?.length === 0 ? (
                                    <div className="p-10 text-center space-y-3 opacity-40">
                                        <Mail className="h-12 w-12 mx-auto" />
                                        <p className="text-xs font-bold uppercase tracking-widest">No conversations yet</p>
                                        <p className="text-[10px] text-muted-foreground">Go to Contacts to start a new conversation</p>
                                    </div>
                                ) : (
                                    conversations?.map((conv: any) => (
                                        <button
                                            key={conv.id}
                                            onClick={() => {
                                                setSelectedRecipient(conv.recipient);
                                                setContactActionTab('EMAIL');
                                                setNewMessage('');
                                            }}
                                            className={`w-full p-4 border-b flex gap-3 text-left transition-all hover:bg-muted/30 group relative ${selectedRecipient === conv.recipient ? 'bg-primary/5' : ''}`}
                                        >
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary transition-all duration-300 ${selectedRecipient === conv.recipient ? 'opacity-100' : 'opacity-0'}`} />
                                            <div className="h-11 w-11 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shadow-sm shrink-0 uppercase">
                                                {getInitials(conv.adminName ?? conv.recipient)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-sm truncate tracking-tight">{conv.adminName ?? conv.recipient}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground/60">{formatDate(new Date(conv.createdAt))}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-1 group-hover:text-foreground/70 transition-colors leading-tight">
                                                    {conv.subject || conv.content?.substring(0, 50)}...
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Inbox Chat Panel */}
                        <div className="flex-1 flex overflow-hidden bg-white/40 backdrop-blur-sm">
                            {selectedRecipient ? (
                                <div className="flex-1 flex flex-col border-r bg-muted/5 overflow-hidden">
                                    {/* Action Type Tabs */}
                                    <div className="bg-white border-b border-slate-200 z-10 flex flex-col shrink-0">
                                        <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100 shrink-0">
                                            <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden scrollbar-hide">
                                                {['EMAIL', 'SMS', 'WHATSAPP'].map((tab) => (
                                                    <button
                                                        key={tab}
                                                        onClick={() => setContactActionTab(prev => prev === tab ? null : tab as any)}
                                                        className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all relative ${contactActionTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        {tab}
                                                        {contactActionTab === tab && (
                                                            <span className="absolute bottom-[-12px] left-0 right-0 h-[3px] bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(var(--primary),0.3)]" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                            <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                                <Maximize2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>

                                    <ChatTimeline logs={chatHistory ?? []} isLoading={isChatLoading} />

                                    {contactActionTab && (
                                        <ComposeBox
                                            onSend={() => {
                                                if (contactActionTab === 'EMAIL') {
                                                    sendEmailMutation.mutate({
                                                        to: selectedRecipient!,
                                                        subject: contactActionSubject || `Message to ${selectedRecipient}`,
                                                        content: newMessage,
                                                        configId: contactActionEmailConfigId === 'default' ? undefined : contactActionEmailConfigId,
                                                    });
                                                } else {
                                                    sendMessageMutation.mutate({
                                                        to: selectedRecipient!,
                                                        content: newMessage,
                                                        type: contactActionTab as 'SMS' | 'WHATSAPP',
                                                    });
                                                }
                                                setNewMessage('');
                                                setContactActionSubject('');
                                            }}
                                            recipientLabel={selectedRecipient}
                                            showSubject={contactActionTab === 'EMAIL'}
                                            isSending={sendEmailMutation.isPending || sendMessageMutation.isPending}
                                            isUploading={isUploadingAttachments}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-40">
                                    <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                                        <Mail className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-400">Select a conversation</h3>
                                    <p className="text-xs font-bold text-slate-300 max-w-[200px] mt-2">Choose a conversation from the sidebar or go to Contacts to start a new one.</p>
                                </div>
                            )}
                        </div>
                    </div>

                /* ── CONTACTS TAB ── */
                ) : activeTab === 'contacts' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {isDetailView && selectedAdminContact ? (
                            // Admin Contact Detail View
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="h-16 bg-card border-b flex items-center px-6 justify-between shrink-0 shadow-sm z-10">
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => { setIsDetailView(false); setContactActionTab(null); }}
                                            className="h-9 w-9 p-0 rounded-full"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {getInitials(selectedAdminContact.name)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight">{selectedAdminContact.name ?? selectedAdminContact.email}</h3>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Company Contact</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-row overflow-hidden">
                                    {/* Left: Admin Info */}
                                    <div className="w-64 border-r bg-card overflow-y-auto p-4 hidden lg:block">
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Contact Type</Label>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Shield className="h-3 w-3 text-primary" />
                                                    <span className="text-xs font-semibold">Company Contact</span>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Email</Label>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <Mail className="h-3 w-3 text-primary" />
                                                    <span className="text-xs font-semibold truncate" title={selectedAdminContact.email}>{selectedAdminContact.email}</span>
                                                </div>
                                            </div>
                                            {selectedAdminContact.phone && (
                                                <div>
                                                    <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Phone</Label>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Phone className="h-3 w-3 text-primary" />
                                                        <span className="text-xs font-semibold">{selectedAdminContact.phone}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Middle: Chat + Compose */}
                                    <div className="flex-1 flex flex-col border-r bg-muted/5 overflow-hidden">
                                        <div className="bg-white border-b border-slate-200 z-10 flex flex-col shrink-0">
                                            <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100 shrink-0">
                                                <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden scrollbar-hide">
                                                    {['EMAIL', 'SMS', 'WHATSAPP'].map((tab) => (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setContactActionTab(prev => prev === tab ? null : tab as any)}
                                                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all relative ${contactActionTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
                                                        >
                                                            {tab}
                                                            {contactActionTab === tab && (
                                                                <span className="absolute bottom-[-12px] left-0 right-0 h-[3px] bg-primary rounded-t-full" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                                    <Maximize2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>

                                        <ChatTimeline logs={adminContactHistory ?? []} isLoading={false} />

                                        {contactActionTab && (
                                            <ComposeBox
                                                onSend={handleContactActionSubmit}
                                                recipientLabel={contactActionTab === 'EMAIL'
                                                    ? selectedAdminContact.email
                                                    : (selectedAdminContact.phone ?? selectedAdminContact.email)}
                                                showSubject={contactActionTab === 'EMAIL'}
                                                isSending={sendEmailMutation.isPending || sendMessageMutation.isPending}
                                                isUploading={isUploadingAttachments}
                                            />
                                        )}
                                    </div>

                                    {/* Right: Activity */}
                                    <div className="w-[160px] bg-card overflow-y-auto hidden xl:block border-l shrink-0">
                                        <div className="p-3 border-b bg-muted/5">
                                            <h4 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/80">Activity</h4>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Company Contact
                            <div className="flex-1 flex flex-col overflow-hidden">
                                <div className="h-20 bg-card border-b flex items-center px-6 shrink-0 shadow-sm z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <Shield className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-lg leading-tight">Company Contact</h3>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider mt-1">
                                                Official contact for this organisation
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-auto bg-card p-6">
                                    {isCompanyLoading ? (
                                        <div className="h-24 bg-muted/40 animate-pulse rounded-xl w-full max-w-md" />
                                    ) : !companyContact ? (
                                        <div className="flex flex-col items-center gap-4 py-20 opacity-40">
                                            <Users className="h-12 w-12 text-muted-foreground/20" />
                                            <p className="font-bold text-lg">No company contact set up yet</p>
                                            <p className="text-sm text-muted-foreground">The organisation has not added a company email or phone number yet.</p>
                                        </div>
                                    ) : (
                                        <div
                                            className="max-w-md border rounded-xl p-5 bg-card shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                                            onClick={() => {
                                                setSelectedAdminContact(companyContact);
                                                setIsDetailView(true);
                                                setContactActionTab('EMAIL');
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shadow-sm shrink-0 text-lg">
                                                    {getInitials(companyContact.name)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-base tracking-tight">{companyContact.name}</p>
                                                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary font-bold text-[10px] py-0.5 mt-1">
                                                        Company
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="mt-4 space-y-2 border-t pt-4">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Mail className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                    <span className="truncate">{companyContact.email}</span>
                                                </div>
                                                {companyContact.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Phone className="h-3.5 w-3.5 shrink-0 text-primary" />
                                                        <span>{companyContact.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-40">
                        <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                            <Mail className="h-10 w-10 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-black uppercase tracking-widest text-slate-400">Invalid Selection</h3>
                    </div>
                )}
            </div>

            {/* Compose Modal */}
            <Dialog open={isComposeOpen} onClose={() => setIsComposeOpen(false)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
                    <DialogHeader className="bg-primary/5 py-6 px-8 flex flex-row items-center gap-4">
                        <div className="p-3 bg-primary/20 text-primary rounded-2xl">
                            {composeType === 'EMAIL' ? <Mail className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
                        </div>
                        <div className="flex-1">
                            <DialogTitle className="text-2xl font-black tracking-tight leading-none text-foreground">
                                New {composeType === 'EMAIL' ? 'Broadcast' : 'Direct Message'}
                            </DialogTitle>
                            <DialogDescription className="text-xs uppercase font-bold tracking-widest text-primary/60 mt-1">
                                Outbound Communication · Admin Team Only
                            </DialogDescription>
                        </div>
                        <Tabs value={composeType} onValueChange={(v: any) => setComposeType(v)} className="shrink-0">
                            <TabsList className="h-8">
                                <TabsTrigger value="EMAIL" className="text-xs h-7 px-3">Email</TabsTrigger>
                                <TabsTrigger value="MESSAGE" className="text-xs h-7 px-3">Message</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </DialogHeader>
                    <form onSubmit={handleComposeSubmit}>
                        <div className="p-8 space-y-6 bg-card">
                            {/* Company Recipient */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recipient</Label>
                                <div className="h-12 pl-4 rounded-xl bg-muted/20 border border-border/50 flex items-center gap-3">
                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                        {getInitials(companyContact?.name)}
                                    </div>
                                    <span className="text-sm font-semibold text-foreground">
                                        {companyContact?.name || 'Company'}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate">
                                        {composeType === 'EMAIL'
                                            ? (companyContact?.email || 'No company email set')
                                            : (companyContact?.phone || 'No company phone set')}
                                    </span>
                                </div>
                            </div>

                            {composeType === 'EMAIL' ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sender Profile</Label>
                                        <Select
                                            value={emailForm.configId || 'default'}
                                            onValueChange={v => setEmailForm({ ...emailForm, configId: v })}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/50 focus:ring-1">
                                                <SelectValue placeholder="Use Default SMTP" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default">Default System Config</SelectItem>
                                                {smtpConfigs?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recipient Email</Label>
                                        <div className="h-12 pl-4 rounded-xl bg-muted/20 border border-border/50 flex items-center text-sm font-medium text-muted-foreground">
                                            {emailForm.to || 'Select a recipient above'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Subject</Label>
                                        <Input
                                            placeholder="Subject of your message..."
                                            className="h-12 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all"
                                            value={emailForm.subject}
                                            onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Message</Label>
                                        <Textarea
                                            placeholder="Craft your message here..."
                                            className="min-h-[160px] rounded-2xl bg-muted/20 border-border/50 p-4 focus:bg-background transition-all"
                                            value={emailForm.content}
                                            onChange={e => setEmailForm({ ...emailForm, content: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recipient Phone</Label>
                                        <div className="h-12 pl-4 rounded-xl bg-muted/20 border border-border/50 flex items-center text-sm font-medium text-muted-foreground">
                                            {messageForm.to || 'Select a recipient above'}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Message Body</Label>
                                        <Textarea
                                            placeholder="Type your message..."
                                            className="min-h-[140px] rounded-2xl bg-muted/20 border-border/50 p-4 text-base"
                                            value={messageForm.content}
                                            onChange={e => setMessageForm({ ...messageForm, content: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex gap-3">
                                        <div className="text-emerald-500 animate-pulse"><AlertCircle className="h-5 w-5" /></div>
                                        <p className="text-xs text-emerald-700/80 leading-relaxed font-medium">Messages are delivered via your default Bird configuration.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="bg-muted/10 p-6">
                            <Button type="button" variant="ghost" className="h-12 px-6 font-bold text-muted-foreground hover:bg-muted/50 rounded-xl" onClick={() => setIsComposeOpen(false)}>Discard</Button>
                            <Button
                                type="submit"
                                disabled={sendEmailMutation.isPending || sendMessageMutation.isPending || !companyContact}
                                className="h-12 px-8 font-black rounded-xl gap-2 shadow-xl shadow-primary/20 hover:scale-[1.03] transition-all"
                            >
                                {(sendEmailMutation.isPending || sendMessageMutation.isPending) ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                                Transmit Now
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
}
