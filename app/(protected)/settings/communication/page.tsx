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

    const resetSmtpForm = () => {
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
        setEditingSmtpId(config.id);
        setIsSmtpModalOpen(true);
    };

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
        <div className="container max-w-5xl py-10 space-y-8">
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

                <TabsContent value="email" className="space-y-6 mt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">SMTP Server Configurations</h2>
                        <Button onClick={() => { resetSmtpForm(); setIsSmtpModalOpen(true); }} size="sm" className="gap-2">
                            <Plus className="h-4 w-4" /> Add New Config
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {smtpConfigs?.length === 0 ? (
                            <Card className="md:col-span-2 border-dashed flex flex-col items-center py-12">
                                <Mail className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <p className="text-muted-foreground">No SMTP configurations found.</p>
                                <Button variant="outline" onClick={() => setIsSmtpModalOpen(true)} className="mt-4">
                                    Click here to add your first setting
                                </Button>
                            </Card>
                        ) : (
                            smtpConfigs?.map((config: any) => (
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
                                                <Button variant="ghost" size="sm" onClick={() => handleEditSmtp(config)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => { if (confirm("Are you sure?")) deleteSmtpMutation.mutate({ id: config.id }); }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <CardDescription className="flex items-center gap-4">
                                            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3" /> {config.host}:{config.port}</span>
                                            <Badge variant="outline" className="text-[10px] h-4 font-bold tracking-wider">{config.security}</Badge>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-4">
                                        <div className="text-sm space-y-1 text-muted-foreground">
                                            <p><span className="font-medium text-foreground">User:</span> {config.user}</p>
                                            <p><span className="font-medium text-foreground">From:</span> {config.from}</p>
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            {!config.isDefault && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => setDefaultSmtpMutation.mutate({ id: config.id })}
                                                    disabled={setDefaultSmtpMutation.isPending}
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
                <DialogHeader>
                    <DialogTitle>{editingSmtpId ? 'Edit SMTP Configuration' : 'Add SMTP Configuration'}</DialogTitle>
                    <DialogDescription>
                        Enter details for your email provider (Gmail, Mailtrap, AWS SES, etc.)
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSmtpSubmit}>
                    <DialogContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="smtp-name">Setting Name</Label>
                            <Input
                                id="smtp-name"
                                placeholder="e.g. Mailtrap Sandbox"
                                value={smtpForm.name}
                                onChange={e => setSmtpForm({ ...smtpForm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="host">SMTP Host</Label>
                                <Input
                                    id="host"
                                    placeholder="smtp.mailtrap.io"
                                    value={smtpForm.host}
                                    onChange={e => setSmtpForm({ ...smtpForm, host: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">Port</Label>
                                <Input
                                    id="port"
                                    type="number"
                                    placeholder="587"
                                    value={smtpForm.port}
                                    onChange={e => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="user">Username</Label>
                                <Input
                                    id="user"
                                    value={smtpForm.user}
                                    onChange={e => setSmtpForm({ ...smtpForm, user: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pass">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="pass"
                                        type={showSmtpPass ? "text" : "password"}
                                        value={smtpForm.pass}
                                        onChange={e => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                                        required
                                        className="pr-10"
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
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="from">Sender Email (From)</Label>
                            <Input
                                id="from"
                                placeholder="noreply@yourcompany.com"
                                value={smtpForm.from}
                                onChange={e => setSmtpForm({ ...smtpForm, from: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Security Protocol</Label>
                            <Select
                                value={smtpForm.security}
                                onValueChange={value => setSmtpForm({ ...smtpForm, security: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Security" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="NONE">None (Insecure)</SelectItem>
                                    <SelectItem value="TLS">STARTTLS (Port 587)</SelectItem>
                                    <SelectItem value="SSL">SSL/TLS (Port 465)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="smtp-isDefault"
                                checked={smtpForm.isDefault}
                                onChange={e => setSmtpForm({ ...smtpForm, isDefault: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="smtp-isDefault" className="cursor-pointer">Set as default configuration</Label>
                        </div>
                    </DialogContent>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsSmtpModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createSmtpMutation.isPending || updateSmtpMutation.isPending}>
                            {(createSmtpMutation.isPending || updateSmtpMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingSmtpId ? 'Update Configuration' : 'Save Configuration'}
                        </Button>
                    </DialogFooter>
                </form>
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
        </div>
    );
}
