'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { BellIcon, CheckCircleIcon, ClockIcon } from '@/components/ui/icons';
import { CheckCheck, Loader2, Trash2, Eye, EyeOff } from 'lucide-react';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import type { NotificationType, NotificationPriority } from '@prisma/client';

/**
 * Notification type matching the API response
 */
interface Notification {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    actionUrl: string | null;
    isRead: boolean;
    batchCount: number;
    createdAt: Date;
}

export default function NotificationsPage() {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const {
        notifications,
        isLoading,
        markAllAsRead,
        isMarkingAllAsRead,
        unreadCount,
        markAsRead,
    } = useNotifications();

    const [activeTab, setActiveTab] = useState('all');
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Mark as unread mutation
    const markAsUnreadMutation = trpc.notification.markAsUnread.useMutation({
        onSuccess: () => {
            utils.notification.getAll.invalidate();
            utils.notification.getUnreadCount.invalidate();
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'error' });
        },
        onSettled: () => setActionInProgress(null),
    });

    // Delete single mutation
    const deleteMutation = trpc.notification.delete.useMutation({
        onSuccess: () => {
            toast({ title: 'Notification deleted' });
            utils.notification.getAll.invalidate();
            utils.notification.getUnreadCount.invalidate();
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'error' });
        },
        onSettled: () => setActionInProgress(null),
    });

    // Delete many mutation
    const deleteManyMutation = trpc.notification.deleteMany.useMutation({
        onSuccess: (data) => {
            toast({ title: `${data.count} notification(s) deleted` });
            setSelectedIds(new Set());
            utils.notification.getAll.invalidate();
            utils.notification.getUnreadCount.invalidate();
        },
        onError: (error) => {
            toast({ title: 'Error', description: error.message, variant: 'error' });
        },
    });

    const handleDelete = (id: string) => {
        setActionInProgress(id);
        deleteMutation.mutate({ id });
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        deleteManyMutation.mutate({ ids: Array.from(selectedIds) });
    };

    const handleMarkAsRead = async (id: string) => {
        setActionInProgress(id);
        await markAsRead(id);
        setActionInProgress(null);
    };

    const handleMarkAsUnread = (id: string) => {
        setActionInProgress(id);
        markAsUnreadMutation.mutate({ id });
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleSelectAll = (notifications: Notification[]) => {
        if (selectedIds.size === notifications.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(notifications.map(n => n.id)));
        }
    };

    // Type-safe filtering
    const typedNotifications = notifications as Notification[];
    const unreadNotifications = typedNotifications.filter((n) => !n.isRead);
    const readNotifications = typedNotifications.filter((n) => n.isRead);

    // Current tab notifications for selection
    const currentNotifications = activeTab === 'unread' ? unreadNotifications : typedNotifications;
    const allSelected = currentNotifications.length > 0 && selectedIds.size === currentNotifications.length;
    const someSelected = selectedIds.size > 0;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="space-y-4 mt-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Notifications</h1>
                    <p className="text-muted-foreground mt-1">
                        Stay updated on your events and invitations
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {someSelected && (
                        <Button
                            variant="outline"
                            onClick={handleDeleteSelected}
                            disabled={deleteManyMutation.isPending}
                            className="text-destructive hover:text-destructive"
                        >
                            {deleteManyMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                            )}
                            Delete {selectedIds.size}
                        </Button>
                    )}
                    {unreadCount > 0 && !someSelected && (
                        <Button
                            variant="outline"
                            onClick={markAllAsRead}
                            disabled={isMarkingAllAsRead}
                        >
                            {isMarkingAllAsRead ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCheck className="h-4 w-4 mr-2" />
                            )}
                            Mark all as read
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard
                    icon={<BellIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                    value={typedNotifications.length}
                    label="Total"
                    colorClass="blue"
                />
                <SummaryCard
                    icon={<ClockIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
                    value={unreadNotifications.length}
                    label="Unread"
                    colorClass="yellow"
                />
                <SummaryCard
                    icon={<CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />}
                    value={readNotifications.length}
                    label="Read"
                    colorClass="green"
                />
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedIds(new Set()); }}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="all" className="flex items-center gap-2">
                            <BellIcon className="h-4 w-4" />
                            All
                            <span className="ml-1 px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded-full">
                                {typedNotifications.length}
                            </span>
                        </TabsTrigger>
                        <TabsTrigger value="unread" className="flex items-center gap-2">
                            <ClockIcon className="h-4 w-4" />
                            Unread
                            {unreadNotifications.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 rounded-full">
                                    {unreadNotifications.length}
                                </span>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* Select All */}
                    {currentNotifications.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="select-all"
                                checked={allSelected}
                                onChange={() => handleSelectAll(currentNotifications)}
                            />
                            <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                                Select all
                            </label>
                        </div>
                    )}
                </div>

                <TabsContent value="all" className="mt-6">
                    <NotificationList
                        notifications={typedNotifications}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                        onDelete={handleDelete}
                        onMarkAsRead={handleMarkAsRead}
                        onMarkAsUnread={handleMarkAsUnread}
                        actionInProgress={actionInProgress}
                    />
                </TabsContent>

                <TabsContent value="unread" className="mt-6">
                    <NotificationList
                        notifications={unreadNotifications}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                        emptyMessage="No unread notifications"
                        onDelete={handleDelete}
                        onMarkAsRead={handleMarkAsRead}
                        onMarkAsUnread={handleMarkAsUnread}
                        actionInProgress={actionInProgress}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}

