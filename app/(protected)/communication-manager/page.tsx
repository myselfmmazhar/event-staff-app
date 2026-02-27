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
    const activeTab = searchParams.get('tab') || 'email';
    const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
    const [emailFolder, setEmailFolder] = useState<'SENT' | 'TRASH'>('SENT');
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [isDetailView, setIsDetailView] = useState(false);
    const [contactActionTab, setContactActionTab] = useState<'SMS' | 'WHATSAPP' | 'EMAIL' | 'COMMENT' | null>(null);

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [contactTypeFilter, setContactTypeFilter] = useState<'CLIENT' | 'STAFF' | 'ALL'>('CLIENT');

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
    const [contactActionSubject, setContactActionSubject] = useState('');
    const [contactActionConfigId, setContactActionConfigId] = useState('default');

    const [newMessage, setNewMessage] = useState('');
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);

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
        type: 'MESSAGE'
    }, {
        enabled: activeTab === 'messages'
    });

    const { data: chatHistory, isLoading: isChatLoading } = trpc.communication.getChatHistory.useQuery(
        { recipient: selectedRecipient!, type: 'MESSAGE' },
        { enabled: activeTab === 'messages' && !!selectedRecipient }
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
        onSuccess: () => {
            toast({ title: 'Contact updated successfully' });
            setIsContactModalOpen(false);
            setContactToEdit(null);
            refetchContacts();
        },
        onError: (error) => {
            toast({ title: 'Failed to update contact', description: error.message, variant: 'error' });
        }
    });

    const deleteContactMutation = trpc.contacts.delete.useMutation({
        onSuccess: () => {
            toast({ title: 'Contact deleted successfully' });
            setIsDeleteDialogOpen(false);
            setContactToDelete(null);
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
                configId: contactActionConfigId === 'default' ? undefined : contactActionConfigId,
                fileLinks: uploadedFileLinks.length > 0 ? uploadedFileLinks : undefined,
            });
        } else if (contactActionTab === 'SMS' || contactActionTab === 'WHATSAPP') {
            sendMessageMutation.mutate({
                to: selectedContact.phone,
                content: content,
                type: contactActionTab as 'SMS' | 'WHATSAPP',
                configId: contactActionConfigId === 'default' ? undefined : contactActionConfigId
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

    const selectedSmtpConfig = smtpConfigs?.find((c: any) => c.id === contactActionConfigId) ||
        messagingConfigs?.find((c: any) => c.id === contactActionConfigId && c.provider === 'MAILGUN') ||
        smtpConfigs?.find((c: any) => c.isDefault) ||
        smtpConfigs?.[0];

    useEffect(() => {
        if (smtpConfigs && smtpConfigs.length > 0 && contactActionConfigId === 'default') {
            const def = smtpConfigs.find((c: any) => c.isDefault) || smtpConfigs[0];
            setContactActionConfigId(def.id);
        }
    }, [smtpConfigs, contactActionConfigId]);

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
            {activeTab !== 'contacts' && (
                <div className="w-72 border-r bg-card/50 backdrop-blur-md flex flex-col shrink-0">
                    <div className="p-6 border-b flex items-center justify-between">
                        <div>
                            <h2 className="font-bold text-xl tracking-tight">
                                {activeTab === 'email' ? 'Email Hub' : activeTab === 'contacts' ? 'Contacts' : 'Messaging'}
                            </h2>
                            <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">
                                {activeTab === 'email' ? 'Inbox & Outbox' : activeTab === 'contacts' ? 'CRM & Relations' : 'Direct Conversations'}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4">
                        {activeTab === 'contacts' ? (
                            <div className="space-y-1">
                                <div className="px-4 mb-4 flex gap-2">
                                    <Button
                                        className="flex-1 justify-start gap-2 h-11 shadow-md bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02]"
                                        onClick={() => { setContactToEdit(null); setIsContactModalOpen(true); }}
                                    >
                                        <div className="bg-white/20 rounded-md p-1">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold">Add Contact</span>
                                    </Button>
                                </div>
                                <SidebarItem
                                    icon={Users}
                                    label="Contacts"
                                    active={!isDetailView}
                                    onClick={() => { setIsDetailView(false); setSelectedContact(null); }}
                                    badge={contactsData?.meta?.total?.toString() || '0'}
                                />
                                <SidebarItem
                                    icon={List}
                                    label="Smart Lists"
                                    active={false}
                                    onClick={() => { }}
                                />
                                <SidebarItem
                                    icon={BuildingOfficeIcon}
                                    label="Companies"
                                    active={false}
                                    onClick={() => { }}
                                />

                                <div className="mt-8 px-4 py-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                    Filters
                                </div>
                                <div className="px-4 mt-2 space-y-2">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                        <Input
                                            placeholder="Filter list..."
                                            className="h-9 pl-9 bg-muted/40 border-none focus-visible:ring-1 text-sm"
                                            value={search}
                                            onChange={e => setSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'email' ? (
                            <div className="space-y-1">
                                <div className="px-4 mb-4">
                                    <Button
                                        className="w-full justify-start gap-2 h-11 shadow-md bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02]"
                                        onClick={() => { setComposeType('EMAIL'); setIsComposeOpen(true); }}
                                    >
                                        <div className="bg-white/20 rounded-md p-1">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold">Compose Email</span>
                                    </Button>
                                </div>
                                <SidebarItem
                                    icon={SendHorizontal}
                                    label="Sent Messages"
                                    active={emailFolder === 'SENT'}
                                    onClick={() => setEmailFolder('SENT')}
                                    badge={logsData?.logs?.filter((l: any) => l.type === 'EMAIL' && !l.isTrashed).length?.toString() || '0'}
                                />
                                <SidebarItem
                                    icon={Trash2}
                                    label="Trash"
                                    active={emailFolder === 'TRASH'}
                                    onClick={() => { setEmailFolder('TRASH'); setSelectedLogs([]); }}
                                    badge={logsData?.logs?.filter((l: any) => l.isTrashed).length?.toString() || '0'}
                                />
                                <div className="mt-8 px-4 py-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                    Manage
                                </div>
                                <SidebarItem
                                    icon={Settings}
                                    label="SMTP Settings"
                                    onClick={() => router.push('/settings/communication')}
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                <div className="px-4 mb-4 flex gap-2">
                                    <Button
                                        className="flex-1 justify-start gap-2 h-11 shadow-md hover:scale-[1.02] transition-all"
                                        onClick={() => { setComposeType('MESSAGE'); setIsComposeOpen(true); }}
                                    >
                                        <div className="bg-white/20 rounded-md p-1">
                                            <Plus className="h-4 w-4" />
                                        </div>
                                        <span className="font-semibold">New Chat</span>
                                    </Button>
                                </div>

                                <div className="px-4 mb-2 relative">
                                    <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                                    <Input
                                        placeholder="Search users..."
                                        className="h-9 pl-9 bg-muted/40 border-none focus-visible:ring-1 text-sm"
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar">
                                    {isConversationsLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
                                            <span className="text-xs text-muted-foreground animate-pulse">Syncing...</span>
                                        </div>
                                    ) : conversations?.length === 0 ? (
                                        <div className="px-6 py-12 text-center">
                                            <div className="bg-muted/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <MessageSquare className="h-5 w-5 text-muted-foreground/30" />
                                            </div>
                                            <p className="text-sm font-medium text-muted-foreground">No chats yet</p>
                                            <p className="text-[10px] text-muted-foreground/60 mt-1">Direct messages will appear here</p>
                                        </div>
                                    ) : (
                                        conversations?.map((conv: any) => (
                                            <button
                                                key={conv.id}
                                                onClick={() => setSelectedRecipient(conv.recipient)}
                                                className={`w-full flex items-center gap-3 px-4 py-4 text-sm transition-all duration-200 border-b border-muted/20 relative group ${selectedRecipient === conv.recipient
                                                    ? 'bg-primary/5 shadow-[inset_4px_0_0_0_#3b82f6]'
                                                    : 'hover:bg-muted/30'
                                                    }`}
                                            >
                                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                                    {getInitials(conv.recipient || 'U')}
                                                </div>
                                                <div className="flex-1 text-left overflow-hidden">
                                                    <div className="flex justify-between items-baseline mb-0.5">
                                                        <span className="font-bold truncate text-foreground/90">{conv.recipient}</span>
                                                        <span className="text-[9px] font-medium text-muted-foreground shrink-0 bg-muted/50 px-1.5 py-0.5 rounded">
                                                            {formatDate(new Date(conv.createdAt))}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate leading-relaxed">
                                                        {conv.status === 'SENT' && <Check className="h-2.5 w-2.5 inline mr-1 text-primary/60" />}
                                                        {conv.content}
                                                    </p>
                                                </div>
                                                {selectedRecipient === conv.recipient && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-3 w-3 text-muted-foreground" />
                                                    </div>
                                                )}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
                {activeTab === 'contacts' ? (
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

                                <div className="flex-1 overflow-hidden flex">
                                    {/* Left Sidebar: Contact Details */}
                                    <div className="w-[280px] border-r bg-card overflow-y-auto p-4 hidden lg:block">
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
                                                </div>
                                                <Separator />
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tags</span>
                                                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0"><Plus className="h-3 w-3" /></Button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[9px] px-1.5 py-0">Lead</Badge>
                                                        <Badge variant="secondary" className="bg-emerald-500/5 text-emerald-600 border-none text-[9px] px-1.5 py-0">Active</Badge>
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>

                                    {/* Middle Content: Chat & Action Bar */}
                                    <div className="flex-1 flex flex-col border-r bg-muted/5 overflow-hidden">
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                            {/* Chat History Placeholder */}
                                            <div className="flex justify-center mb-2">
                                                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest px-3 py-0.5">Timeline Start</Badge>
                                            </div>
                                            <div className="space-y-6 relative">
                                                <div className="absolute left-3 top-0 bottom-0 w-[1px] bg-border/40" />

                                                {/* Actual Logs */}
                                                {[...(contactLogs?.logs || [])].reverse().map((log: any) => (
                                                    <div key={log.id} className="relative pl-10">
                                                        <div className={`absolute left-1.5 top-0 w-3 h-3 rounded-full ring-4 ring-background ${log.type === 'EMAIL' ? 'bg-indigo-500' :
                                                            log.type === 'WHATSAPP' ? 'bg-emerald-500' : 'bg-primary'
                                                            }`} />
                                                        <div className="bg-card p-3 rounded-xl border shadow-sm space-y-1.5 hover:shadow-md transition-shadow">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${log.type === 'EMAIL' ? 'text-indigo-600' :
                                                                        log.type === 'WHATSAPP' ? 'text-emerald-600' : 'text-primary'
                                                                        }`}>
                                                                        {log.type} {log.subject ? `- ${log.subject}` : ''}
                                                                    </span>
                                                                    {log.status === 'FAILED' && (
                                                                        <Badge variant="destructive" className="text-[8px] h-3 px-1 leading-none py-0">FAILED</Badge>
                                                                    )}
                                                                </div>
                                                                <span className="text-[8px] font-medium text-muted-foreground whitespace-nowrap">
                                                                    {format(new Date(log.createdAt), 'MMM d, HH:mm aaa')}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: log.content }} />
                                                            {log.fileLinks && Array.isArray(log.fileLinks) && log.fileLinks.length > 0 && (
                                                                <div className="flex flex-wrap gap-2 pt-1.5">
                                                                    {(log.fileLinks as any[]).map((fl: any, idx: number) => (
                                                                        <a
                                                                            key={idx}
                                                                            href={fl.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-1 bg-slate-50 border border-slate-200 hover:border-primary/40 hover:bg-primary/5 px-2 py-0.5 rounded transition-all group/att"
                                                                        >
                                                                            <Paperclip className="h-2.5 w-2.5 text-slate-400 group-hover/att:text-primary transition-colors" />
                                                                            <span className="text-[9px] font-bold text-slate-600 group-hover/att:text-primary transition-colors truncate max-w-[120px]">
                                                                                {fl.name}
                                                                            </span>
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <div className="flex items-center justify-between pt-1.5 border-t border-dashed overflow-hidden">
                                                                <span className="text-[8px] text-muted-foreground italic truncate">Sent by {log.sender?.name || 'System'}</span>
                                                                <span className="text-[8px] font-bold text-muted-foreground uppercase shrink-0 px-1">{log.status}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Initial Outreach Placeholder (if no logs) */}
                                                {(!contactLogs?.logs || contactLogs.logs.length === 0) && (
                                                    <div className="relative pl-10">
                                                        <div className="absolute left-1.5 top-0 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                                                        <div className="bg-card p-3 rounded-xl border shadow-sm space-y-1.5">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-primary">Initial Outreach</span>
                                                                <span className="text-[8px] font-medium text-muted-foreground">{format(new Date(selectedContact.createdAt), 'HH:mm aaa')}</span>
                                                            </div>
                                                            <p className="text-xs">Account created and welcomed to the platform.</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Bar - Re-Designed */}
                                        <div className="bg-white border-t border-slate-200 z-10 flex flex-col shrink-0">
                                            {/* Action Header Tabs */}
                                            <div className="flex items-center justify-between px-3 h-10 border-b border-slate-100 shrink-0">
                                                <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
                                                    {['SMS', 'WHATSAPP', 'EMAIL'].map((tab) => (
                                                        <button
                                                            key={tab}
                                                            onClick={() => setContactActionTab(prev => prev === tab ? null : tab as any)}
                                                            className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest transition-all relative ${contactActionTab === tab
                                                                ? 'text-primary'
                                                                : 'text-slate-400 hover:text-slate-600'
                                                                }`}
                                                        >
                                                            {tab}
                                                            {contactActionTab === tab && (
                                                                <span className="absolute bottom-[-10px] left-0 right-0 h-[2px] bg-primary rounded-t-full shadow-[0_-4px_8px_rgba(var(--primary),0.2)]" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setContactActionTab(prev => prev === 'COMMENT' ? null : 'COMMENT')}
                                                        className={`text-[10px] font-bold uppercase tracking-widest transition-all ${contactActionTab === 'COMMENT' ? 'text-amber-600' : 'text-slate-400 hover:text-slate-600'
                                                            }`}
                                                    >
                                                        Internal Comment
                                                    </button>
                                                    <button className="text-slate-300 hover:text-slate-500 transition-colors">
                                                        <Maximize2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Action Content Area */}
                                            {contactActionTab && (
                                                <>
                                                    <div className="p-3 flex-1 overflow-y-auto no-scrollbar max-h-[300px]">
                                                        {contactActionTab === 'EMAIL' && (
                                                            <div className="space-y-2 mb-2">
                                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-2 border-b border-slate-50 text-[10px]">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-bold text-slate-400 uppercase tracking-tighter">From Name:</span>
                                                                        <Select value={contactActionConfigId} onValueChange={setContactActionConfigId}>
                                                                            <SelectTrigger className="h-auto p-0 border-none shadow-none bg-transparent font-black text-slate-700 focus:ring-0 text-[10px]">
                                                                                <SelectValue placeholder="Select Name" />
                                                                            </SelectTrigger>
                                                                            <SelectContent className="rounded-xl shadow-xl border-slate-100">
                                                                                {smtpConfigs?.map((config: any) => (
                                                                                    <SelectItem key={config.id} value={config.id} className="text-[10px] font-bold leading-none">{config.name}</SelectItem>
                                                                                ))}
                                                                                {messagingConfigs?.filter((c: any) => c.provider === 'MAILGUN').map((config: any) => (
                                                                                    <SelectItem key={config.id} value={config.id} className="text-[10px] font-bold leading-none">{config.name}</SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-bold text-slate-400 uppercase tracking-tighter">From email:</span>
                                                                        <span className="font-black text-slate-700">{selectedSmtpConfig?.from || selectedSmtpConfig?.user || (selectedSmtpConfig?.provider === 'MAILGUN' ? `test@${selectedSmtpConfig.workspaceId}` : 'Select Provider')}</span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center justify-between py-1.5 border-b border-slate-50">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-400 w-6">To:</span>
                                                                        <div className="flex items-center gap-1.5 bg-slate-100/80 px-1.5 py-0.5 rounded-full border border-slate-200/50 hover:bg-slate-200/50 transition-colors cursor-pointer group/to">
                                                                            <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[8px] font-black text-white uppercase shadow-sm group-hover/to:scale-110 transition-transform">
                                                                                {selectedContact.firstName[0]}{selectedContact.lastName[0]}
                                                                            </div>
                                                                            <span className="text-[10px] font-black text-slate-700">{selectedContact.email}</span>
                                                                            <span className="text-[8px] font-bold text-slate-400 ml-0.5">(Primary)</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <button className="text-[8px] font-black uppercase text-slate-400 hover:text-primary transition-colors">CC</button>
                                                                        <button className="text-[8px] font-black uppercase text-slate-400 hover:text-primary transition-colors">BCC</button>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2 py-1.5 border-b border-slate-100">
                                                                    <span className="text-[10px] font-bold text-slate-400 w-6 shrink-0">Subject:</span>
                                                                    <Input
                                                                        className="border-none shadow-none h-6 p-0 text-xs font-black text-slate-700 focus-visible:ring-0 placeholder:text-slate-300"
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
                                                                className="min-h-[100px] w-full border-none shadow-none resize-none px-0 text-xs font-semibold text-slate-600 focus-visible:ring-0 placeholder:text-slate-300 placeholder:font-normal no-scrollbar"
                                                                value={newMessage}
                                                                onChange={(e) => setNewMessage(e.target.value)}
                                                            />

                                                            {/* Attachments Preview */}
                                                            {attachments.length > 0 && (
                                                                <div className="flex flex-wrap gap-1.5 py-2 border-t border-slate-50 mt-1">
                                                                    {attachments.map((file, i) => (
                                                                        <div key={i} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md group/file hover:border-primary/30 transition-all">
                                                                            <span className="text-[8px] font-black text-slate-500 uppercase truncate max-w-[100px]">{file.name}</span>
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
                                                    <div className="px-3 py-2 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
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
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{newMessage.trim().split(/\s+/).filter(Boolean).length} words</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => { setNewMessage(''); setAttachments([]); }}
                                                                className="text-[10px] font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 rounded-lg h-8 transition-all"
                                                            >
                                                                Clear
                                                            </Button>
                                                            <div className="flex items-center">
                                                                <Button
                                                                    disabled={isUploadingAttachments || sendEmailMutation.isPending || sendMessageMutation.isPending || (!newMessage.trim() && attachments.length === 0)}
                                                                    onClick={handleContactActionSubmit}
                                                                    className="h-8 px-4 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 rounded-l-lg rounded-r-none gap-1.5"
                                                                >
                                                                    {(isUploadingAttachments || sendEmailMutation.isPending || sendMessageMutation.isPending) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                                                    {isUploadingAttachments ? 'Uploading...' : 'Send'}
                                                                </Button>
                                                                <div className="h-8 w-[1px] bg-white/20" />
                                                                <Button
                                                                    className="h-8 w-8 p-0 rounded-r-lg rounded-l-none border-l border-white/10"
                                                                    variant="default"
                                                                    onClick={() => refetchContactLogs()}
                                                                >
                                                                    <History className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Sidebar: Activity */}
                                    <div className="w-[200px] bg-card overflow-y-auto hidden xl:block border-l">
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
                                                                {contact.contactType === 'STAFF' ? 'Talent' : (contact.contactType || 'Regular')}
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
                ) : activeTab === 'email' ? (
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Email Header */}
                        <div className="h-16 bg-card border-b flex items-center px-6 justify-between shrink-0 shadow-sm z-10 relative overflow-hidden">
                            {selectedLogs.length > 0 ? (
                                <div className="absolute inset-0 bg-card flex items-center px-6 justify-between animate-in slide-in-from-top duration-200 z-20">
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-5 w-5 rounded border border-primary bg-primary/10 flex items-center justify-center">
                                                <input
                                                    type="checkbox"
                                                    className="h-3.5 w-3.5 rounded-sm border-primary text-primary focus:ring-primary cursor-pointer"
                                                    checked={selectedLogs.length > 0}
                                                    onChange={() => setSelectedLogs([])}
                                                />
                                            </div>
                                            <span className="font-bold text-primary text-sm tracking-tight">{selectedLogs.length} selected</span>
                                        </div>
                                        <div className="h-6 w-[1px] bg-border" />
                                        <div className="flex items-center gap-1">
                                            {emailFolder === 'TRASH' ? (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 px-4 text-primary hover:bg-primary/5 gap-2 font-bold transition-all rounded-full"
                                                        onClick={() => { restoreLogsMutation.mutate({ ids: selectedLogs }); setSelectedLogs([]); }}
                                                    >
                                                        <RotateCcw className="h-4 w-4" />
                                                        Restore
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 px-4 text-destructive hover:bg-destructive/5 gap-2 font-bold transition-all rounded-full"
                                                        onClick={() => { deleteLogsPermanentlyMutation.mutate({ ids: selectedLogs }); setSelectedLogs([]); }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete forever
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-9 px-4 text-destructive hover:bg-destructive/5 gap-2 font-bold transition-all rounded-full"
                                                    onClick={() => { trashLogsMutation.mutate({ ids: selectedLogs }); setSelectedLogs([]); }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Move to trash
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-9 px-4 text-muted-foreground hover:bg-muted font-bold transition-all rounded-full"
                                        onClick={() => setSelectedLogs([])}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${emailFolder === 'SENT' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                                            {emailFolder === 'SENT' ? <SendHorizontal className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight">
                                                {emailFolder === 'SENT' ? 'Sent Items' : 'Trash'}
                                            </h3>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                                                {logsData?.total || 0} communications logged
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative group">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                            <Input
                                                placeholder="Search by recipient or subject..."
                                                className="h-10 pl-10 w-64 md:w-80 bg-muted/30 border-none focus-visible:ring-1 transition-all"
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                            />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-10 w-10 bg-muted/40 border-none hover:bg-muted"
                                            onClick={() => refetchLogs()}
                                        >
                                            <RefreshCw className={`h-4 w-4 text-muted-foreground ${isLogsLoading ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Email List View */}
                        <div className="flex-1 overflow-auto bg-card custom-scrollbar">
                            {emailFolder === 'TRASH' && logsData?.logs.length! > 0 && selectedLogs.length === 0 && (
                                <div className="bg-muted/30 px-6 py-3 border-b flex items-center justify-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Messages in Trash will be automatically deleted after 30 days.</span>
                                    <button
                                        className="text-primary font-bold hover:underline"
                                        onClick={() => {
                                            const allIds = logsData?.logs.map((l: any) => l.id) || [];
                                            if (allIds.length > 0) {
                                                deleteLogsPermanentlyMutation.mutate({ ids: allIds });
                                            }
                                        }}
                                    >
                                        Empty Trash now
                                    </button>
                                </div>
                            )}
                            <Table>
                                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                                    <TableRow className="hover:bg-transparent border-b-2">
                                        <TableHead className="w-12 px-6">
                                            <input
                                                type="checkbox"
                                                className="h-4 w-4 rounded-sm border-muted-foreground/30 text-primary focus:ring-primary"
                                                checked={logsData?.logs.length > 0 && selectedLogs.length === logsData?.logs.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedLogs(logsData?.logs.map((l: any) => l.id) || []);
                                                    } else {
                                                        setSelectedLogs([]);
                                                    }
                                                }}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[240px] font-bold">Recipient</TableHead>
                                        <TableHead className="font-bold">Subject & Content Preview</TableHead>
                                        <TableHead className="w-[120px] font-bold">Status</TableHead>
                                        <TableHead className="text-right w-[150px] font-bold pr-6">Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLogsLoading ? (
                                        Array(12).fill(0).map((_, i) => (
                                            <TableRow key={i}>
                                                <TableCell colSpan={5} className="h-16 p-4">
                                                    <div className="h-8 bg-muted/40 animate-pulse rounded-md w-full" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : logsData?.logs.filter((l: any) => l.type === 'EMAIL').length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-96 text-center">
                                                <div className="flex flex-col items-center gap-4 py-20">
                                                    <div className="bg-muted/30 p-6 rounded-full">
                                                        <Mail className="h-16 w-16 text-muted-foreground/20" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xl font-bold">Your mailbox is empty</p>
                                                        <p className="text-muted-foreground mt-1">No email logs match your current filters.</p>
                                                    </div>
                                                    <Button variant="outline" className="mt-2" onClick={() => { setSearch(''); setEmailFolder('SENT'); }}>Clear Filters</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logsData?.logs.filter((l: any) => l.type === 'EMAIL').map((log: any) => (
                                            <TableRow key={log.id} className="cursor-pointer group hover:bg-muted/20 transition-colors border-b last:border-0 h-16">
                                                <TableCell className="pl-6 w-14">
                                                    <div className="relative h-8 w-14 group-hover:w-24 transition-all duration-200">
                                                        {/* Checkbox / Default Icon Container */}
                                                        <div className="absolute inset-0 flex items-center gap-3 transition-opacity duration-200">
                                                            <input
                                                                type="checkbox"
                                                                className={`h-4 w-4 rounded-sm border-muted-foreground/30 text-primary focus:ring-primary transition-opacity ${selectedLogs.includes(log.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                                checked={selectedLogs.includes(log.id)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    if (e.target.checked) {
                                                                        setSelectedLogs([...selectedLogs, log.id]);
                                                                    } else {
                                                                        setSelectedLogs(selectedLogs.filter(id => id !== log.id));
                                                                    }
                                                                }}
                                                            />
                                                            <div className={`transition-opacity duration-200 ${selectedLogs.includes(log.id) ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`}>
                                                                <Mail className="h-4 w-4 text-muted-foreground/60" />
                                                            </div>
                                                        </div>

                                                        {/* Hover Actions - Sidebar Style */}
                                                        <div className="absolute left-10 flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                                            {emailFolder === 'TRASH' ? (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 text-primary hover:bg-primary/20 rounded-full"
                                                                        title="Restore"
                                                                        onClick={(e) => { e.stopPropagation(); restoreLogsMutation.mutate({ ids: [log.id] }); }}
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                                                                        title="Delete Permanently"
                                                                        onClick={(e) => { e.stopPropagation(); deleteLogsPermanentlyMutation.mutate({ ids: [log.id] }); }}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                                    title="Move to Trash"
                                                                    onClick={(e) => { e.stopPropagation(); trashLogsMutation.mutate({ ids: [log.id] }); }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-sm">{log.recipient}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm tracking-tight text-foreground/90 truncate max-w-xl group-hover:text-primary transition-colors">{log.subject}</span>
                                                        <span className="text-[11px] text-muted-foreground/70 truncate block max-w-xl italic mt-0.5">
                                                            {log.content.replace(/<[^>]*>?/gm, '').substring(0, 100)}...
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {log.status === 'SENT' ? (
                                                        <Badge variant="success" className="bg-emerald-500/10 text-emerald-600 border-none shadow-none font-bold px-2 py-0.5">SENT</Badge>
                                                    ) : (
                                                        <Badge variant="destructive" className="bg-rose-500/10 text-rose-600 border-none shadow-none font-bold px-2 py-0.5">ERROR</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-muted-foreground font-bold pr-6">
                                                    <div className="flex flex-col items-end">
                                                        <span>{format(new Date(log.createdAt), 'MMM d, yyyy')}</span>
                                                        <span className="text-[10px] opacity-60 font-normal">{format(new Date(log.createdAt), 'HH:mm a')}</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    // Messaging / WhatsApp Styled View
                    <div className="flex-1 flex flex-col overflow-hidden bg-[#E2E8F0]/40 dark:bg-black/20">
                        {selectedRecipient ? (
                            <>
                                {/* Chat Header */}
                                <div className="h-16 bg-card border-b flex items-center px-6 justify-between shrink-0 shadow-sm z-10">
                                    <div className="flex items-center gap-4">
                                        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white font-bold shadow-lg ring-2 ring-background ring-offset-1">
                                            {getInitials(selectedRecipient)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base tracking-tight leading-none">{selectedRecipient}</h3>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">WhatsApp Cloud API</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:bg-muted/80 rounded-full transition-all duration-200">
                                            <Search className="h-5 w-5" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:bg-muted/80 rounded-full transition-all duration-200">
                                            <Settings className="h-5 w-5" />
                                        </Button>
                                        <Separator orientation="vertical" className="h-8 mx-1" />
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground hover:bg-muted/80 rounded-full transition-all duration-200">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Chat Messages Area */}
                                <div
                                    ref={scrollRef}
                                    className="flex-1 overflow-y-auto p-6 space-y-3 bg-[url('https://herobot.app/wp-content/uploads/2022/11/whatsapp-background-dark.jpg')] bg-fixed bg-center opacity-90 custom-scrollbar"
                                >
                                    <div className="flex justify-center mb-6">
                                        <div className="bg-card/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-border/40 font-bold text-[10px] text-muted-foreground uppercase tracking-widest shadow-sm">
                                            Today
                                        </div>
                                    </div>

                                    {isChatLoading ? (
                                        <div className="flex flex-col items-center justify-center h-full gap-3">
                                            <div className="bg-card p-4 rounded-full shadow-xl">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                            </div>
                                            <span className="text-xs font-bold text-primary animate-pulse tracking-widest uppercase">Deciphering...</span>
                                        </div>
                                    ) : chatHistory?.length === 0 ? (
                                        <div className="text-center py-24 bg-card/10 backdrop-blur-sm rounded-3xl m-10 border border-dashed border-primary/20">
                                            <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <MessageSquare className="h-8 w-8 text-primary/30" />
                                            </div>
                                            <h4 className="font-bold text-lg mb-1">Encrypted Connection Established</h4>
                                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">This conversation is protected. Start typing below to send a message via Bird.</p>
                                        </div>
                                    ) : (
                                        chatHistory?.map((msg: any, idx: number) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.status === 'SENT' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                                                style={{ animationDelay: `${idx * 50}ms` }}
                                            >
                                                <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-md relative group transition-all hover:shadow-lg ${msg.status === 'SENT'
                                                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                                                    : 'bg-card text-card-foreground rounded-tl-none border border-border/50'
                                                    }`}>
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    <div className={`flex items-center justify-end gap-1.5 mt-2 ${msg.status === 'SENT' ? 'text-primary-foreground/60' : 'text-muted-foreground/60'
                                                        }`}>
                                                        <span className="text-[9px] font-bold uppercase tracking-tighter">
                                                            {format(new Date(msg.createdAt), 'HH:mm aaa')}
                                                        </span>
                                                        {msg.status === 'SENT' && (
                                                            <div className="flex">
                                                                <Check className="h-3 w-3 text-white/80" />
                                                                <Check className="h-3 w-3 -ml-1.5 text-white/50" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Tooltip for Msg Details (concept) */}
                                                    <div className="absolute top-0 right-full mr-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-[8px] text-white px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
                                                        Delivered by Bird
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Chat Input Box */}
                                <div className="p-4 bg-card/80 backdrop-blur-lg border-t flex items-end gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 transition-all focus-within:bg-card">
                                    <div className="flex gap-1 shrink-0 mb-1">
                                        <Button variant="ghost" size="sm" className="h-10 w-10 text-muted-foreground rounded-full hover:bg-muted/80">
                                            <Smile className="h-6 w-6" />
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-10 w-10 text-muted-foreground rounded-full hover:bg-muted/80">
                                            <Paperclip className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <div className="flex-1 relative">
                                        <Textarea
                                            placeholder="Write your message..."
                                            className="min-h-[44px] max-h-40 py-3 pr-4 pl-4 border-none bg-muted/30 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-2xl text-[15px] resize-none overflow-hidden transition-all duration-200"
                                            value={newMessage}
                                            onChange={e => {
                                                setNewMessage(e.target.value);
                                                // Auto-resize textarea logic can be added here
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                            rows={1}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        className={`rounded-full shadow-lg h-12 w-12 shrink-0 transition-all duration-300 ${newMessage.trim() ? 'scale-105 bg-primary' : 'bg-muted text-muted-foreground scale-95 opacity-50'
                                            }`}
                                        onClick={handleSendMessage}
                                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                                    >
                                        {sendMessageMutation.isPending ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <SendHorizontal className="h-6 w-6 translate-x-0.5" />
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-card/30 backdrop-blur-sm m-4 rounded-[40px] border-4 border-white dark:border-white/5 shadow-2xl overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 group-hover:bg-primary/10 transition-all duration-1000" />

                                <div className="h-32 w-32 rounded-3xl bg-card border-2 border-primary/10 flex items-center justify-center mb-8 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500 relative z-10">
                                    <div className="absolute -top-4 -right-4 h-12 w-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg animate-bounce">
                                        <MessageSquare className="h-6 w-6" />
                                    </div>
                                    <Mail className="h-16 w-16 text-primary/20" />
                                </div>

                                <div className="relative z-10">
                                    <h3 className="text-3xl font-black mb-3 tracking-tight">Your Omni-Channel Dashboard</h3>
                                    <p className="text-muted-foreground max-w-sm mb-10 leading-relaxed text-sm">
                                        Experience the future of client communication. Connect via WhatsApp Cloud or SMTP with a single, elegant interface.
                                    </p>

                                    <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
                                        <Button
                                            className="h-14 rounded-2xl gap-3 font-bold text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-all"
                                            onClick={() => { setComposeType('MESSAGE'); setIsComposeOpen(true); }}
                                        >
                                            <Plus className="h-5 w-5" /> Start New Conversation
                                        </Button>
                                        <div className="flex items-center gap-4 py-2">
                                            <Separator className="flex-1" />
                                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/50">or</span>
                                            <Separator className="flex-1" />
                                        </div>
                                        <Button
                                            variant="outline"
                                            className="h-12 rounded-2xl gap-2 font-semibold hover:bg-primary/5 border-primary/20"
                                            onClick={() => router.push('/settings/communication')}
                                        >
                                            <Settings className="h-4 w-4" /> Go to Configs
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
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
        </div>
    );
}
