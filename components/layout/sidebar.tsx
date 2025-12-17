'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/client/auth';
import { signOut } from '@/lib/client/auth';
import {
  DashboardIcon,
  UsersIcon,
  UserIcon,
  LogoutIcon,
  CloseIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  ListIcon,
  SettingsIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/types/auth.types';
import { type FeatureFlags, getFeatureStatus, isFeatureEnabled, isFeatureBeta, isFeatureDisabled } from '@/lib/config/feature-flags';
import { useTerminology } from '@/lib/hooks/use-terminology';
import {
  getStaffRoute,
  getEventRoute,
  getEventCalendarRoute,
} from '@/lib/utils/route-helpers';

interface SubNavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  featureFlag?: keyof FeatureFlags;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAdmin?: boolean;
  subItems?: SubNavItem[];
  featureFlag?: keyof FeatureFlags;
  staffOnly?: boolean; // Only show in sidebar for STAFF users
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { terminology } = useTerminology();

  // Generate dynamic navigation items based on terminology
  const navItems: NavItem[] = useMemo(() => [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: DashboardIcon,
      requiresAdmin: false,
      featureFlag: 'dashboard',
    },
    {
      label: 'My Schedule',
      href: '/my-schedule',
      icon: CalendarIcon,
      requiresAdmin: false,
      staffOnly: true, // Only show for STAFF users
    },
    {
      label: 'My Profile',
      href: '/profile',
      icon: UserIcon,
      requiresAdmin: false, // Available to all users including staff
      staffOnly: true, // Only show in sidebar for staff (others access via header)
    },
    {
      label: terminology.event.plural,
      icon: CalendarIcon,
      requiresAdmin: false,
      featureFlag: 'events',
      subItems: [
        {
          label: `Create ${terminology.event.singular}`,
          href: `${getEventRoute(terminology)}?create=true`,
          icon: PlusIcon,
          featureFlag: 'events',
        },
        {
          label: `View ${terminology.event.plural}`,
          href: getEventRoute(terminology),
          icon: ListIcon,
          featureFlag: 'events',
        },
        {
          label: 'Calendar',
          href: getEventCalendarRoute(terminology),
          icon: CalendarIcon,
          featureFlag: 'events',
        },
        {
          label: 'Create Client',
          href: '/clients?create=true',
          icon: PlusIcon,
          featureFlag: 'clients',
        },
        {
          label: 'View Clients',
          href: '/clients',
          icon: ListIcon,
          featureFlag: 'clients',
        },
      ],
    },
    {
      label: terminology.staff.plural,
      icon: UsersIcon,
      requiresAdmin: false,
      featureFlag: 'staff',
      subItems: [
        {
          label: `Create ${terminology.staff.singular}`,
          href: `${getStaffRoute(terminology)}?create=true`,
          icon: PlusIcon,
          featureFlag: 'staff',
        },
        {
          label: `View ${terminology.staff.plural}`,
          href: getStaffRoute(terminology),
          icon: ListIcon,
          featureFlag: 'staff',
        },
        {
          label: 'Clean Up Roster',
          href: `${getStaffRoute(terminology)}/cleanup-roster`,
          icon: ListIcon,
          featureFlag: 'staff',
        },
      ],
    },
    {
      label: 'Users',
      href: '/users',
      icon: UsersIcon,
      requiresAdmin: true, // Only ADMIN and SUPER_ADMIN
      featureFlag: 'users',
    },
    {
      label: 'Settings',
      icon: SettingsIcon,
      requiresAdmin: true, // Only ADMIN and SUPER_ADMIN
      subItems: [
        {
          label: 'Terminology',
          href: '/settings/terminology',
          icon: SettingsIcon,
        },
        {
          label: 'Positions',
          href: '/settings/positions',
          icon: ListIcon,
        },
      ],
    },
  ], [terminology]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  // Filter navigation items based on user role only (show all features regardless of status)
  const visibleNavItems = navItems
    .filter((item) => {
      // STAFF users only see Dashboard, My Schedule, and Profile
      if (user?.role === 'STAFF') {
        return item.label === 'Dashboard' || item.label === 'My Schedule' || item.label === 'My Profile';
      }

      // Hide staffOnly items from non-staff users (they access via header)
      if (item.staffOnly) return false;

      // Check role-based access only
      if (!item.requiresAdmin) return true;
      if (!user?.role) return false;

      // Check if user has admin access (ADMIN or SUPER_ADMIN)
      const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
      return adminRoles.includes(user.role);
    })
    .map((item) => {
      // Keep all sub-items (don't filter by feature flags)
      return item;
    });

  // Check if current path matches nav item
  const isActive = (href: string) => {
    // Exact match first
    if (pathname === href) return true;

    // For sub-paths, only match if it's truly a sub-path (not a sibling)
    // This prevents /staff from matching /staff/cleanup-roster
    return false;
  };

  // Check if any sub-item is active
  const hasActiveSubItem = (subItems?: SubNavItem[]) => {
    if (!subItems) return false;
    return subItems.some(subItem => isActive(subItem.href));
  };

  // Toggle expanded state
  const toggleExpanded = (label: string) => {
    setExpandedItems(prev =>
      prev.includes(label) ? prev.filter(item => item !== label) : [...prev, label]
    );
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'purple';
      case 'ADMIN':
        return 'primary';
      case 'MANAGER':
        return 'info';
      case 'STAFF':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <span className="text-sm font-bold text-primary-foreground">ES</span>
          </div>
          <span className="text-lg font-semibold text-card-foreground">Event Staff</span>
        </div>
        {isMobile && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-muted transition-colors"
            aria-label="Close menu"
          >
            <CloseIcon className="h-5 w-5 text-foreground" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavItems.filter(item => item.label !== 'Settings').map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedItems.includes(item.label) || hasActiveSubItem(item.subItems);
          const active = item.href ? isActive(item.href) : false;

          if (hasSubItems) {
            return (
              <div key={item.label}>
                {/* Parent Item */}
                <button
                  onClick={() => toggleExpanded(item.label)}
                  className={`
                    flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                    ${hasActiveSubItem(item.subItems)
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronRightIcon className="h-4 w-4" />
                  )}
                </button>

                {/* Sub Items */}
                {isExpanded && item.subItems && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-border pl-2">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const subActive = isActive(subItem.href);
                      const featureStatus = subItem.featureFlag ? getFeatureStatus(subItem.featureFlag) : 'enabled';
                      const isDisabled = featureStatus === 'disabled';
                      const isBeta = featureStatus === 'beta';
                      const isClickable = featureStatus === 'enabled';

                      // Render as button if disabled/beta, Link if enabled
                      const content = (
                        <>
                          <SubIcon className="h-4 w-4" />
                          <span className="flex-1">{subItem.label}</span>
                          {isBeta && (
                            <Badge variant="info" size="sm">
                              Beta
                            </Badge>
                          )}
                          {isDisabled && (
                            <Badge variant="secondary" size="sm">
                              Disabled
                            </Badge>
                          )}
                        </>
                      );

                      if (!isClickable) {
                        return (
                          <div
                            key={subItem.href}
                            className={`
                              flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                              cursor-not-allowed opacity-60
                              text-muted-foreground
                            `}
                          >
                            {content}
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          onClick={isMobile ? onClose : undefined}
                          className={`
                            flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                            ${subActive
                              ? 'bg-primary text-primary-foreground shadow-md'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }
                          `}
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular nav item without sub-items
          const featureStatus = item.featureFlag ? getFeatureStatus(item.featureFlag) : 'enabled';
          const isDisabled = featureStatus === 'disabled';
          const isBeta = featureStatus === 'beta';
          const isClickable = featureStatus === 'enabled';

          const content = (
            <>
              <Icon className="h-5 w-5" />
              <span className="flex-1">{item.label}</span>
              {isBeta && (
                <Badge variant="info" size="sm">
                  Beta
                </Badge>
              )}
              {isDisabled && (
                <Badge variant="secondary" size="sm">
                  Disabled
                </Badge>
              )}
            </>
          );

          if (!isClickable) {
            return (
              <div
                key={item.href || item.label}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                  cursor-not-allowed opacity-60
                  text-muted-foreground
                `}
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href!}
              onClick={isMobile ? onClose : undefined}
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                ${active
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }
              `}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      {/* Settings Section - Positioned at Bottom */}
      {visibleNavItems.filter(item => item.label === 'Settings').map((item) => {
        const Icon = item.icon;
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = expandedItems.includes(item.label) || hasActiveSubItem(item.subItems);
        const active = item.href ? isActive(item.href) : false;

        if (hasSubItems) {
          return (
            <div key={item.label} className="px-3 pb-4">
              <button
                onClick={() => toggleExpanded(item.label)}
                className={`
                  flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
                  ${hasActiveSubItem(item.subItems)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="ml-3 mt-1 space-y-1 border-l-2 border-border pl-4">
                  {item.subItems!.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const subActive = isActive(subItem.href);

                    const content = (
                      <>
                        <SubIcon className="h-4 w-4" />
                        <span className="flex-1">{subItem.label}</span>
                      </>
                    );

                    return (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        onClick={isMobile ? onClose : undefined}
                        className={`
                          flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                          ${subActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }
                        `}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        return null;
      })}

      {/* User Profile Section */}
      {user && (
        <div className="border-t border-border p-4">
          <div className="mb-3 rounded-lg bg-muted p-3">
            <div className="flex items-center gap-3">
              {/* Profile Photo */}
              <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full">
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="aspect-square h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary text-sm font-bold text-primary-foreground">
                    {user.firstName?.[0]}
                    {user.lastName?.[0]}
                  </div>
                )}
              </div>

              {/* Name, Role, and Email */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate mb-1">
                  {user.firstName} {user.lastName}
                </div>
                <Badge variant={getRoleBadgeVariant(user.role)} size="sm" className="mb-1">
                  {user.role?.replace('_', ' ')}
                </Badge>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-2"
          >
            <LogoutIcon className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        </div>
      )}
    </div>
  );

  // Desktop sidebar (fixed)
  if (!isMobile) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 transition-transform">
        {sidebarContent}
      </aside>
    );
  }

  // Mobile sidebar (drawer)
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`
          fixed left-0 top-0 z-50 h-screen w-64 transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
