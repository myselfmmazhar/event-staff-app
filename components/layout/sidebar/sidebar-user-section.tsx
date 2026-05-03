'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  UserIcon,
  ChevronDownIcon,
  BuildingOfficeIcon,
  UsersIcon,
  ChartBarIcon,
  CreditCardIcon,
  ClockIcon,
} from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import type { SessionUser } from '@/lib/types/auth.types';

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

interface SidebarUserSectionProps {
  user: SessionUser;
  isExpanded: boolean;
  onToggle: () => void;
  onMobileClose?: () => void;
  isMobile?: boolean;
}

const ADMIN_ONLY_LINKS = ['/profile/company', '/profile/team', '/profile/reports', '/profile/billing'];

export function SidebarUserSection({
  user,
  isExpanded,
  onToggle,
  onMobileClose,
  isMobile,
}: SidebarUserSectionProps) {
  const pathname = usePathname();

  const isAdminUser = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';

  const profileLinks = [
    { href: '/profile', label: 'My Profile', icon: UserIcon },
    { href: '/profile/company', label: 'Company Profile', icon: BuildingOfficeIcon },
    { href: '/profile/team', label: 'Team', icon: UsersIcon },
    { href: '/profile/reports', label: 'Reports', icon: ChartBarIcon, comingSoon: true },
    { href: '/profile/billing', label: 'Billing', icon: CreditCardIcon, comingSoon: true },
  ].filter(({ href }) => isAdminUser || !ADMIN_ONLY_LINKS.includes(href));

  return (
    <div className="px-3 py-2">
      <button
        onClick={onToggle}
        className={`
          flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
          ${pathname.startsWith('/profile')
            ? 'bg-sidebar-active-bg text-sidebar-foreground'
            : 'text-white hover:bg-sidebar-hover hover:text-sidebar-foreground'
          }
        `}
      >
        <UserIcon className="h-5 w-5" />
        <span className="flex-1 text-left truncate">{user.firstName} {user.lastName}</span>
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="ml-3 mt-1 space-y-1 border-l-2 border-sidebar-border pl-4">
          {profileLinks.map(({ href, label, icon: Icon, comingSoon }) => {
            if (comingSoon) {
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={(e) => e.preventDefault()}
                  aria-disabled="true"
                  tabIndex={-1}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 cursor-not-allowed opacity-60 text-white"
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{label}</span>
                  <ComingSoonIndicator />
                </Link>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={isMobile ? onMobileClose : undefined}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
                  ${pathname === href
                    ? 'bg-white text-[#196496] shadow-md font-bold'
                    : 'text-white hover:bg-sidebar-hover hover:text-sidebar-foreground'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
