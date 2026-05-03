'use client';

import { useMemo } from 'react';
import type { SessionUser } from '@/lib/types/auth.types';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { NavItem } from './nav-item';
import { getNavItems } from './nav-data';
import { useSidebarState } from './use-sidebar-state';
import type { NavItem as NavItemType } from './types';
import { trpc as api } from '@/lib/client/trpc';
import { StaffRole } from '@prisma/client';

interface SidebarNavProps {
  user?: SessionUser;
  onMobileClose?: () => void;
  isMobile?: boolean;
  sidebarState: ReturnType<typeof useSidebarState>;
}

function filterNavItems(navItems: NavItemType[], user?: SessionUser, staffRole?: StaffRole, staffManagerLabel?: string): NavItemType[] {
  const filtered = navItems.filter((item) => {
    // STAFF users only see Dashboard, My Schedule, and Profile (but not clientOnly items)
    if (user?.role === 'STAFF') {
      if (item.clientOnly) return false;

      const isAllowedLabel = item.label === 'Dashboard' ||
                            item.label === 'My Schedule' ||
                            item.label === 'Communication Manager';

      // If staff is a TEAM, they can also see the Staff Manager (Talent)
      if (staffRole === StaffRole.TEAM) {
         // Check if this item is the Talent Pod which contains the Staff Manager
         if (item.label === 'Talent Pod') return true;
      }

      return isAllowedLabel;
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

  // For STAFF users with TEAM role, collapse "Talent Pod" into a direct
  // "Team Unit" link that points at the Talent/Staff Manager route.
  if (user?.role === 'STAFF' && staffRole === StaffRole.TEAM) {
    return filtered.map((item) => {
      if (item.label !== 'Talent Pod') return item;
      const staffManagerSubItem = item.subItems?.find(
        (sub) => sub.label === staffManagerLabel
      );
      return {
        ...item,
        label: 'Team Unit',
        href: staffManagerSubItem?.href,
        featureFlag: staffManagerSubItem?.featureFlag,
        subItems: undefined,
      };
    });
  }

  return filtered;
}

export function SidebarNav({ user, onMobileClose, isMobile, sidebarState }: SidebarNavProps) {
  const { terminology } = useTerminology();
  
  // Fetch staff profile if user is STAFF to check for TEAM role
  const { data: staffProfile } = api.staff.getMyProfile.useQuery(undefined, {
    enabled: user?.role === 'STAFF',
  });

  const navItems = useMemo(() => getNavItems(terminology), [terminology]);
  const visibleNavItems = useMemo(() => 
    filterNavItems(navItems, user, staffProfile?.staffRole, `${terminology.staff.singular} Manager`), 
    [navItems, user, staffProfile?.staffRole, terminology.staff.singular]
  );

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
  
  const { data: staffProfile } = api.staff.getMyProfile.useQuery(undefined, {
    enabled: user?.role === 'STAFF',
  });

  const navItems = useMemo(() => getNavItems(terminology), [terminology]);
  const visibleNavItems = useMemo(() => 
    filterNavItems(navItems, user, staffProfile?.staffRole, `${terminology.staff.singular} Manager`), 
    [navItems, user, staffProfile?.staffRole, terminology.staff.singular]
  );

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

  const { data: staffProfile } = api.staff.getMyProfile.useQuery(undefined, {
    enabled: user?.role === 'STAFF',
  });

  const navItems = useMemo(() => getNavItems(terminology), [terminology]);
  const visibleNavItems = useMemo(() => 
    filterNavItems(navItems, user, staffProfile?.staffRole, `${terminology.staff.singular} Manager`), 
    [navItems, user, staffProfile?.staffRole, terminology.staff.singular]
  );

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
