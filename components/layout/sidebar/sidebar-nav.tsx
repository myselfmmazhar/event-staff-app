'use client';

import { useMemo } from 'react';
import type { SessionUser } from '@/lib/types/auth.types';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { NavItem } from './nav-item';
import { getNavItems } from './nav-data';
import { useSidebarState } from './use-sidebar-state';
import type { NavItem as NavItemType } from './types';

interface SidebarNavProps {
  user?: SessionUser;
  onMobileClose?: () => void;
  isMobile?: boolean;
  sidebarState: ReturnType<typeof useSidebarState>;
}

function filterNavItems(navItems: NavItemType[], user?: SessionUser): NavItemType[] {
  return navItems.filter((item) => {
    // STAFF users only see Dashboard, My Schedule, and Profile (but not clientOnly items)
    if (user?.role === 'STAFF') {
      if (item.clientOnly) return false;
      return item.label === 'Dashboard' || item.label === 'My Schedule' || (item.label === 'My Profile' && item.staffOnly) || item.label === 'Communication Manager';
    }

    // CLIENT users only see client-specific items
    if (user?.role === 'CLIENT') {
      return item.clientOnly === true;
    }

    // Hide staffOnly items from non-staff users
    if (item.staffOnly) return false;

    // Hide clientOnly items from non-client users
    if (item.clientOnly) return false;

    // Check role-based access only
    if (!item.requiresAdmin) return true;
    if (!user?.role) return false;

    // Check if user has admin access (ADMIN or SUPER_ADMIN)
    const adminRoles = ['ADMIN', 'SUPER_ADMIN'];
    return adminRoles.includes(user.role);
  });
}

export function SidebarNav({ user, onMobileClose, isMobile, sidebarState }: SidebarNavProps) {
  const { terminology } = useTerminology();

  const navItems = useMemo(() => getNavItems(terminology), [terminology]);
  const visibleNavItems = useMemo(() => filterNavItems(navItems, user), [navItems, user]);

  // Separate Settings and Communication Manager from other items (rendered separately by parent)
  const mainItems = visibleNavItems.filter(item =>
    item.label !== 'Settings' && item.label !== 'Communication Manager'
  );

  return (
    <nav className="flex-1 min-h-0 overflow-y-auto space-y-1 px-3 py-4">
      {mainItems.map((item) => (
        <NavItem
          key={item.label}
          item={item}
          onMobileClose={onMobileClose}
          isMobile={isMobile}
          sidebarState={sidebarState}
        />
      ))}
    </nav>
  );
}

export function SidebarCommunication({ user, onMobileClose, isMobile, sidebarState }: SidebarNavProps) {
  const { terminology } = useTerminology();

  const navItems = useMemo(() => getNavItems(terminology), [terminology]);
  const visibleNavItems = useMemo(() => filterNavItems(navItems, user), [navItems, user]);

  const communicationItem = visibleNavItems.find(item => item.label === 'Communication Manager');

  if (!communicationItem) return null;

  return (
    <div className="px-3 pb-2 space-y-1">
      <NavItem
        item={communicationItem}
        onMobileClose={onMobileClose}
        isMobile={isMobile}
        sidebarState={sidebarState}
      />
    </div>
  );
}

export function SidebarSettings({ user, onMobileClose, isMobile, sidebarState }: SidebarNavProps) {
  const { terminology } = useTerminology();

  const navItems = useMemo(() => getNavItems(terminology), [terminology]);
  const visibleNavItems = useMemo(() => filterNavItems(navItems, user), [navItems, user]);

  const settingsItem = visibleNavItems.find(item => item.label === 'Settings');

  if (!settingsItem) return null;

  return (
    <div className="px-3 pb-4 space-y-1">
      <NavItem
        item={settingsItem}
        onMobileClose={onMobileClose}
        isMobile={isMobile}
        sidebarState={sidebarState}
      />
    </div>
  );
}
