'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Save, Mail, MessageSquare, ExternalLink, Plus, Trash2, Check, Send, Edit2, ShieldCheck, Smartphone, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function CommunicationSettingsPage() {
    const { toast } = useToast();
    const utils = trpc.useUtils();

    // SMTP Settings
    const { data: smtpConfigs, isLoading: isSmtpLoading } = trpc.settings.listSmtpConfigs.useQuery();
    const createSmtpMutation = trpc.settings.createSmtpConfig.useMutation({
        onSuccess: () => {
            toast({ title: 'SMTP configuration created' });
            utils.settings.listSmtpConfigs.invalidate();
            setIsSmtpModalOpen(false);
            resetSmtpForm();
        }
    });
    const updateSmtpMutation = trpc.settings.updateSmtpConfig.useMutation({
        onSuccess: () => {
            toast({ title: 'SMTP configuration updated' });
            utils.settings.listSmtpConfigs.invalidate();
            setIsSmtpModalOpen(false);
            resetSmtpForm();
        }
    });
    const deleteSmtpMutation = trpc.settings.deleteSmtpConfig.useMutation({
        onSuccess: () => {
            toast({ title: 'SMTP configuration deleted' });
            utils.settings.listSmtpConfigs.invalidate();
        }
    });
    const setDefaultSmtpMutation = trpc.settings.setDefaultSmtpConfig.useMutation({
        onSuccess: () => {
            toast({ title: 'Default SMTP updated' });
            utils.settings.listSmtpConfigs.invalidate();
        }
    });

    // Messaging Settings
    const { data: messagingConfigs, isLoading: isMessagingLoading } = trpc.settings.listMessagingConfigs.useQuery();
    const createMessagingMutation = trpc.settings.createMessagingConfig.useMutation({
        onSuccess: () => {
            toast({ title: 'Messaging configuration created' });
            utils.settings.listMessagingConfigs.invalidate();
            setIsMessagingModalOpen(false);
            resetMessagingForm();
        }
    });
    const updateMessagingMutation = trpc.settings.updateMessagingConfig.useMutation({
        onSuccess: () => {
            toast({ title: 'Messaging configuration updated' });
            utils.settings.listMessagingConfigs.invalidate();
            setIsMessagingModalOpen(false);
            resetMessagingForm();
        }
    });
    const deleteMessagingMutation = trpc.settings.deleteMessagingConfig.useMutation({
        onSuccess: () => {
            toast({ title: 'Messaging configuration deleted' });
            utils.settings.listMessagingConfigs.invalidate();
        }
    });
    const setDefaultMessagingMutation = trpc.settings.setDefaultMessagingConfig.useMutation({
        onSuccess: () => {
            toast({ title: 'Default messaging updated' });
            utils.settings.listMessagingConfigs.invalidate();
        }
    });



    // SMTP Form State
    const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
    const [editingSmtpId, setEditingSmtpId] = useState<string | null>(null);
    const [smtpProvider, setSmtpProvider] = useState<string>('');
    const [smtpForm, setSmtpForm] = useState({
        name: '',
        host: '',
        port: 587,
        user: '',
        pass: '',
        from: '',
        security: 'TLS',
        isDefault: false
    });

    // Messaging Form State
    const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);
    const [editingMessagingId, setEditingMessagingId] = useState<string | null>(null);
    const [messagingForm, setMessagingForm] = useState({
        name: '',
        provider: 'BIRD',
        apiKey: '',
        workspaceId: '',
        channelId: '',
        isDefault: false
    });

    const [showSmtpPass, setShowSmtpPass] = useState(false);
    const [showBirdKey, setShowBirdKey] = useState(false);

    // Mailgun specific state
    const [isMailgunModalOpen, setIsMailgunModalOpen] = useState(false);
    const [fetchingDomains, setFetchingDomains] = useState(false);
    const [mailgunDomains, setMailgunDomains] = useState<string[]>([]);
    const [showMailgunKey, setShowMailgunKey] = useState(false);
    const [mailgunForm, setMailgunForm] = useState({
        name: 'Mailgun Sandbox',
        apiKey: '',
        domain: '',
        from: '',
        isDefault: false
    });

    const fetchDomainsMutation = trpc.settings.getMailgunDomains.useMutation({
        onSuccess: (domains) => {
            setMailgunDomains(domains);
            setFetchingDomains(false);
            if (domains.length > 0 && !mailgunForm.domain) {
                setMailgunForm(prev => ({ ...prev, domain: domains[0] }));
            }
            toast({ title: 'Mailgun domains fetched' });
        },
        onError: (err) => {
            setFetchingDomains(false);
            toast({ title: 'Failed to fetch domains', description: err.message, variant: 'error' });
        }
    });

    const handleFetchDomains = (apiKey: string) => {
        if (!apiKey) return;
        setFetchingDomains(true);
        fetchDomainsMutation.mutate({ apiKey });
    };

    const resetSmtpForm = () => {
        setSmtpProvider('');
        setSmtpForm({
            name: '',
            host: '',
            port: 587,
            user: '',
            pass: '',
            from: '',
            security: 'TLS',
            isDefault: false
        });
        setEditingSmtpId(null);
        setShowSmtpPass(false);
    };

    const resetMessagingForm = () => {
        setMessagingForm({
            name: '',
            provider: 'BIRD',
            apiKey: '',
            workspaceId: '',
            channelId: '',
            isDefault: false
        });
        setEditingMessagingId(null);
        setShowBirdKey(false);
    };

    const handleEditSmtp = (config: any) => {
        setSmtpForm({
            name: config.name,
            host: config.host,
            port: config.port,
            user: config.user,
            pass: config.pass,
            from: config.from,
            security: config.security || 'TLS',
            isDefault: config.isDefault
        });

        // Detect provider for UI
        if (config.host?.includes('gmail.com')) setSmtpProvider('GMAIL');
        else if (config.host?.includes('yahoo.com')) setSmtpProvider('YAHOO');
        else if (config.host?.includes('sendgrid.net')) setSmtpProvider('SENDGRID');
        else setSmtpProvider('OTHER');

        setEditingSmtpId(config.id);
        setIsSmtpModalOpen(true);
    };

    // Keep SMTP static values updated based on provider
    useEffect(() => {
        if (!isSmtpModalOpen) return;

        if (smtpProvider === 'GMAIL') {
            setSmtpForm(prev => ({
                ...prev,
                name: prev.name === '' || prev.name === 'Yahoo Mail' || prev.name === 'Sendgrid' ? 'Gmail' : prev.name,
                host: 'smtp.gmail.com',
                port: 587,
                security: 'TLS'
            }));
        } else if (smtpProvider === 'YAHOO') {
            setSmtpForm(prev => ({
                ...prev,
                name: prev.name === '' || prev.name === 'Gmail' || prev.name === 'Sendgrid' ? 'Yahoo Mail' : prev.name,
                host: 'smtp.mail.yahoo.com',
                port: 587,
                security: 'TLS'
            }));
        } else if (smtpProvider === 'SENDGRID') {
            setSmtpForm(prev => ({
                ...prev,
                name: prev.name === '' || prev.name === 'Gmail' || prev.name === 'Yahoo Mail' ? 'Sendgrid' : prev.name,
                host: 'smtp.sendgrid.net',
                port: 587,
                security: 'TLS'
            }));
        }
    }, [smtpProvider, isSmtpModalOpen]);

    const handleEditMessaging = (config: any) => {
        setMessagingForm({
            name: config.name,
            provider: config.provider,
            apiKey: config.apiKey,
            workspaceId: config.workspaceId || '',
            channelId: config.channelId || '',
            isDefault: config.isDefault
        });
        setEditingMessagingId(config.id);
        setIsMessagingModalOpen(true);
    };

    const handleSmtpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSmtpId) {
            updateSmtpMutation.mutate({ id: editingSmtpId, ...smtpForm });
        } else {
            createSmtpMutation.mutate(smtpForm);
        }
    };

    const handleMailgunSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const existingMailgun = messagingConfigs?.find((c: any) => c.provider === 'MAILGUN' && c.name === mailgunForm.name);

        if (existingMailgun) {
            updateMessagingMutation.mutate({
                id: existingMailgun.id,
                name: mailgunForm.name,
                provider: 'MAILGUN',
                apiKey: mailgunForm.apiKey,
                workspaceId: mailgunForm.domain,
                from: mailgunForm.from,
                isDefault: mailgunForm.isDefault
            });
        } else {
            createMessagingMutation.mutate({
                name: mailgunForm.name,
                provider: 'MAILGUN',
                apiKey: mailgunForm.apiKey,
                workspaceId: mailgunForm.domain,
                from: mailgunForm.from,
                isDefault: mailgunForm.isDefault
            });
        }
        setIsMailgunModalOpen(false);
    };

    const handleEditMailgun = (config: any) => {
        setMailgunForm({
            name: config.name,
            apiKey: config.apiKey,
            domain: config.workspaceId || '',
            from: config.from || '',
            isDefault: config.isDefault
        });
        handleFetchDomains(config.apiKey);
        setIsMailgunModalOpen(true);
    };

    const handleMessagingSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingMessagingId) {
            updateMessagingMutation.mutate({ id: editingMessagingId, ...messagingForm });
        } else {
            createMessagingMutation.mutate(messagingForm);
        }
    };



    if (isSmtpLoading || isMessagingLoading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Communication Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your email providers and messaging services.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="email" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email (SMTP)
                    </TabsTrigger>
                    <TabsTrigger value="message" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Messaging (Bird)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="space-y-8 mt-6">
                    {/* Mailgun Provider Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-semibold">Mailgun API Provider</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
                                <CardHeader className="pb-3 border-b bg-muted/20">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <Send className="h-4 w-4 text-primary" />
                                            <CardTitle className="text-base">Mailgun API</CardTitle>
                                        </div>
                                        {messagingConfigs?.find((c: any) => c.provider === 'MAILGUN') && (
                                            <Badge variant="success" className="h-5">Active</Badge>
                                        )}
                                    </div>
                                    <CardDescription>Direct API integration for sending emails</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {messagingConfigs?.find((c: any) => c.provider === 'MAILGUN') ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Domain</p>
                                                    <p className="font-medium truncate">{messagingConfigs.find((c: any) => c.provider === 'MAILGUN').workspaceId}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Status</p>
                                                    <div className="flex items-center gap-1 text-green-600">
                                                        <Check className="h-3 w-3" />
                                                        <span>Configured</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full gap-2 border-primary/20 hover:bg-primary/10"
                                                onClick={() => handleEditMailgun(messagingConfigs.find((c: any) => c.provider === 'MAILGUN'))}
                                            >
                                                <Edit2 className="h-4 w-4" /> Edit Mailgun Key
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <p className="text-sm text-muted-foreground">
                                                No Mailgun API configured. Setup your Mailgun credentials to send high-deliverability emails.
                                            </p>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="w-full gap-2"
                                                onClick={() => {
                                                    setMailgunForm({ name: 'Mailgun Sandbox', apiKey: '', domain: '', from: '', isDefault: false });
                                                    setMailgunDomains([]);
                                                    setIsMailgunModalOpen(true);
                                                }}
                                            >
                                                <Plus className="h-4 w-4" /> Setup Mailgun API
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Custom SMTP Section */}
                    <div className="space-y-4 border-t pt-8">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-semibold">Custom SMTP Servers</h2>
                            </div>
                            <Button onClick={() => { resetSmtpForm(); setIsSmtpModalOpen(true); }} size="sm" className="gap-2" variant="outline">
                                <Plus className="h-4 w-4" /> Add SMTP Server
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {smtpConfigs?.length === 0 ? (
                                <Card className="md:col-span-2 border-dashed flex flex-col items-center py-16 bg-muted/5">
                                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                        <Mail className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                    <h3 className="text-lg font-medium">No SMTP configurations found</h3>
                                    <p className="text-muted-foreground text-sm max-w-xs text-center mt-2">
                                        You haven't added any custom SMTP servers yet. Add one to use your own email service.
                                    </p>
                                    <Button variant="default" onClick={() => setIsSmtpModalOpen(true)} className="mt-6 gap-2">
                                        <Plus className="h-4 w-4" /> Add SMTP setting
                                    </Button>
                                </Card>
                            ) : (
                                smtpConfigs?.map((config: any) => (
                                    <Card key={config.id} className={config.isDefault ? "border-primary/50 shadow-md ring-1 ring-primary/20" : "hover:border-primary/20 transition-colors"}>
                                        <CardHeader className="pb-3 px-6 pt-6">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-lg">{config.name}</CardTitle>
                                                    {config.isDefault && (
                                                        <Badge variant="success" className="gap-1">
                                                            <Check className="h-3 w-3" /> Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEditSmtp(config)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => { if (confirm("Are you sure?")) deleteSmtpMutation.mutate({ id: config.id }); }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <CardDescription className="flex items-center gap-4 mt-2">
                                                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> {config.host}:{config.port}</span>
                                                <Badge variant="secondary" className="text-[10px] h-4 font-bold tracking-wider">{config.security}</Badge>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="pb-6 px-6">
                                            <div className="text-sm space-y-1.5 p-3 rounded-lg bg-muted/30">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">User:</span>
                                                    <span className="font-medium">{config.user}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">From:</span>
                                                    <span className="font-medium">{config.from}</span>
                                                </div>
                                            </div>
                                            {!config.isDefault && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    className="w-full mt-4"
                                                    onClick={() => setDefaultSmtpMutation.mutate({ id: config.id })}
                                                    disabled={setDefaultSmtpMutation.isPending}
                                                >
                                                    Set as Default Server
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="message" className="space-y-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Messaging Settings (Bird)</h2>
                        <Button onClick={() => { resetMessagingForm(); setIsMessagingModalOpen(true); }} size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Add New Config
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {messagingConfigs?.length === 0 ? (
                            <Card className="md:col-span-2 border-dashed flex flex-col items-center py-12">
                                <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground">No messaging configurations found.</p>
                                <Button variant="outline" onClick={() => setIsMessagingModalOpen(true)} className="mt-4">
                                    Click here to add your first setting
                                </Button>
                            </Card>
                        ) : (
                            messagingConfigs?.map((config: any) => (
                                <Card key={config.id} className={config.isDefault ? "border-primary/50 shadow-md ring-1 ring-primary/20" : ""}>
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-lg">{config.name}</CardTitle>
                                                {config.isDefault && (
                                                    <Badge variant="success" className="gap-1">
                                                        <Check className="h-3 w-3" /> Default
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleEditMessaging(config)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => { if (confirm("Are you sure?")) deleteMessagingMutation.mutate({ id: config.id }); }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardDescription className="flex items-center gap-2 uppercase font-medium text-xs">
                                            <Smartphone className="h-3 w-3" /> {config.provider} PROVIDER
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <div className="text-sm space-y-1 text-muted-foreground">
                                            <p><span className="font-medium text-foreground">API Key:</span> ••••••••••••</p>
                                            <p><span className="font-medium text-foreground">Workspace:</span> {config.workspaceId || 'N/A'}</p>
                                            <p><span className="font-medium text-foreground">Channel:</span> {config.channelId || 'N/A'}</p>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            {!config.isDefault && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => setDefaultMessagingMutation.mutate({ id: config.id })}
                                                    disabled={setDefaultMessagingMutation.isPending}
                                                >
                                                    Set Default
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* SMTP Config Modal */}
            <Dialog open={isSmtpModalOpen} onClose={() => setIsSmtpModalOpen(false)}>
                <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
                    <form onSubmit={handleSmtpSubmit}>
                        <div className="p-8 space-y-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                                        <Mail className="h-6 w-6" />
                                    </div>
                                    <DialogTitle className="text-2xl font-bold tracking-tight">
                                        {editingSmtpId ? 'Edit email service' : 'Add your own email service'}
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground text-sm">
                                        Configure your SMTP provider like Outlook, Gsuite, Sendgrid, etc
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold">SMTP Provider <span className="text-destructive">*</span></Label>
                                    <Select value={smtpProvider} onValueChange={setSmtpProvider}>
                                        <SelectTrigger className="h-12 rounded-xl focus:ring-primary/20">
                                            <SelectValue placeholder="Select Provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="GMAIL">Gmail</SelectItem>
                                            <SelectItem value="YAHOO">Yahoo Mail</SelectItem>
                                            <SelectItem value="SENDGRID">Sendgrid</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {smtpProvider && (
                                    <>
                                        {smtpProvider === 'OTHER' && (
                                            <>
                                                <div className="space-y-2">
                                                    <Label htmlFor="smtp-name">Provider Name <span className="text-destructive">*</span></Label>
                                                    <Input
                                                        id="smtp-name"
                                                        placeholder="Provider Name"
                                                        className="h-12 rounded-xl"
                                                        value={smtpForm.name}
                                                        onChange={e => setSmtpForm({ ...smtpForm, name: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="host">SMTP Server <span className="text-destructive">*</span></Label>
                                                        <Input
                                                            id="host"
                                                            placeholder="smtp.gmail.com"
                                                            className="h-12 rounded-xl"
                                                            value={smtpForm.host}
                                                            onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label htmlFor="port">SMTP Port Number <span className="text-destructive">*</span></Label>
                                                        <Input
                                                            id="port"
                                                            type="number"
                                                            placeholder="587"
                                                            className="h-12 rounded-xl"
                                                            value={smtpForm.port}
                                                            onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {smtpProvider === 'SENDGRID' && (
                                            <div className="space-y-2">
                                                <Label htmlFor="user">Username</Label>
                                                <Input
                                                    id="user"
                                                    placeholder="Username"
                                                    className="h-12 rounded-xl"
                                                    value={smtpForm.user}
                                                    onChange={e => setSmtpForm({ ...smtpForm, user: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="from">Email <span className="text-destructive">*</span></Label>
                                            <Input
                                                id="from"
                                                placeholder="Email"
                                                className="h-12 rounded-xl"
                                                value={smtpForm.from}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (smtpProvider === 'GMAIL' || smtpProvider === 'YAHOO') {
                                                        setSmtpForm(prev => ({ ...prev, from: val, user: val }));
                                                    } else {
                                                        setSmtpForm(prev => ({ ...prev, from: val }));
                                                    }
                                                }}
                                                required
                                            />
                                        </div>

                                        {smtpProvider === 'OTHER' && (
                                            <div className="space-y-2">
                                                <Label htmlFor="user">Username</Label>
                                                <Input
                                                    id="user"
                                                    placeholder="Username"
                                                    className="h-12 rounded-xl"
                                                    value={smtpForm.user}
                                                    onChange={e => setSmtpForm({ ...smtpForm, user: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="pass">Password <span className="text-destructive">*</span></Label>
                                                {smtpProvider === 'GMAIL' && (
                                                    <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline font-medium">
                                                        How to create app password
                                                    </a>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    id="pass"
                                                    type={showSmtpPass ? "text" : "password"}
                                                    placeholder="Password"
                                                    className="h-12 rounded-xl pr-10"
                                                    value={smtpForm.pass}
                                                    onChange={e => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showSmtpPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>

                                        {smtpProvider === 'OTHER' && (
                                            <div className="space-y-2">
                                                <Label>Security Protocol</Label>
                                                <Select
                                                    value={smtpForm.security}
                                                    onValueChange={value => setSmtpForm({ ...smtpForm, security: value })}
                                                >
                                                    <SelectTrigger className="h-12 rounded-xl">
                                                        <SelectValue placeholder="Select Security" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="NONE">None (Insecure)</SelectItem>
                                                        <SelectItem value="TLS">STARTTLS (Port 587)</SelectItem>
                                                        <SelectItem value="SSL">SSL/TLS (Port 465)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 pt-2">
                                            <input
                                                type="checkbox"
                                                id="smtp-isDefault"
                                                checked={smtpForm.isDefault}
                                                onChange={e => setSmtpForm({ ...smtpForm, isDefault: e.target.checked })}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <Label htmlFor="smtp-isDefault" className="cursor-pointer text-sm">Set as default configuration</Label>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="bg-muted/30 p-6 flex justify-end gap-3">
                            <Button type="button" variant="outline" className="h-11 px-6 rounded-xl font-semibold" onClick={() => setIsSmtpModalOpen(false)}>Cancel</Button>
                            <Button
                                type="submit"
                                disabled={createSmtpMutation.isPending || updateSmtpMutation.isPending || !smtpProvider}
                                className="h-11 px-8 rounded-xl font-bold"
                            >
                                {(createSmtpMutation.isPending || updateSmtpMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Messaging Config Modal */}
            <Dialog open={isMessagingModalOpen} onClose={() => setIsMessagingModalOpen(false)}>
                <DialogHeader>
                    <DialogTitle>{editingMessagingId ? 'Edit Messaging Configuration' : 'Add Messaging Configuration'}</DialogTitle>
                    <DialogDescription>
                        Enter details for your messaging provider (Bird, etc.)
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleMessagingSubmit}>
                    <DialogContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="msg-name">Setting Name</Label>
                            <Input
                                id="msg-name"
                                placeholder="e.g. Bird Primary"
                                value={messagingForm.name}
                                onChange={e => setMessagingForm({ ...messagingForm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">Access Key (API Key)</Label>
                            <div className="relative">
                                <Input
                                    id="apiKey"
                                    type={showBirdKey ? "text" : "password"}
                                    placeholder="bird_live_..."
                                    value={messagingForm.apiKey}
                                    onChange={e => setMessagingForm({ ...messagingForm, apiKey: e.target.value })}
                                    required
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowBirdKey(!showBirdKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showBirdKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="workspaceId">Workspace ID</Label>
                                <Input
                                    id="workspaceId"
                                    placeholder="workspace-uuid"
                                    value={messagingForm.workspaceId}
                                    onChange={e => setMessagingForm({ ...messagingForm, workspaceId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="channelId">Channel ID / Originator</Label>
                                <Input
                                    id="channelId"
                                    placeholder="channel-uuid"
                                    value={messagingForm.channelId}
                                    onChange={e => setMessagingForm({ ...messagingForm, channelId: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="msg-isDefault"
                                checked={messagingForm.isDefault}
                                onChange={e => setMessagingForm({ ...messagingForm, isDefault: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="msg-isDefault" className="cursor-pointer">Set as default configuration</Label>
                        </div>
                    </DialogContent>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsMessagingModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createMessagingMutation.isPending || updateMessagingMutation.isPending}>
                            {(createMessagingMutation.isPending || updateMessagingMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingMessagingId ? 'Update Configuration' : 'Save Configuration'}
                        </Button>
                    </DialogFooter>
                </form>
            </Dialog>
            {/* Mailgun Modal */}
            <Dialog open={isMailgunModalOpen} onClose={() => setIsMailgunModalOpen(false)}>
                <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
                    <form onSubmit={handleMailgunSubmit}>
                        <div className="p-8 space-y-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                                        <Send className="h-6 w-6" />
                                    </div>
                                    <DialogTitle className="text-2xl font-bold tracking-tight">
                                        Configure Mailgun
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground text-sm">
                                        Enter your API key to fetch and select a domain
                                    </DialogDescription>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mg-apiKey">Mailgun API Key <span className="text-destructive">*</span></Label>
                                    <div className="relative">
                                        <Input
                                            id="mg-apiKey"
                                            type={showMailgunKey ? "text" : "password"}
                                            placeholder="key-..."
                                            className="h-12 rounded-xl pr-10"
                                            value={mailgunForm.apiKey}
                                            onBlur={() => handleFetchDomains(mailgunForm.apiKey)}
                                            onChange={e => setMailgunForm({ ...mailgunForm, apiKey: e.target.value })}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowMailgunKey(!showMailgunKey)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showMailgunKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {mailgunForm.apiKey && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="mg-domain">Select Domain <span className="text-destructive">*</span></Label>
                                            <div className="relative">
                                                <Select
                                                    value={mailgunForm.domain}
                                                    onValueChange={val => setMailgunForm({ ...mailgunForm, domain: val })}
                                                >
                                                    <SelectTrigger className="h-12 rounded-xl">
                                                        <SelectValue placeholder={fetchingDomains ? "Fetching..." : "Select Domain"} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {mailgunDomains.map(d => (
                                                            <SelectItem key={d} value={d}>{d}</SelectItem>
                                                        ))}
                                                        {mailgunDomains.length === 0 && !fetchingDomains && (
                                                            <div className="p-2 text-xs text-muted-foreground text-center">No domains found</div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {fetchingDomains && (
                                                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="mg-from">From Email <span className="text-destructive">*</span></Label>
                                            <Input
                                                id="mg-from"
                                                type="email"
                                                placeholder="your-email@example.com"
                                                className="h-12 rounded-xl"
                                                value={mailgunForm.from}
                                                onChange={e => setMailgunForm({ ...mailgunForm, from: e.target.value })}
                                                required
                                            />
                                            <p className="text-[10px] text-muted-foreground px-1">
                                                This email will appear as the sender for outbound messages.
                                            </p>
                                        </div>
                                    </>
                                )}

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="mg-isDefault"
                                        checked={mailgunForm.isDefault}
                                        onChange={e => setMailgunForm({ ...mailgunForm, isDefault: e.target.checked })}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <Label htmlFor="mg-isDefault" className="cursor-pointer text-sm font-medium">Set as default sender (Sandbox/Production)</Label>
                                </div>
                            </div>
                        </div>

                        <div className="bg-muted/30 p-6 flex justify-end gap-3">
                            <Button type="button" variant="outline" className="h-11 px-6 rounded-xl font-semibold" onClick={() => setIsMailgunModalOpen(false)}>Cancel</Button>
                            <Button
                                type="submit"
                                disabled={createMessagingMutation.isPending || updateMessagingMutation.isPending}
                                className="h-11 px-8 rounded-xl font-bold"
                            >
                                {(createMessagingMutation.isPending || updateMessagingMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Config
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
