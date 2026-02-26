'use client';

import { useState } from 'react';
import { useSession } from '@/lib/client/auth';
import { trpc } from '@/lib/client/trpc';
import type { SessionUser } from '@/lib/types/auth.types';
import { SidebarHeader } from './sidebar-header';
import { SidebarNav, SidebarCommunication, SidebarSettings } from './sidebar-nav';
import { SidebarUserSection } from './sidebar-user-section';
import { useSidebarState } from './use-sidebar-state';
import type { SidebarProps } from './types';

export function Sidebar({ isOpen = true, onClose, isMobile = false }: SidebarProps) {
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;
  const [userSectionExpanded, setUserSectionExpanded] = useState(false);
  const sidebarState = useSidebarState();

  // Fetch company profile for branding
  const { data: companyProfile } = trpc.settings.getCompanyProfile.useQuery();

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col bg-card border-r border-border">
      <SidebarHeader
        companyLogoUrl={companyProfile?.companyLogoUrl}
        isMobile={isMobile}
        onClose={onClose}
      />

      <SidebarNav
        user={user}
        onMobileClose={onClose}
        isMobile={isMobile}
        sidebarState={sidebarState}
      />

      {/* Communication Manager - Above User Profile */}
      <SidebarCommunication
        user={user}
        onMobileClose={onClose}
        isMobile={isMobile}
        sidebarState={sidebarState}
      />

      {/* User Profile Section */}
      {user && (
        <SidebarUserSection
          user={user}
          isExpanded={userSectionExpanded}
          onToggle={() => setUserSectionExpanded(!userSectionExpanded)}
          onMobileClose={onClose}
          isMobile={isMobile}
        />
      )}

      {/* Settings Section - At Bottom */}
      <SidebarSettings
        user={user}
        onMobileClose={onClose}
        isMobile={isMobile}
        sidebarState={sidebarState}
      />
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
