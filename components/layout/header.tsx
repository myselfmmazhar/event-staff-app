'use client';

import { MenuIcon } from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Breadcrumbs } from './breadcrumbs';
import { UserDropdown } from './user-dropdown';
import { NotificationBell } from '@/components/notifications';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-6">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="md:hidden"
          aria-label="Open menu"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>

        {/* Breadcrumbs */}
        <div className="flex-1">
          <Breadcrumbs />
        </div>

        {/* Notifications */}
        <NotificationBell />

        {/* User Dropdown */}
        <UserDropdown />
      </div>
    </header>
  );
}