/**
 * Summary card component for notification stats
 */
function SummaryCard({
    icon,
    value,
    label,
    colorClass,
}: {
    icon: React.ReactNode;
    value: number;
    label: string;
    colorClass: 'blue' | 'yellow' | 'green';
}) {
    const colorStyles = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    };
    const iconBgStyles = {
        blue: 'bg-blue-100 dark:bg-blue-900/50',
        yellow: 'bg-yellow-100 dark:bg-yellow-900/50',
        green: 'bg-green-100 dark:bg-green-900/50',
    };

    return (
        <div className={`p-4 border rounded-lg ${colorStyles[colorClass]}`}>
            <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconBgStyles[colorClass]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                </div>
            </div>
        </div>
    );
}

/**
 * Props for NotificationList component
 */
interface NotificationListProps {
    notifications: Notification[];
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    emptyMessage?: string;
    onDelete: (id: string) => void;
    onMarkAsRead: (id: string) => void;
    onMarkAsUnread: (id: string) => void;
    actionInProgress: string | null;
}

/**
 * Notification list with action buttons and selection
 */
function NotificationList({
    notifications,
    selectedIds,
    onToggleSelect,
    emptyMessage = 'No notifications yet',
    onDelete,
    onMarkAsRead,
    onMarkAsUnread,
    actionInProgress,
}: NotificationListProps) {
    if (notifications.length === 0) {
        return (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
                <BellIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {notifications.map((notification) => (
                <div
                    key={notification.id}
                    className={`border rounded-lg overflow-hidden transition-colors group ${selectedIds.has(notification.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                        }`}
                >
                    <div className="flex items-stretch">
                        {/* Checkbox */}
                        <div className="flex items-center px-3 border-r border-border">
                            <Checkbox
                                checked={selectedIds.has(notification.id)}
                                onChange={() => onToggleSelect(notification.id)}
                            />
                        </div>

                        {/* Notification content */}
                        <div className="flex-1">
                            <NotificationItem notification={notification} />
                        </div>

                        {/* Action buttons - appear on hover */}
                        <div className="flex items-center gap-1 px-3 border-l border-border bg-muted/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            {notification.isRead ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkAsUnread(notification.id);
                                    }}
                                    disabled={actionInProgress === notification.id}
                                    title="Mark as unread"
                                    className="h-8 w-8 p-0"
                                >
                                    <EyeOff className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMarkAsRead(notification.id);
                                    }}
                                    disabled={actionInProgress === notification.id}
                                    title="Mark as read"
                                    className="h-8 w-8 p-0"
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(notification.id);
                                }}
                                disabled={actionInProgress === notification.id}
                                title="Delete"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
