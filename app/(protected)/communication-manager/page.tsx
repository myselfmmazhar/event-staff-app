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
    Send,
    Inbox,
    SendHorizonal,
    Check,
    AlertCircle,
    ChevronLeft,
    MoreVertical,
    Paperclip,
    Smile,
    User,
    Settings,
    Filter,
    Trash2,
    RotateCcw,
    ShieldAlert,
} from 'lucide-react';
import { MessageType, MessageStatus } from '@prisma/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

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

    // Filters & Pagination
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

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

    const [newMessage, setNewMessage] = useState('');
    const [selectedLogs, setSelectedLogs] = useState<string[]>([]);

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

    // Mutations
    const sendEmailMutation = trpc.communication.sendEmailAdHoc.useMutation({
        onSuccess: () => {
            toast({ title: 'Email sent successfully' });
            setIsComposeOpen(false);
            setEmailForm({ to: '', subject: '', content: '', configId: '' });
            utils.communication.getLogs.invalidate();
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
    const getInitials = (name: string) => {
        return name
            .split(/[.@]/)
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

    const handleSendMessage = () => {
        if (!selectedRecipient || !newMessage.trim()) return;

        sendMessageMutation.mutate({
            to: selectedRecipient,
            content: newMessage,
        });
    };

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
            <div className="w-72 border-r bg-card/50 backdrop-blur-md flex flex-col shrink-0">
                <div className="p-6 border-b flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-xl tracking-tight">
                            {activeTab === 'email' ? 'Email Hub' : 'Messaging'}
                        </h2>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mt-0.5">
                            {activeTab === 'email' ? 'Inbox & Outbox' : 'Direct Conversations'}
                        </p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto py-4">
                    {activeTab === 'email' ? (
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
                                icon={SendHorizonal}
                                label="Sent Messages"
                                active={emailFolder === 'SENT'}
                                onClick={() => setEmailFolder('SENT')}
                                badge={logsData?.logs.filter((l: any) => l.type === 'EMAIL' && !l.isTrashed).length.toString() || '0'}
                            />
                            <SidebarItem
                                icon={Trash2}
                                label="Trash"
                                active={emailFolder === 'TRASH'}
                                onClick={() => { setEmailFolder('TRASH'); setSelectedLogs([]); }}
                                badge={logsData?.logs.filter((l: any) => l.isTrashed).length.toString() || '0'}
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
                                    conversations?.map((conv) => (
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

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden">
                {activeTab === 'email' ? (
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
                                            {emailFolder === 'SENT' ? <SendHorizonal className="h-5 w-5" /> : <Trash2 className="h-5 w-5" />}
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
                                            size="icon"
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
                                                                        size="icon"
                                                                        className="h-8 w-8 text-primary hover:bg-primary/20 rounded-full"
                                                                        title="Restore"
                                                                        onClick={(e) => { e.stopPropagation(); restoreLogsMutation.mutate({ ids: [log.id] }); }}
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
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
                                                                    size="icon"
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
                                        chatHistory?.map((msg, idx) => (
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
                                            <SendHorizonal className="h-6 w-6 translate-x-0.5" />
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
                <DialogHeader className="bg-primary/5 py-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 text-primary rounded-xl">
                            {composeType === 'EMAIL' ? <Mail className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black tracking-tight leading-none">New {composeType === 'EMAIL' ? 'Broadcast' : 'Direct Message'}</DialogTitle>
                            <DialogDescription className="text-xs uppercase font-bold tracking-widest text-primary/60 mt-1">Outbound Communication</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <form onSubmit={handleComposeSubmit}>
                    <DialogContent className="space-y-6 pt-6 bg-card border-none">
                        {composeType === 'EMAIL' ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors group-focus-within:text-primary">Sender Profile</Label>
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
                    </DialogContent>
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
            </Dialog>

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
