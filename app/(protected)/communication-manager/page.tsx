'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/client/trpc';
import { format, isToday, isYesterday } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    Search,
    Mail,
    MessageSquare,
    Phone,
    RefreshCw,
    Plus,
    Maximize2,
    Type,
    Image as ImageIcon,
    Code,
    MoreHorizontal,
    RotateCcw,
    X,
    Paperclip,
    Smile,
    Send,
    Link,
    Clock,
    History,
    CheckCircle2,
    Check,
    MoreVertical,
    ChevronLeft,
    PhoneCall,
    Video,
    Users,
    Download,
    Settings,
    Trash2,
    SendHorizontal,
    User,
    AlertCircle,
    List,
    ChevronDown,
    Star,
    FileText,
} from 'lucide-react';
import { MessageType, MessageStatus, Contact } from '@prisma/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BuildingOfficeIcon } from '@/components/ui/icons';
import { ContactFormModal } from '@/components/contacts/contact-form-modal';
import { ConfirmModal } from '@/components/common/confirm-modal';

export default function CommunicationManagerPage() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const utils = trpc.useUtils();
    const scrollRef = useRef<HTMLDivElement>(null);

    // UI State
    const activeTab = searchParams.get('tab') || 'contacts';
    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
    const [emailFolder, setEmailFolder] = useState<'SENT' | 'TRASH'>('SENT');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isDetailView, setIsDetailView] = useState(false);
    const [contactActionTab, setContactActionTab] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | 'COMMENT' | null>(null);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [contactTypeFilter, setContactTypeFilter] = useState<'CLIENT' | 'STAFF' | 'ALL' | 'TEAM'>('CLIENT');
    const [inboxContactType, setInboxContactType] = useState<'ALL' | 'STAFF' | 'CLIENT' | 'CLIENT'>('ALL');

    // Compose State
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [composeType, setComposeType] = useState<'EMAIL' | 'MESSAGE'>('EMAIL');
    const [emailForm, setEmailForm] = useState({
        to: '',
        subject: '',
        content: '',
        configId: ''
    });
    const [messageForm, setMessageForm] = useState({
        to: '',
        content: '',
        configId: ''
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
    const [contactActionEmailConfigId, setContactActionEmailConfigId] = useState('default');
    const [contactActionMsgConfigId, setContactActionMsgConfigId] = useState('default');
    const [contactActionSubject, setContactActionSubject] = useState('');
    const [newMessage, setNewMessage] = useState('');
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
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

    // Contact Modal State
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<string | null>(null);

    // Queries
    const { data: logsData, isLoading: isLogsLoading, refetch: refetchLogs } = trpc.communication.getLogs.useQuery({
        page,
        limit: 50,
        search: search || undefined,
        type: activeTab === 'email' ? 'EMAIL' : undefined,
        showTrashed: emailFolder === 'TRASH',
    });

    const { data: conversations, isLoading: isConversationsLoading } = trpc.communication.getConversations.useQuery({
        type: activeTab === 'email' ? 'EMAIL' : 'MESSAGE',
        contactType: inboxContactType
    }, {
        enabled: activeTab === 'email' || activeTab === 'messages'
    });

    const { data: chatHistory, isLoading: isChatLoading, refetch: refetchChatHistory } = trpc.communication.getChatHistory.useQuery(
        { recipient: selectedRecipient!, type: activeTab === 'email' ? 'EMAIL' : 'MESSAGE' },
        { enabled: (activeTab === 'email' || activeTab === 'messages') && !!selectedRecipient }
    );

    const { data: smtpConfigs } = trpc.settings.listSmtpConfigs.useQuery();
    const { data: messagingConfigs } = trpc.settings.listMessagingConfigs.useQuery();

    const { data: contactsData, isLoading: isContactsLoading, refetch: refetchContacts } = trpc.contacts.getAll.useQuery({
        page,
        limit: 20,
        search: search || undefined,
        contactType: contactTypeFilter === 'ALL' ? undefined : contactTypeFilter,
        sortBy: 'firstName',
        sortOrder: 'asc'
    }, {
        enabled: activeTab === 'contacts' && !isDetailView
    });

    const { data: contactLogs, refetch: refetchContactLogs } = trpc.communication.getLogs.useQuery({
        search: selectedContact?.email || selectedContact?.phone || undefined,
        limit: 100,
    }, {
        enabled: !!selectedContact && activeTab === 'contacts' && isDetailView
    });

    // Refetch contact logs when selected contact changes
    useEffect(() => {
        if (selectedContact && isDetailView) {
            refetchContactLogs();
        }
    }, [selectedContact, isDetailView, refetchContactLogs]);

    // Mutations
    const createContext = trpc.useUtils();

    const createContactMutation = trpc.contacts.create.useMutation({
        onSuccess: () => {
            toast({ title: 'Contact created successfully' });
            setIsContactModalOpen(false);
            refetchContacts();
        },
        onError: (error) => {
            toast({ title: 'Failed to create contact', description: error.message, variant: 'error' });
        }
    });

    const updateContactMutation = trpc.contacts.update.useMutation({
        onSuccess: (data) => {
            toast({ title: 'Contact updated successfully' });
            setIsContactModalOpen(false);
            setContactToEdit(null);
            if (selectedContact && selectedContact.id === data.id) {
                setSelectedContact(prev => prev ? { ...prev, internalNotes: (data as any).internalNotes } : null);
            }
            refetchContacts();
        },
        onError: (error) => {
            toast({ title: 'Failed to update contact', description: error.message, variant: 'error' });
        }
    });

    const updateContactNotesMutation = trpc.contacts.updateNotes.useMutation({
        onSuccess: (data, variables) => {
            toast({ title: 'Comment saved successfully' });
            setSelectedContact(prev => prev && prev.id === data.id ? { ...prev, internalNotes: variables.internalNotes ?? null } : prev);
            refetchContacts();
        },
        onError: (error) => {
            toast({ title: 'Failed to save comment', description: error.message, variant: 'error' });
        }
    });

    const deleteContactMutation = trpc.contacts.delete.useMutation({
        onSuccess: () => {
            toast({ title: 'Contact deleted successfully' });
            setIsDeleteDialogOpen(false);
            setContactToDelete(null);
            if (selectedContact && selectedContact.id === contactToDelete) {
                setSelectedContact(null);
                setIsDetailView(false);
            }
            refetchContacts();
        },
        onError: (error) => {
            toast({ title: 'Failed to delete contact', description: error.message, variant: 'error' });
        }
    });
    const sendEmailMutation = trpc.communication.sendEmailAdHoc.useMutation({
        onSuccess: () => {
            toast({ title: 'Email sent successfully' });
            setIsComposeOpen(false);
            setEmailForm({ to: '', subject: '', content: '', configId: '' });
            utils.communication.getLogs.invalidate();
            refetchContactLogs();
        },
        onError: (error) => {
            toast({ title: 'Failed to send email', description: error.message, variant: 'error' });
        }
    });

    const sendMessageMutation = trpc.communication.sendMessageAdHoc.useMutation({
        onSuccess: () => {
            if (!isComposeOpen) {
                // If it was from chat input
                setNewMessage('');
            } else {
                toast({ title: 'Message sent successfully' });
                setIsComposeOpen(false);
                setMessageForm({ to: '', content: '', configId: '' });
            }
            utils.communication.getChatHistory.invalidate();
            utils.communication.getConversations.invalidate();
            utils.communication.getLogs.invalidate();
            refetchContactLogs();
        },
        onError: (error) => {
            toast({ title: 'Failed to send message', description: error.message, variant: 'error' });
        }
    });

    const deleteLogsPermanentlyMutation = trpc.communication.deleteLogsPermanently.useMutation({
        onSuccess: () => {
            toast({ title: 'Communications deleted permanently' });
            utils.communication.getLogs.invalidate();
        },
        onError: (error) => {
            toast({ title: 'Failed to delete permanently', description: error.message, variant: 'error' });
        }
    });

    const trashLogsMutation = trpc.communication.trashLogs.useMutation({
        onSuccess: () => {
            toast({ title: 'Moved to trash' });
            utils.communication.getLogs.invalidate();
        },
        onError: (error) => {
            toast({ title: 'Failed to move to trash', description: error.message, variant: 'error' });
        }
    });

    const restoreLogsMutation = trpc.communication.restoreLogs.useMutation({
        onSuccess: () => {
            toast({ title: 'Restored from trash' });
            utils.communication.getLogs.invalidate();
        },
        onError: (error) => {
            toast({ title: 'Failed to restore', description: error.message, variant: 'error' });
        }
    });

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory, activeTab]);

    // Helpers
    const getInitials = (name: string | null) => {
        if (!name) return '??';
        return name
            .split(/[.@ ]/)
            .filter(Boolean)
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const handleContactSubmit = (data: any) => {
        if (contactToEdit) {
            updateContactMutation.mutate({ id: contactToEdit.id, ...data });
        } else {
            createContactMutation.mutate(data);
        }
    };

    const formatDate = (date: Date) => {
        if (isToday(date)) return format(date, 'HH:mm');
        if (isYesterday(date)) return 'Yesterday';
        return format(date, 'dd/MM/yyyy');
    };

    const handleSendMessage = () => {
        if (!selectedRecipient || !newMessage.trim()) return;

        sendMessageMutation.mutate({
            to: selectedRecipient,
            content: newMessage,
        });
    };

    const handleContactActionSubmit = async () => {
        if (!selectedContact || (!newMessage.trim() && attachments.length === 0)) return;

        // 1. Upload attachments first
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
                    })
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

        const content = newMessage;

        // 2. Send the message
        if (contactActionTab === 'EMAIL') {
            sendEmailMutation.mutate({
                to: selectedContact.email,
                subject: contactActionSubject || `Message for ${selectedContact.firstName}`,
                content: content,
                configId: contactActionEmailConfigId === 'default' ? undefined : contactActionEmailConfigId,
                fileLinks: uploadedFileLinks.length > 0 ? uploadedFileLinks : undefined,
            });
        } else if (contactActionTab === 'SMS' || contactActionTab === 'WHATSAPP') {
            sendMessageMutation.mutate({
                to: selectedContact.phone,
                content: content,
                type: contactActionTab as 'SMS' | 'WHATSAPP',
                configId: contactActionMsgConfigId === 'default' ? undefined : contactActionMsgConfigId
            });
        } else if (contactActionTab === 'COMMENT') {
            updateContactNotesMutation.mutate({
                id: selectedContact.id,
                internalNotes: content,
                contactType: selectedContact.contactType,
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

    const selectedSmtpConfig = smtpConfigs?.find((c: any) => c.id === contactActionEmailConfigId) ||
        messagingConfigs?.find((c: any) => c.id === contactActionEmailConfigId && c.provider === 'MAILGUN') ||
        smtpConfigs?.find((c: any) => c.isDefault) ||
        messagingConfigs?.find((c: any) => c.provider === 'MAILGUN' && c.isDefault);

    const selectedMsgConfig = messagingConfigs?.find((c: any) => c.id === contactActionMsgConfigId) ||
        messagingConfigs?.find((c: any) => c.isDefault);

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

    const handleComposeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (composeType === 'EMAIL') {
            sendEmailMutation.mutate({
                ...emailForm,
                configId: emailForm.configId === 'default' || !emailForm.configId ? undefined : emailForm.configId
            });
        } else {
            sendMessageMutation.mutate({
                ...messageForm,
                configId: messageForm.configId === 'default' || !messageForm.configId ? undefined : messageForm.configId
            });
        }
    };

    // Sub-components
    const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: any) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${active
                ? 'bg-primary/10 text-primary border-r-2 border-primary shadow-sm'
                : 'text-muted-foreground hover:bg-muted/50'
                }`}
        >
            <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
            <span className="flex-1 text-left">{label}</span>
            {badge && badge !== '0' && (
                <Badge variant="primary" size="sm" dot pulse={active}>
                    {badge}
                </Badge>
            )}
        </button>
    );

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-background">
            {/* Folder / Category Sidebar */}
            {/* <div className="w-[200px] border-r bg-card hidden lg:flex flex-col shrink-0">
                <div className="p-4 flex flex-col gap-4">
                    <Button
                        className="w-full gap-2 rounded-xl h-11 font-bold shadow-lg shadow-primary/20"
                        onClick={() => { setComposeType('EMAIL'); setIsComposeOpen(true); }}
                    >
                        <Plus className="h-5 w-5" /> New
                    </Button>

                    <div className="space-y-6 mt-4">
                        <div className="space-y-1">
                            <h4 className="px-4 text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2 flex items-center justify-between group cursor-pointer">
                                Team Inbox <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h4>
                            <SidebarItem icon={List} label="Unread" active={false} />
                            <SidebarItem icon={Clock} label="Recents" active={false} />
                            <SidebarItem icon={Plus} label="Starred" active={false} />
                            <SidebarItem icon={Send} label="All" active={activeTab === 'email'} onClick={() => router.push('?tab=email')} />
                        </div>

                        <div className="space-y-1">
                            <h4 className="px-4 text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2 flex items-center justify-between group cursor-pointer">
                                My Inbox <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h4>
                            <SidebarItem icon={User} label="Assigned to me" active={false} />
                            <SidebarItem icon={List} label="Unread" active={false} />
                        </div>

                        <div className="space-y-1">
                            <h4 className="px-4 text-[10px] font-black tracking-widest uppercase text-slate-400 mb-2 flex items-center justify-between group cursor-pointer">
                                Internal Chat <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h4>
                            <SidebarItem icon={MessageSquare} label="General" active={activeTab === 'messages'} onClick={() => router.push('?tab=messages')} />
                            <SidebarItem icon={Users} label="Team" active={false} />
                        </div>
                    </div>
                </div>
            </div> */}
            <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
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
                                className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary shadow-none px-0 font-bold uppercase tracking-widest text-[11px] transition-all"
                            >
                                Inbox
                            </TabsTrigger>
                            <TabsTrigger
                                value="contacts"
                                className="h-14 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary shadow-none px-0 font-bold uppercase tracking-widest text-[11px] transition-all"
                            >
                                Contact
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
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
                                <Tabs value={inboxContactType} onValueChange={(v: any) => setInboxContactType(v)} className="w-full">
                                    <TabsList className="w-full h-8 bg-muted/30 p-0.5 border-none">
                                        <TabsTrigger value="ALL" className="flex-1 text-[10px] font-bold uppercase tracking-wider h-7">All</TabsTrigger>
                                        <TabsTrigger value="CLIENT" className="flex-1 text-[10px] font-bold uppercase tracking-wider h-7">Clients</TabsTrigger>
                                        <TabsTrigger value="STAFF" className="flex-1 text-[10px] font-bold uppercase tracking-wider h-7">Talent</TabsTrigger>
                                        <TabsTrigger value="TEAM" className="flex-1 text-[10px] font-bold uppercase tracking-wider h-7">Staff</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-4 rounded border border-muted-foreground/30 flex items-center justify-center">
                                            <input type="checkbox" className="h-3 w-3 accent-primary" />
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                            {conversations?.length || 0} Results
                                        </span>
                                    </div>
                                    <button className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors">
                                        Latest-All <ChevronDown className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {isConversationsLoading ? (
                                    Array(8).fill(0).map((_, i) => (
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
                                        <p className="text-xs font-bold uppercase tracking-widest">No conversations</p>
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
                                                {getInitials(conv.recipient)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="font-bold text-sm truncate tracking-tight">{conv.recipient}</span>
                                                    <span className="text-[10px] font-bold text-muted-foreground/60">{formatDate(new Date(conv.createdAt))}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-1 group-hover:text-foreground/70 transition-colors leading-tight">
                                                    {conv.subject || conv.content.substring(0, 50)}...
                                                </p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Email Body - Refactored to match Contact Detail Body Style */}
                        <div className="flex-1 flex overflow-hidden bg-white/40 backdrop-blur-sm">
                            {selectedRecipient ? (
                                <>
                                    <div className="flex-1 flex flex-col border-r bg-muted/5 overflow-hidden">
                                        {/* Action Bar - NOW ON TOP */}
                                        <div className="bg-white border-b border-slate-200 z-10 flex flex-col shrink-0">
                                            {/* Action Header Tabs */}
                                            <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100 shrink-0">
                                                <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden scrollbar-hide">
                                                    {['EMAIL', 'SMS', 'WHATSAPP'].map((tab) => (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setContactActionTab(prev => prev === tab ? null : tab as any)}
                                                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all relative ${contactActionTab === tab
                                                                ? 'text-primary'
                                                                : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                        >
                                                            {tab}
                                                            {contactActionTab === tab && (
                                                                <span className="absolute bottom-[-12px] left-0 right-0 h-[3px] bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(var(--primary),0.3)]" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setContactActionTab(prev => prev === 'COMMENT' ? null : 'COMMENT')}
                                                        className={`text-xs font-bold uppercase tracking-widest transition-all ${contactActionTab === 'COMMENT' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                                                            }`}
                                                    >
                                                        Internal Comment
                                                    </button>
                                                    <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                                        <Maximize2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Chat Timeline Area */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
                                            <div className="flex justify-center mb-2">
                                                <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-widest px-3 py-0.5">Timeline Start</Badge>
                                            </div>
                                            <div className="space-y-6 relative">
                                                <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-border/40" />

                                                {isChatLoading ? (
                                                    <div className="flex items-center justify-center py-20">
                                                        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                                                    </div>
                                                ) : chatHistory?.length === 0 ? (
                                                    <div className="text-center py-20 opacity-40">
                                                        <Mail className="h-12 w-12 mx-auto mb-4" />
                                                        <p className="text-xs font-bold uppercase tracking-widest">No history found</p>
                                                    </div>
                                                ) : (
                                                    [...(chatHistory || [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((log: any) => {
                                                        const isExpanded = expandedLogs.has(log.id);
                                                        return (
                                                            <div key={log.id} className="relative pl-10">
                                                                <div className={`absolute left-1.5 top-0 w-3 h-3 rounded-full ring-4 ring-background ${log.type === 'EMAIL' ? 'bg-indigo-500' :
                                                                    log.type === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-primary'
                                                                    }`} />
                                                                <div
                                                                    className="bg-card p-3 rounded-xl border shadow-sm space-y-1.5 hover:shadow-md transition-shadow cursor-pointer"
                                                                    onClick={(e) => toggleLog(log.id, e)}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-[10px] font-bold uppercase tracking-widest ${log.type === 'EMAIL' ? 'text-indigo-600' :
                                                                                log.type === 'WHATSAPP' ? 'text-emerald-600' : 'text-primary'
                                                                                }`}>
                                                                                {log.type} {log.subject ? `- ${log.subject}` : ''}
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
                                                                                        <a
                                                                                            key={idx}
                                                                                            href={fl.url}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-primary/40 hover:bg-primary/5 px-2 py-0.5 rounded transition-all group/att"
                                                                                            onClick={(e) => e.stopPropagation()}
                                                                                        >
                                                                                            <Paperclip className="h-2.5 w-2.5 text-slate-400 group-hover/att:text-primary transition-colors" />
                                                                                            <span className="text-[10px] font-bold text-slate-600 group-hover/att:text-primary transition-colors truncate max-w-[120px]">
                                                                                                {fl.name}
                                                                                            </span>
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
                                                                        <span className="text-[10px] text-muted-foreground italic truncate">Sent by {log.sender?.name || 'System'}</span>
                                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0 px-1">{log.status}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })

                                                )}
                                            </div>
                                        </div>

                                        {/* Action Box Content Area - NOW ON BOTTOM */}
                                        {contactActionTab && (
                                            <div className="bg-white border-t border-slate-200 z-10 flex flex-col shrink-0">
                                                <div className="p-4 flex-1 overflow-y-auto no-scrollbar max-h-[400px] bg-white">
                                                    {contactActionTab === 'EMAIL' && (
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
                                                                            {messagingConfigs?.filter((c: any) => c.provider === 'MAILGUN').map((config: any) => (
                                                                                <SelectItem key={config.id} value={config.id} className="text-xs font-bold leading-none">{config.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-slate-400 uppercase tracking-tighter">From email:</span>
                                                                    <span className="font-bold text-slate-700">{selectedSmtpConfig?.from || selectedSmtpConfig?.user || (selectedSmtpConfig?.provider === 'MAILGUN' ? `test@${selectedSmtpConfig.workspaceId}` : 'Select Provider')}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-slate-400 w-6">To:</span>
                                                                    <div className="flex items-center gap-1.5 bg-slate-100/80 px-1.5 py-0.5 rounded-full border border-slate-200/50 hover:bg-slate-200/50 transition-colors cursor-pointer">
                                                                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm">
                                                                            {getInitials(selectedRecipient)}
                                                                        </div>
                                                                        <span className="text-xs font-bold text-slate-700">{selectedRecipient}</span>
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

                                                        {/* Attachments Preview */}
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

                                                {/* Bottom Toolbar & Action Cluster */}
                                                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                                                    <div className="flex items-center gap-0.5">
                                                        <input
                                                            type="file"
                                                            multiple
                                                            hidden
                                                            ref={fileInputRef}
                                                            onChange={handleFileChange}
                                                        />
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all">
                                                            <Type className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all"
                                                        >
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
                                                        <div className="flex items-center">
                                                            <Button
                                                                disabled={isUploadingAttachments || sendEmailMutation.isPending || sendMessageMutation.isPending || (!newMessage.trim() && attachments.length === 0)}
                                                                onClick={() => {
                                                                    if (contactActionTab === 'EMAIL') {
                                                                        sendEmailMutation.mutate({
                                                                            to: selectedRecipient!,
                                                                            subject: contactActionSubject || `Message for ${selectedRecipient}`,
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
                                                                className="h-10 px-6 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20 rounded-l-xl rounded-r-none gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-primary/95"
                                                            >
                                                                {(isUploadingAttachments || sendEmailMutation.isPending || sendMessageMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                                                {isUploadingAttachments ? 'Uploading...' : 'Send'}
                                                            </Button>
                                                            <div className="h-10 w-[1px] bg-white/20" />
                                                            <Button
                                                                className="h-10 w-10 p-0 rounded-r-xl rounded-l-none border-l border-white/10 transition-all hover:bg-primary/90"
                                                                variant="default"
                                                                onClick={() => refetchChatHistory()}
                                                            >
                                                                <History className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Sidebar: Activity */}
                                    <div className="w-[160px] bg-card overflow-y-auto hidden xl:block border-l shrink-0">
                                        <div className="p-3 border-b bg-muted/5">
                                            <h4 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/80">Activity</h4>
                                        </div>
                                        <div className="p-3 space-y-4">
                                            <div className="flex gap-2">
                                                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold leading-tight">Account Verified</p>
                                                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">Admin verification</p>
                                                    <span className="text-[8px] font-medium text-muted-foreground/40 block mt-0.5 uppercase tracking-tighter">2 hours ago</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-40">
                                    <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                                        <Mail className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-black uppercase tracking-widest text-slate-400">Select a conversation</h3>
                                    <p className="text-xs font-bold text-slate-300 max-w-[200px] mt-2">Choose a recipient from the sidebar to view thread history and transmit messages.</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'contacts' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {isDetailView && selectedContact ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Contact Detail View (To be implemented) */}
                                <div className="h-16 bg-card border-b flex items-center px-6 justify-between shrink-0 shadow-sm z-10">
                                    <div className="flex items-center gap-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsDetailView(false)}
                                            className="h-9 w-9 p-0 rounded-full"
                                        >
                                            <ChevronLeft className="h-5 w-5" />
                                        </Button>
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {getInitials(selectedContact.firstName + ' ' + selectedContact.lastName)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg leading-tight">{selectedContact.firstName} {selectedContact.lastName}</h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="gap-2 h-9 rounded-lg">
                                            <PhoneCall className="h-4 w-4" /> Call
                                        </Button>
                                        <Button variant="outline" size="sm" className="gap-2 h-9 rounded-lg">
                                            <Video className="h-4 w-4" /> Meet
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-row overflow-hidden">
                                    {/* Left Sidebar: Contact Details */}
                                    <div className="w-64 border-r bg-card overflow-y-auto p-4 hidden lg:block">
                                        <Tabs defaultValue="contact" className="w-full">
                                            <TabsList className="w-full grid grid-cols-2 mb-4">
                                                <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
                                                <TabsTrigger value="company" className="text-xs">Company</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="contact" className="space-y-4">
                                                <div className="space-y-3">
                                                    <div>
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Email</Label>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Mail className="h-3 w-3 text-primary" />
                                                            <span className="text-xs font-semibold truncate" title={selectedContact.email}>{selectedContact.email}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Phone</Label>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Phone className="h-3 w-3 text-primary" />
                                                            <span className="text-xs font-semibold">{selectedContact.phone}</span>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">DOB</Label>
                                                            <p className="text-xs font-semibold mt-0.5">{selectedContact.dateOfBirth ? format(new Date(selectedContact.dateOfBirth), 'MMM d, yyyy') : 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Trans. Type</Label>
                                                            <p className="text-xs font-semibold mt-0.5">{selectedContact.transactionType || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Address</Label>
                                                        <p className="text-xs font-semibold mt-0.5 truncate" title={selectedContact.correspondingAddress || ''}>{selectedContact.correspondingAddress || 'N/A'}</p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Source</Label>
                                                        <p className="text-xs font-semibold mt-0.5">{selectedContact.contactSource || 'N/A'}</p>
                                                    </div>
                                                    {selectedContact.ricsSurveyAccount && (
                                                        <div className="flex items-center gap-2 p-1.5 bg-primary/5 rounded border border-primary/10">
                                                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                                                            <span className="text-[9px] font-bold uppercase tracking-wider text-primary">RICS Survey Account</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">Created</Label>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-xs font-semibold">{format(new Date(selectedContact.createdAt), 'MMM d, yyyy')}</span>
                                                        </div>
                                                    </div>
                                                    {selectedContact.internalNotes && (
                                                        <div className="pt-2">
                                                            <Label className="text-[10px] uppercase font-bold text-amber-600/60 tracking-wider">Internal Notes</Label>
                                                            <div className="mt-1 p-2 bg-amber-50 rounded-lg border border-amber-100 shadow-sm">
                                                                <p className="text-[11px] font-medium text-amber-900 italic leading-relaxed">{selectedContact.internalNotes}</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* <Separator /> */}
                                                {/* <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tags</span>
                                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0"><Plus className="h-3 w-3" /></Button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[9px] px-1.5 py-0">Lead</Badge>
                                                        <Badge variant="secondary" className="bg-emerald-500/5 text-emerald-600 border-none text-[9px] px-1.5 py-0">Active</Badge>
                                                    </div>
                                                </div> */}
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    {/* Middle Content: Action Bar & Chat Timeline */}
                                    <div className="flex-1 flex flex-col border-r bg-muted/5 overflow-hidden">
                                        {/* Action Bar - Re-Designed - NOW ON TOP */}
                                        <div className="bg-white border-b border-slate-200 z-10 flex flex-col shrink-0">
                                            {/* Action Header Tabs */}
                                            <div className="flex items-center justify-between px-4 h-12 border-b border-slate-100 shrink-0">
                                                <div className="flex items-center gap-0.5 overflow-x-auto overflow-y-hidden scrollbar-hide">
                                                    {['EMAIL', 'SMS', 'WHATSAPP'].map((tab) => (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setContactActionTab(prev => prev === tab ? null : tab as any)}
                                                            className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest transition-all relative ${contactActionTab === tab
                                                                ? 'text-primary'
                                                                : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                        >
                                                            {tab}
                                                            {contactActionTab === tab && (
                                                                <span className="absolute bottom-[-12px] left-0 right-0 h-[3px] bg-primary rounded-t-full shadow-[0_-4px_12px_rgba(var(--primary),0.3)]" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setContactActionTab(prev => prev === 'COMMENT' ? null : 'COMMENT')}
                                                        className={`text-xs font-bold uppercase tracking-widest transition-all ${contactActionTab === 'COMMENT' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                                                            }`}
                                                    >
                                                        Internal Comment
                                                    </button>
                                                    <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                                        <Maximize2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>

                                        </div>

                                        {/* Chat Timeline Area */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {/* Chat History Placeholder */}
                                            <div className="flex justify-center mb-2">
                                                <Badge variant="outline" className="text-[11px] font-bold uppercase tracking-widest px-3 py-0.5">Timeline Start</Badge>
                                            </div>
                                            <div className="space-y-6 relative">
                                                <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-border/40" />

                                                {/* Actual Logs */}
                                                {[...(contactLogs?.logs || [])].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((log: any) => {
                                                    const isExpanded = expandedLogs.has(log.id);
                                                    return (
                                                        <div key={log.id} className="relative pl-10">
                                                            <div className={`absolute left-1.5 top-0 w-3 h-3 rounded-full ring-4 ring-background ${log.type === 'EMAIL' ? 'bg-indigo-500' :
                                                                log.type === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-primary'
                                                                }`} />
                                                            <div
                                                                className="bg-card p-3 rounded-xl border shadow-sm space-y-1.5 hover:shadow-md transition-shadow cursor-pointer"
                                                                onClick={(e) => toggleLog(log.id, e)}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${log.type === 'EMAIL' ? 'text-indigo-600' :
                                                                            log.type === 'WHATSAPP' ? 'text-emerald-600' : 'text-primary'
                                                                            }`}>
                                                                            {log.type} {log.subject ? `- ${log.subject}` : ''}
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
                                                                                    <a
                                                                                        key={idx}
                                                                                        href={fl.url}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-primary/40 hover:bg-primary/5 px-2 py-0.5 rounded transition-all group/att"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <Paperclip className="h-2.5 w-2.5 text-slate-400 group-hover/att:text-primary transition-colors" />
                                                                                        <span className="text-[10px] font-bold text-slate-600 group-hover/att:text-primary transition-colors truncate max-w-[120px]">
                                                                                            {fl.name}
                                                                                        </span>
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
                                                                    <span className="text-[10px] text-muted-foreground italic truncate">Sent by {log.sender?.name || 'System'}</span>
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase shrink-0 px-1">{log.status}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Initial Outreach Placeholder (if no logs) */}
                                                {(!contactLogs?.logs || contactLogs.logs.length === 0) && (
                                                    <div className="relative pl-10">
                                                        <div className="absolute left-1.5 top-0 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                                                        <div className="bg-card p-3 rounded-xl border shadow-sm space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Initial Outreach</span>
                                                                <span className="text-[9px] font-medium text-muted-foreground">{format(new Date(selectedContact.createdAt), 'HH:mm aaa')}</span>
                                                            </div>
                                                            <p className="text-sm">Account created and welcomed to the platform.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Bar Content Area - NOW ON BOTTOM */}
                                        {contactActionTab && (
                                            <div className="bg-white border-t border-slate-200 z-10 flex flex-col shrink-0">
                                                <div className="p-4 flex-1 overflow-y-auto no-scrollbar max-h-[400px] bg-white">
                                                    {contactActionTab === 'EMAIL' && (
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
                                                                            {messagingConfigs?.filter((c: any) => c.provider === 'MAILGUN').map((config: any) => (
                                                                                <SelectItem key={config.id} value={config.id} className="text-xs font-bold leading-none">{config.name}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-slate-400 uppercase tracking-tighter">From email:</span>
                                                                    <span className="font-bold text-slate-700">{selectedSmtpConfig?.from || selectedSmtpConfig?.user || (selectedSmtpConfig?.provider === 'MAILGUN' ? `test@${selectedSmtpConfig.workspaceId}` : 'Select Provider')}</span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-bold text-slate-400 w-6">To:</span>
                                                                    <div className="flex items-center gap-1.5 bg-slate-100/80 px-1.5 py-0.5 rounded-full border border-slate-200/50 hover:bg-slate-200/50 transition-colors cursor-pointer group/to">
                                                                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm group-hover/to:scale-110 transition-transform">
                                                                            {selectedContact.firstName[0]}{selectedContact.lastName[0]}
                                                                        </div>
                                                                        <span className="text-xs font-bold text-slate-700">{selectedContact.email}</span>
                                                                        <span className="text-[10px] font-bold text-slate-400 ml-0.5">(Primary)</span>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <button className="text-[10px] font-bold uppercase text-slate-400 hover:text-primary transition-colors">CC</button>
                                                                    <button className="text-[10px] font-bold uppercase text-slate-400 hover:text-primary transition-colors">BCC</button>
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

                                                        {/* Attachments Preview */}
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

                                                {/* Bottom Toolbar & Action Cluster */}
                                                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
                                                    <div className="flex items-center gap-0.5">
                                                        <input
                                                            type="file"
                                                            multiple
                                                            hidden
                                                            ref={fileInputRef}
                                                            onChange={handleFileChange}
                                                        />
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all">
                                                            <Type className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="h-7 w-7 p-0 rounded-md text-slate-400 hover:text-primary hover:bg-white transition-all"
                                                        >
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
                                                        <div className="flex items-center">
                                                            <Button
                                                                disabled={isUploadingAttachments || sendEmailMutation.isPending || sendMessageMutation.isPending || updateContactMutation.isPending || (!newMessage.trim() && attachments.length === 0)}
                                                                onClick={handleContactActionSubmit}
                                                                className={`h-10 px-6 text-xs font-bold uppercase tracking-widest shadow-lg rounded-l-xl rounded-r-none gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${contactActionTab === 'COMMENT' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-primary hover:bg-primary/95 shadow-primary/20'}`}
                                                            >
                                                                {(isUploadingAttachments || sendEmailMutation.isPending || sendMessageMutation.isPending || updateContactMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : contactActionTab === 'COMMENT' ? <FileText className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                                                {isUploadingAttachments ? 'Uploading...' : contactActionTab === 'COMMENT' ? 'Save Note' : 'Send'}
                                                            </Button>
                                                            <div className="h-10 w-[1px] bg-white/20" />
                                                            <Button
                                                                className="h-10 w-10 p-0 rounded-r-xl rounded-l-none border-l border-white/10 transition-all hover:bg-primary/90"
                                                                variant="default"
                                                                onClick={() => refetchContactLogs()}
                                                            >
                                                                <History className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Sidebar: Activity */}
                                    <div className="w-[160px] bg-card overflow-y-auto hidden xl:block border-l">
                                        <div className="p-3 border-b bg-muted/5">
                                            <h4 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/80">Activity</h4>
                                        </div>
                                        <div className="p-3 space-y-4">
                                            <div className="flex gap-2">
                                                <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold leading-tight">Account Verified</p>
                                                    <p className="text-[9px] text-muted-foreground mt-0.5 leading-relaxed">Admin verification</p>
                                                    <span className="text-[8px] font-medium text-muted-foreground/40 block mt-0.5 uppercase tracking-tighter">2 hours ago</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Contacts Header */}
                                <div className="h-20 bg-card border-b flex items-center px-6 justify-between shrink-0 shadow-sm z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <h3 className="font-bold text-lg leading-tight">Contacts</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                                    {contactsData?.meta?.total || 0} People Managed
                                                </p>
                                                <div className="h-4 w-[1px] bg-border" />
                                                <Tabs
                                                    defaultValue="CLIENT"
                                                    value={contactTypeFilter}
                                                    onValueChange={(val: any) => {
                                                        setContactTypeFilter(val);
                                                        setPage(1);
                                                    }}
                                                    className="h-7"
                                                >
                                                    <TabsList className="bg-muted/50 h-7 p-0.5 border">
                                                        <TabsTrigger value="ALL" className="text-[10px] px-3 h-full uppercase font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">All</TabsTrigger>
                                                        <TabsTrigger value="CLIENT" className="text-[10px] px-3 h-full uppercase font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Clients</TabsTrigger>
                                                        <TabsTrigger value="STAFF" className="text-[10px] px-3 h-full uppercase font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Talent</TabsTrigger>
                                                        <TabsTrigger value="TEAM" className="text-[10px] px-3 h-full uppercase font-black data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Staff</TabsTrigger>
                                                    </TabsList>
                                                </Tabs>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                            <Input
                                                placeholder="Search contacts..."
                                                className="h-10 pl-10 w-64 md:w-80 bg-muted/30 border-none focus-visible:ring-1"
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Contacts List View */}
                                <div className="flex-1 overflow-auto bg-card">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                            <TableRow className="hover:bg-transparent border-b-2">
                                                <TableHead className="font-bold pl-6">Contact Name</TableHead>
                                                <TableHead className="font-bold">Phone</TableHead>
                                                <TableHead className="font-bold">Email</TableHead>
                                                <TableHead className="font-bold">Contact Type</TableHead>
                                                <TableHead className="font-bold">Created</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {isContactsLoading ? (
                                                Array(10).fill(0).map((_, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell colSpan={5} className="h-16">
                                                            <div className="h-8 bg-muted/40 animate-pulse rounded-md w-full" />
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            ) : (contactsData?.data?.length ?? 0) === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="h-96 text-center">
                                                        <div className="flex flex-col items-center gap-4 py-20">
                                                            <Users className="h-16 w-16 text-muted-foreground/20" />
                                                            <p className="font-bold text-xl">No contacts found</p>
                                                            <Button onClick={() => setSearch('')}>Clear Filters</Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                contactsData?.data.map((contact: any) => (
                                                    <TableRow
                                                        key={contact.id}
                                                        className="cursor-pointer hover:bg-muted/30 transition-colors border-b last:border-0 group"
                                                        onClick={() => { setSelectedContact(contact); setIsDetailView(true); }}
                                                    >
                                                        <TableCell className="pl-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shadow-sm">
                                                                    {getInitials(contact.firstName + ' ' + contact.lastName)}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-sm tracking-tight">{contact.firstName} {contact.lastName}</span>
                                                                        {contact.transactionType === 'CLIENT' && (
                                                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black border border-slate-200 uppercase">{contact.correspondingAddress?.split(',')[0]}</span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{contact.contactId}</span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-sm font-medium">{contact.phone}</TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">{contact.email}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className="bg-muted/30 border-none font-bold text-[10px] py-1">
                                                                {contact.contactType === 'STAFF' ? 'Talent' : contact.contactType === 'TEAM' ? 'Staff' : (contact.contactType || 'Regular')}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                                            {format(new Date(contact.createdAt), 'MMM d, yyyy')}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
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
                        <p className="text-xs font-bold text-slate-300 max-w-[200px] mt-2">Please select a valid folder or contact from the menu.</p>
                    </div>
                )}
            </div>

            {/* Compose Modal / Slide-over (Styled as Modal for now) */}
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
                                Outbound Communication
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                    <form onSubmit={handleComposeSubmit}>
                        <div className="p-8 space-y-6 bg-card">
                            {composeType === 'EMAIL' ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-primary">Sender Profile</Label>
                                        <Select
                                            value={emailForm.configId || 'default'}
                                            onValueChange={v => {
                                                let newTo = emailForm.to;
                                                const mailgunConfig = messagingConfigs?.find((c: any) => c.id === v && c.provider === 'MAILGUN');
                                                if (mailgunConfig && mailgunConfig.workspaceId) {
                                                    newTo = `test@${mailgunConfig.workspaceId}`;
                                                }
                                                setEmailForm({ ...emailForm, configId: v, to: newTo });
                                            }}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/50 focus:ring-1">
                                                <SelectValue placeholder="Use Default SMTP" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="default">Default System Config</SelectItem>
                                                {smtpConfigs?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                {messagingConfigs?.filter((c: any) => c.provider === 'MAILGUN').map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Recipient Identity</Label>
                                        <div className="relative">
                                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                            <Input
                                                placeholder="email@example.com"
                                                className="h-12 pl-10 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all"
                                                value={emailForm.to}
                                                onChange={e => setEmailForm({ ...emailForm, to: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Communication Intent</Label>
                                        <Input
                                            placeholder="Subject of your message..."
                                            className="h-12 rounded-xl bg-muted/20 border-border/50 focus:bg-background transition-all"
                                            value={emailForm.subject}
                                            onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Detailed Narrative</Label>
                                        <Textarea
                                            placeholder="Craft your message here..."
                                            className="min-h-[220px] rounded-2xl bg-muted/20 border-border/50 p-4 focus:bg-background transition-all"
                                            value={emailForm.content}
                                            onChange={e => setEmailForm({ ...emailForm, content: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Recipient</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                            <Input
                                                placeholder="+1 (234) 567-890"
                                                className="h-14 pl-10 rounded-2xl text-lg font-mono bg-muted/20 border-border/50"
                                                value={messageForm.to}
                                                onChange={e => setMessageForm({ ...messageForm, to: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground/60 italic pl-1">Note: International format recommended (+CodeNumber)</p>
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Message Body</Label>
                                        <Textarea
                                            placeholder="Type your WhatsApp/SMS message..."
                                            className="min-h-[160px] rounded-2xl bg-muted/20 border-border/50 p-4 text-base"
                                            value={messageForm.content}
                                            onChange={e => setMessageForm({ ...messageForm, content: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex gap-3">
                                        <div className="text-emerald-500 animate-pulse"><AlertCircle className="h-5 w-5" /></div>
                                        <p className="text-xs text-emerald-700/80 leading-relaxed font-medium">Messages are delivered instantly via your default Bird configuration. Carriers may apply standard messaging rates.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <DialogFooter className="bg-muted/10 p-6">
                            <Button type="button" variant="ghost" className="h-12 px-6 font-bold text-muted-foreground hover:bg-muted/50 rounded-xl" onClick={() => setIsComposeOpen(false)}>Discard</Button>
                            <Button type="submit" disabled={sendEmailMutation.isPending || sendMessageMutation.isPending} className="h-12 px-8 font-black rounded-xl gap-2 shadow-xl shadow-primary/20 hover:scale-[1.03] transition-all">
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

            <ContactFormModal
                open={isContactModalOpen}
                onClose={() => { setIsContactModalOpen(false); setContactToEdit(null); }}
                contact={contactToEdit}
                onSubmit={handleContactSubmit}
                isSubmitting={createContactMutation.isPending || updateContactMutation.isPending}
            />

            <ConfirmModal
                open={isDeleteDialogOpen}
                onClose={() => { setIsDeleteDialogOpen(false); setContactToDelete(null); }}
                onConfirm={() => contactToDelete && deleteContactMutation.mutate({ id: contactToDelete })}
                title="Are you absolutely sure?"
                description="This action cannot be undone. This will permanently delete the contact and remove their data from our servers."
                confirmText="Delete Contact"
                isLoading={deleteContactMutation.isPending}
                variant="danger"
            />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0, 0, 0, 0.1);
                    border-radius: 10px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div >
    );
}
