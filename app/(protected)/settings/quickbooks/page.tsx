'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Loader2,
    Link2,
    Link2Off,
    RefreshCw,
    FileText,
    Receipt,
    Users,
    UserCheck,
    Briefcase,
    ExternalLink,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

export default function QuickBooksSettingsPage() {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const searchParams = useSearchParams();

    const { data: status, isLoading: isStatusLoading } = trpc.quickbooks.getStatus.useQuery();
    const { data: stats, isLoading: isStatsLoading } = trpc.quickbooks.getSyncStats.useQuery(
        undefined,
        { enabled: status?.connected === true }
    );

    const disconnectMutation = trpc.quickbooks.disconnect.useMutation({
        onSuccess: () => {
            toast({ title: 'Disconnected from QuickBooks' });
            utils.quickbooks.getStatus.invalidate();
            utils.quickbooks.getSyncStats.invalidate();
        },
        onError: (err) => {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        },
    });

    // Handle redirect params from OAuth callback
    useEffect(() => {
        const connected = searchParams.get('connected');
        const error = searchParams.get('error');
        if (connected === 'true') {
            toast({ title: 'QuickBooks connected successfully!' });
            utils.quickbooks.getStatus.invalidate();
        }
        if (error) {
            const messages: Record<string, string> = {
                oauth_failed: 'OAuth authentication failed. Please try again.',
                missing_realm_id: 'Could not retrieve QuickBooks company ID.',
            };
            toast({
                title: 'Connection failed',
                description: messages[error] ?? 'An unknown error occurred.',
                variant: 'destructive',
            });
        }
    }, [searchParams, toast, utils]);

    const handleConnect = () => {
        window.location.href = '/api/quickbooks/connect';
    };

    const handleDisconnect = () => {
        if (confirm('Are you sure you want to disconnect QuickBooks? Sync history will be preserved.')) {
            disconnectMutation.mutate();
        }
    };

    const statCards = [
        { label: 'Invoices Synced', value: stats?.invoices, icon: FileText, color: 'text-blue-500' },
        { label: 'Bills Synced', value: stats?.bills, icon: Receipt, color: 'text-orange-500' },
        { label: 'Clients Synced', value: stats?.clients, icon: Users, color: 'text-green-500' },
        { label: 'Staff Synced', value: stats?.staff, icon: UserCheck, color: 'text-purple-500' },
        { label: 'Services Synced', value: stats?.services, icon: Briefcase, color: 'text-pink-500' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none">
                        <rect width="32" height="32" rx="6" fill="#2CA01C" />
                        <path
                            d="M8 22l4-10 4 8 3-5 3 7"
                            stroke="white"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">QuickBooks Integration</h1>
                    <p className="text-sm text-muted-foreground">
                        Sync invoices, bills, clients and staff with QuickBooks Online
                    </p>
                </div>
            </div>

            {/* Connection Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Link2 className="h-5 w-5" />
                        Connection Status
                    </CardTitle>
                    <CardDescription>
                        Connect your QuickBooks Online account to enable two-way financial sync.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isStatusLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Checking connection...</span>
                        </div>
                    ) : status?.connected ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                        Connected to QuickBooks Online
                                    </p>
                                    <p className="text-xs text-green-600 dark:text-green-400">
                                        Company ID: {status.realmId} &nbsp;·&nbsp;
                                        Environment:{' '}
                                        <Badge variant="outline" className="text-xs capitalize">
                                            {status.environment}
                                        </Badge>
                                    </p>
                                    {status.tokenExpiry && (
                                        <p className="text-xs text-green-600 dark:text-green-400">
                                            Token expires:{' '}
                                            {new Date(status.tokenExpiry).toLocaleString()}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDisconnect}
                                    disabled={disconnectMutation.isPending}
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                >
                                    {disconnectMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Link2Off className="mr-2 h-4 w-4" />
                                    )}
                                    Disconnect
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
                                <AlertCircle className="h-5 w-5 shrink-0 text-yellow-600" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                        Not connected
                                    </p>
                                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                                        Connect your QuickBooks account to start syncing financial data.
                                    </p>
                                </div>
                            </div>
                            <Button onClick={handleConnect} className="gap-2">
                                <ExternalLink className="h-4 w-4" />
                                Connect QuickBooks Online
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Sync Stats */}
            {status?.connected && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <RefreshCw className="h-5 w-5" />
                                    Sync Overview
                                </CardTitle>
                                <CardDescription>
                                    Total records pushed to QuickBooks from this app.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isStatsLoading ? (
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading stats...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                                {statCards.map(({ label, value, icon: Icon, color }) => (
                                    <div
                                        key={label}
                                        className="rounded-lg border bg-card p-4 text-center"
                                    >
                                        <Icon className={`mx-auto mb-2 h-6 w-6 ${color}`} />
                                        <p className="text-2xl font-bold">{value ?? 0}</p>
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* How it works */}
            <Card>
                <CardHeader>
                    <CardTitle>How Sync Works</CardTitle>
                    <CardDescription>
                        Entity mapping between this app and QuickBooks Online.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="pb-2 text-left font-medium text-muted-foreground">
                                        This App
                                    </th>
                                    <th className="pb-2 text-left font-medium text-muted-foreground">
                                        QuickBooks
                                    </th>
                                    <th className="pb-2 text-left font-medium text-muted-foreground">
                                        Trigger
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {[
                                    { local: 'Client', qb: 'Customer', trigger: 'On invoice/manual sync' },
                                    { local: 'Invoice + Line Items', qb: 'Invoice', trigger: 'Manual sync button' },
                                    { local: 'Estimate + Line Items', qb: 'Estimate', trigger: 'Manual sync button' },
                                    { local: 'Bill + Line Items', qb: 'Bill (Expense)', trigger: 'Manual sync button' },
                                    { local: 'Staff (Contractor)', qb: 'Vendor', trigger: 'On bill/manual sync' },
                                    { local: 'Service', qb: 'Service Item', trigger: 'On invoice/bill sync' },
                                ].map((row) => (
                                    <tr key={row.local}>
                                        <td className="py-2 font-medium">{row.local}</td>
                                        <td className="py-2 text-muted-foreground">{row.qb}</td>
                                        <td className="py-2 text-muted-foreground">{row.trigger}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
