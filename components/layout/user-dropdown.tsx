'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signOut } from '@/lib/client/auth';
import { UserIcon, LogoutIcon, ChevronDownIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import type { SessionUser } from '@/lib/types/auth.types';

export function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const user = session?.user as SessionUser | undefined;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
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

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
      >
        <div className="relative flex h-7 w-7 shrink-0 overflow-hidden rounded-full">
          {user.profilePhoto ? (
            <img
              src={user.profilePhoto}
              alt={`${user.firstName} ${user.lastName}`}
              className="aspect-square h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary to-secondary text-xs font-bold text-primary-foreground">
              {user.firstName?.[0]}
              {user.lastName?.[0]}
            </div>
          )}
        </div>
        <div className="hidden sm:block text-left">
          <div className="text-sm font-medium text-card-foreground">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-muted-foreground">
            {user.role?.replace('_', ' ')}
          </div>
        </div>
        <ChevronDownIcon
          className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg border border-border bg-card shadow-lg">
          {/* User Info */}
          <div className="border-b border-border p-3">
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
                <div className="text-sm font-medium text-card-foreground truncate mb-1">
                  {user.firstName} {user.lastName}
                </div>
                <Badge variant={getRoleBadgeVariant(user.role)} size="sm" className="mb-1">
                  {user.role?.replace('_', ' ')}
                </Badge>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
            >
              <UserIcon className="h-4 w-4" />
              <span>My Profile</span>
            </Link>

            <button
              onClick={() => {
                setIsOpen(false);
                handleLogout();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogoutIcon className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
