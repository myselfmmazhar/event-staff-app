'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/client/auth';
import {
  DashboardIcon,
  UsersIcon,
  UserIcon,
  CloseIcon,
  CalendarIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon,
  ListIcon,
  SettingsIcon,
  BellIcon,
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
  getTimesheetRoute,
} from '@/lib/utils/route-helpers';
import { trpc } from '@/lib/client/trpc';

interface SubNavItem {
  label: string;
  href?: string;  // Optional for sub-section headers
  icon: React.ComponentType<{ className?: string }>;
  featureFlag?: keyof FeatureFlags;
  comingSoon?: boolean;  // For "Coming Soon" disabled state
  subItems?: SubNavItem[];  // For nested sub-sections
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAdmin?: boolean;
  subItems?: SubNavItem[];
  featureFlag?: keyof FeatureFlags;
  staffOnly?: boolean; // Only show in sidebar for STAFF users
  clientOnly?: boolean; // Only show in sidebar for CLIENT users
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}

function ComingSoonIndicator() {
  return (
    <Badge
      variant="secondary"
      size="sm"
      asSpan
      className="px-1"
      title="Coming Soon"
      aria-label="Coming Soon"
    >
      <ClockIcon aria-hidden="true" className="h-3 w-3" />
    </Badge>
  );
}

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const { terminology } = useTerminology();

  // Fetch company profile for branding
  const { data: companyProfile } = trpc.settings.getCompanyProfile.useQuery();

  // Get company initials for logo fallback
  const getCompanyInitials = (name: string | null | undefined) => {
    if (!name) return 'ES';
    const words = name.trim().split(' ').filter(w => w.length > 0);
    const first = words[0];
    const second = words[1];
    if (words.length >= 2 && first && second) {
      return (first.charAt(0) + second.charAt(0)).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Generate dynamic navigation items based on terminology
  const navItems: NavItem[] = useMemo(() => [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: DashboardIcon,
      requiresAdmin: false,
      featureFlag: 'dashboard',
    },
    // Staff-only items
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
    // Client-only items
    {
      label: 'Dashboard',
      href: '/client-portal',
      icon: DashboardIcon,
      requiresAdmin: false,
      clientOnly: true, // Only show for CLIENT users
    },
    {
      label: 'My Events',
      href: '/client-portal/my-events',
      icon: CalendarIcon,
      requiresAdmin: false,
      clientOnly: true, // Only show for CLIENT users
    },
    {
      label: 'My Profile',
      href: '/profile',
      icon: UserIcon,
      requiresAdmin: false,
      clientOnly: true, // Only show for CLIENT users - uses existing profile page
    },
    // Admin items - Task Pod Section
    {
      label: 'Task Pod',
      icon: ListIcon,
      requiresAdmin: false,
      subItems: [
        {
          label: `${terminology.event.singular} Manager`,
          icon: CalendarIcon,
          subItems: [
            {
              label: 'Overview',
              href: getEventRoute(terminology),
              icon: ListIcon,
              featureFlag: 'events',
            },
            {
              label: `Add ${terminology.event.singular}`,
              href: `${getEventRoute(terminology)}?create=true`,
              icon: PlusIcon,
              featureFlag: 'events',
            },
            {
              label: `${terminology.event.singular} Templates`,
              href: '/templates/events',
              icon: ListIcon,
            },
          ],
        },
        {
          label: 'Client Manager',
          icon: UsersIcon,
          subItems: [
            {
              label: 'Overview',
              href: '/clients',
              icon: ListIcon,
              featureFlag: 'clients',
            },
            {
              label: 'Add Client',
              href: '/clients?create=true',
              icon: PlusIcon,
              featureFlag: 'clients',
            },
          ],
        },
      ],
    },
    // Talent Pod Section
    {
      label: 'Talent Pod',
      icon: UsersIcon,
      requiresAdmin: false,
      subItems: [
        {
          label: `${terminology.staff.singular} Manager`,
          icon: UsersIcon,
          subItems: [
            {
              label: 'Overview',
              href: getStaffRoute(terminology),
              icon: ListIcon,
              featureFlag: 'staff',
            },
            {
              label: `Add ${terminology.staff.singular}`,
              href: `${getStaffRoute(terminology)}?create=true`,
              icon: PlusIcon,
              featureFlag: 'staff',
            },
          ],
        },
        {
          label: 'Catalog Manager',
          icon: ListIcon,
          subItems: [
            {
              label: 'Services',
              icon: ListIcon,
              subItems: [
                {
                  label: 'Overview',
                  href: '/catalog/services',
                  icon: ListIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Service',
                  href: '/catalog/services?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
            {
              label: 'Products',
              icon: ListIcon,
              subItems: [
                {
                  label: 'Overview',
                  href: '/catalog/products',
                  icon: ListIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Product',
                  href: '/catalog/products?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
            {
              label: 'Locations',
              icon: ListIcon,
              subItems: [
                {
                  label: 'Overview',
                  href: '/catalog/locations',
                  icon: ListIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Location',
                  href: '/catalog/locations?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
          ],
        },
      ],
    },
    // Time Pod Section
    {
      label: 'Time Pod',
      icon: CalendarIcon,
      requiresAdmin: false,
      subItems: [
        {
          label: 'Time Manager',
          icon: CalendarIcon,
          subItems: [
            {
              label: `${terminology.event.singular} Calendar`,
              href: getEventCalendarRoute(terminology),
              icon: CalendarIcon,
              featureFlag: 'events',
            },
            {
              label: 'Time Sheet',
              href: getTimesheetRoute(terminology),
              icon: ListIcon,
            },
          ],
        },
        {
          label: 'Finance Manager',
          icon: ListIcon,
          subItems: [
            {
              label: 'Proposals',
              icon: ListIcon,
              subItems: [
                {
                  label: 'Overview',
                  href: '/finance/proposals',
                  icon: ListIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Proposal',
                  href: '/finance/proposals?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
            {
              label: 'Invoices',
              icon: ListIcon,
              subItems: [
                {
                  label: 'Overview',
                  href: '/finance/invoices',
                  icon: ListIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Invoice',
                  href: '/finance/invoices?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
            {
              label: 'Bills',
              icon: ListIcon,
              subItems: [
                {
                  label: 'Overview',
                  href: '/finance/bills',
                  icon: ListIcon,
                  comingSoon: true,
                },
                {
                  label: 'Add Bill',
                  href: '/finance/bills?create=true',
                  icon: PlusIcon,
                  comingSoon: true,
                },
              ],
            },
          ],
        },
      ],
    },
    // Settings Section (at bottom)
    {
      label: 'Settings',
      icon: SettingsIcon,
      requiresAdmin: true, // Only ADMIN and SUPER_ADMIN
      subItems: [
        {
          label: 'Preferences',
          href: '/settings/preferences',
          icon: SettingsIcon,
        },
        {
          label: 'Templates',
          href: '/settings/templates',
          icon: ListIcon,
        },
        {
          label: 'Notifications',
          href: '/settings/notifications',
          icon: BellIcon,
        },
      ],
    },
  ], [terminology]);

  // Filter navigation items based on user role only (show all features regardless of status)
  const visibleNavItems = navItems
    .filter((item) => {
      // STAFF users only see Dashboard, My Schedule, and Profile (but not clientOnly items)
      if (user?.role === 'STAFF') {
        if (item.clientOnly) return false; // Exclude client-only items
        return item.label === 'Dashboard' || item.label === 'My Schedule' || (item.label === 'My Profile' && item.staffOnly);
      }

      // CLIENT users only see client-specific items
      if (user?.role === 'CLIENT') {
        return item.clientOnly === true;
      }

      // Hide staffOnly items from non-staff users (they access via header)
      if (item.staffOnly) return false;

      // Hide clientOnly items from non-client users
      if (item.clientOnly) return false;

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

  // Check if any sub-item is active (supports nested items)
  const hasActiveSubItem = (subItems?: SubNavItem[]): boolean => {
    if (!subItems) return false;
    return subItems.some(subItem => {
      if (subItem.href && isActive(subItem.href)) return true;
      if (subItem.subItems) return hasActiveSubItem(subItem.subItems);
      return false;
    });
  };

  // Toggle expanded state (supports hierarchical keys like "Task Pod.Task Manager")
  const toggleExpanded = (label: string, parentLabel?: string) => {
    const key = parentLabel ? `${parentLabel}.${label}` : label;
    setExpandedItems(prev =>
      prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key]
    );
  };

  // Check if item is expanded (supports hierarchical keys)
  const isItemExpanded = (label: string, parentLabel?: string) => {
    const key = parentLabel ? `${parentLabel}.${label}` : label;
    return expandedItems.includes(key);
  };

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col bg-card border-r border-border">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          {companyProfile?.companyLogoUrl ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden bg-muted">
              <img
                src={companyProfile.companyLogoUrl}
                alt="Company Logo"
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <span className="text-sm font-bold text-primary-foreground">
                TP
              </span>
            </div>
          )}
          <span className="text-lg font-semibold text-card-foreground">
            Tripod
          </span>
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
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 px-3 py-4">
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
                      const hasNestedItems = subItem.subItems && subItem.subItems.length > 0;

                      // If this sub-item has nested items, render as expandable sub-section
                      if (hasNestedItems) {
                        const subSectionExpanded = isItemExpanded(subItem.label, item.label) || hasActiveSubItem(subItem.subItems);

                        return (
                          <div key={subItem.label}>
                            {/* Sub-section Header */}
                            <button
                              onClick={() => toggleExpanded(subItem.label, item.label)}
                              className={`
                                flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                                ${hasActiveSubItem(subItem.subItems)
                                  ? 'bg-primary/5 text-primary'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }
                              `}
                            >
                              <SubIcon className="h-4 w-4" />
                              <span className="flex-1 text-left">{subItem.label}</span>
                              {subSectionExpanded ? (
                                <ChevronDownIcon className="h-3 w-3" />
                              ) : (
                                <ChevronRightIcon className="h-3 w-3" />
                              )}
                            </button>

                            {/* Nested Items (Level 3) */}
                            {subSectionExpanded && subItem.subItems && (
                              <div className="ml-4 mt-1 space-y-0.5 border-l border-border/50 pl-2">
                                {subItem.subItems.map((leafItem) => {
                                  const LeafIcon = leafItem.icon;
                                  const hasDeepNestedItems = leafItem.subItems && leafItem.subItems.length > 0;

                                  // Level 3 item with sub-items (e.g., Services > Overview, Add)
                                  if (hasDeepNestedItems) {
                                    const parentKey = `${item.label}.${subItem.label}`;
                                    const deepSectionExpanded = isItemExpanded(leafItem.label, parentKey) || hasActiveSubItem(leafItem.subItems);
                                    const isParentComingSoon = leafItem.comingSoon;

                                    return (
                                      <div key={leafItem.label}>
                                        {/* Level 3 Section Header */}
                                        <button
                                          onClick={() => toggleExpanded(leafItem.label, parentKey)}
                                          className={`
                                            flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200
                                            ${hasActiveSubItem(leafItem.subItems)
                                              ? 'bg-primary/5 text-primary'
                                              : isParentComingSoon
                                                ? 'text-muted-foreground opacity-60'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            }
                                          `}
                                        >
                                          <LeafIcon className="h-3.5 w-3.5" />
                                          <span className="flex-1 text-left">{leafItem.label}</span>
                                          {isParentComingSoon && (
                                            <ComingSoonIndicator />
                                          )}
                                          {deepSectionExpanded ? (
                                            <ChevronDownIcon className="h-3 w-3" />
                                          ) : (
                                            <ChevronRightIcon className="h-3 w-3" />
                                          )}
                                        </button>

                                        {/* Level 4 Leaf Items */}
                                        {deepSectionExpanded && leafItem.subItems && (
                                          <div className="ml-4 mt-1 space-y-0.5 border-l border-border/30 pl-2">
                                            {leafItem.subItems.map((deepLeafItem) => {
                                              const DeepLeafIcon = deepLeafItem.icon;
                                              const deepLeafActive = deepLeafItem.href ? isActive(deepLeafItem.href) : false;
                                              const deepFeatureStatus = deepLeafItem.featureFlag ? getFeatureStatus(deepLeafItem.featureFlag) : 'enabled';
                                              const deepIsDisabled = deepFeatureStatus === 'disabled' || deepLeafItem.comingSoon || isParentComingSoon;
                                              const deepIsBeta = deepFeatureStatus === 'beta';
                                              const deepIsClickable = deepFeatureStatus === 'enabled' && !deepLeafItem.comingSoon && !isParentComingSoon;

                                              const deepLeafContent = (
                                                <>
                                                  <DeepLeafIcon className="h-3 w-3" />
                                                  <span className="flex-1">{deepLeafItem.label}</span>
                                                  {deepIsBeta && (
                                                    <Badge variant="info" size="sm">
                                                      Beta
                                                    </Badge>
                                                  )}
                                                  {deepLeafItem.comingSoon && (
                                                    <ComingSoonIndicator />
                                                  )}
                                                </>
                                              );

                                              if (!deepIsClickable) {
                                                return (
                                                  <div
                                                    key={deepLeafItem.href || deepLeafItem.label}
                                                    className="flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200 cursor-not-allowed opacity-60 text-muted-foreground"
                                                  >
                                                    {deepLeafContent}
                                                  </div>
                                                );
                                              }

                                              return (
                                                <Link
                                                  key={deepLeafItem.href}
                                                  href={deepLeafItem.href!}
                                                  onClick={isMobile ? onClose : undefined}
                                                  className={`
                                                    flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition-all duration-200
                                                    ${deepLeafActive
                                                      ? 'bg-primary text-primary-foreground shadow-md'
                                                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                    }
                                                  `}
                                                >
                                                  {deepLeafContent}
                                                </Link>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }

                                  // Regular leaf item without sub-items
                                  const leafActive = leafItem.href ? isActive(leafItem.href) : false;
                                  const featureStatus = leafItem.featureFlag ? getFeatureStatus(leafItem.featureFlag) : 'enabled';
                                  const isDisabled = featureStatus === 'disabled' || leafItem.comingSoon;
                                  const isBeta = featureStatus === 'beta';
                                  const isClickable = featureStatus === 'enabled' && !leafItem.comingSoon;

                                  const leafContent = (
                                    <>
                                      <LeafIcon className="h-3.5 w-3.5" />
                                      <span className="flex-1">{leafItem.label}</span>
                                      {isBeta && (
                                        <Badge variant="info" size="sm">
                                          Beta
                                        </Badge>
                                      )}
                                      {leafItem.comingSoon && (
                                        <ComingSoonIndicator />
                                      )}
                                      {isDisabled && !leafItem.comingSoon && (
                                        <Badge variant="secondary" size="sm">
                                          Disabled
                                        </Badge>
                                      )}
                                    </>
                                  );

                                  if (!isClickable) {
                                    return (
                                      <div
                                        key={leafItem.href || leafItem.label}
                                        className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-not-allowed opacity-60 text-muted-foreground"
                                      >
                                        {leafContent}
                                      </div>
                                    );
                                  }

                                  return (
                                    <Link
                                      key={leafItem.href}
                                      href={leafItem.href!}
                                      onClick={isMobile ? onClose : undefined}
                                      className={`
                                        flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200
                                        ${leafActive
                                          ? 'bg-primary text-primary-foreground shadow-md'
                                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }
                                      `}
                                    >
                                      {leafContent}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Regular sub-item without nested items (original logic)
                      const subActive = subItem.href ? isActive(subItem.href) : false;
                      const featureStatus = subItem.featureFlag ? getFeatureStatus(subItem.featureFlag) : 'enabled';
                      const isDisabled = featureStatus === 'disabled' || subItem.comingSoon;
                      const isBeta = featureStatus === 'beta';
                      const isClickable = featureStatus === 'enabled' && !subItem.comingSoon;

                      const content = (
                        <>
                          <SubIcon className="h-4 w-4" />
                          <span className="flex-1">{subItem.label}</span>
                          {isBeta && (
                            <Badge variant="info" size="sm">
                              Beta
                            </Badge>
                          )}
                          {subItem.comingSoon && (
                            <ComingSoonIndicator />
                          )}
                          {isDisabled && !subItem.comingSoon && (
                            <Badge variant="secondary" size="sm">
                              Disabled
                            </Badge>
                          )}
                        </>
                      );

                      if (!isClickable) {
                        return (
                          <div
                            key={subItem.href || subItem.label}
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
                          href={subItem.href!}
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

      {/* User Profile Section - Above Settings */}
      {user && (
        <div className="px-3 py-2">
          <button
            onClick={() => toggleExpanded('UserProfile')}
            className={`
              flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
              ${pathname.startsWith('/profile')
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }
            `}
          >
            <UserIcon className="h-5 w-5" />
            <span className="flex-1 text-left truncate">{user.firstName} {user.lastName}</span>
            <ChevronDownIcon
              className={`h-4 w-4 transition-transform duration-200 ${expandedItems.includes('UserProfile') ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedItems.includes('UserProfile') && (
            <div className="ml-3 mt-1 space-y-1 border-l-2 border-border pl-4">
              <Link
                href="/profile"
                onClick={isMobile ? onClose : undefined}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                  ${pathname === '/profile'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <UserIcon className="h-4 w-4" />
                <span className="flex-1">My Profile</span>
              </Link>
              <Link
                href="/profile/company"
                onClick={isMobile ? onClose : undefined}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                  ${pathname === '/profile/company'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <DashboardIcon className="h-4 w-4" />
                <span className="flex-1">Company Profile</span>
              </Link>
              <Link
                href="/profile/team"
                onClick={isMobile ? onClose : undefined}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                  ${pathname === '/profile/team'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <UsersIcon className="h-4 w-4" />
                <span className="flex-1">Team</span>
              </Link>
              <Link
                href="/profile/reports"
                onClick={(e) => e.preventDefault()}
                aria-disabled="true"
                tabIndex={-1}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-not-allowed opacity-60 text-muted-foreground"
              >
                <ListIcon className="h-4 w-4" />
                <span className="flex-1">Reports</span>
                <ComingSoonIndicator />
              </Link>
              <Link
                href="/profile/billing"
                onClick={(e) => e.preventDefault()}
                aria-disabled="true"
                tabIndex={-1}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-not-allowed opacity-60 text-muted-foreground"
              >
                <ListIcon className="h-4 w-4" />
                <span className="flex-1">Billing</span>
                <ComingSoonIndicator />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Settings Section - Positioned at Bottom */}
      {visibleNavItems.filter(item => item.label === 'Settings').map((item) => {
        const Icon = item.icon;
        const hasSubItems = item.subItems && item.subItems.length > 0;
        const isExpanded = expandedItems.includes(item.label) || hasActiveSubItem(item.subItems);

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
                  className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''
                    }`}
                />
              </button>

              {isExpanded && (
                <div className="ml-3 mt-1 space-y-1 border-l-2 border-border pl-4">
                  {item.subItems!.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const subActive = subItem.href ? isActive(subItem.href) : false;

                    const content = (
                      <>
                        <SubIcon className="h-4 w-4" />
                        <span className="flex-1">{subItem.label}</span>
                      </>
                    );

                    if (!subItem.href) return null;

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
