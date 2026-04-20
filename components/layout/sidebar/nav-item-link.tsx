'use client';

import Link from 'next/link';
import { ClockIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';
import { getFeatureStatus } from '@/lib/config/feature-flags';
import type { NavItemLinkProps } from './types';

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

const depthStyles = {
  0: {
    padding: 'px-3 py-2.5',
    text: 'text-sm',
    icon: 'h-5 w-5',
    gap: 'gap-3',
  },
  1: {
    padding: 'px-3 py-2',
    text: 'text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-3',
  },
  2: {
    padding: 'px-3 py-1.5',
    text: 'text-xs',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-3',
  },
  3: {
    padding: 'px-2 py-1',
    text: 'text-xs',
    icon: 'h-3 w-3',
    gap: 'gap-2',
  },
} as const;

interface Props extends NavItemLinkProps {
  isActive: boolean;
  parentComingSoon?: boolean;
}

export function NavItemLink({
  item,
  depth,
  isActive,
  onMobileClose,
  isMobile,
  parentComingSoon,
}: Props) {
  const Icon = item.icon;
  const featureStatus = item.featureFlag ? getFeatureStatus(item.featureFlag) : 'enabled';
  const isDisabled = featureStatus === 'disabled' || item.comingSoon || parentComingSoon;
  const isBeta = featureStatus === 'beta';
  const isClickable = featureStatus === 'enabled' && !item.comingSoon && !parentComingSoon;

  const styles = depthStyles[Math.min(depth, 3) as keyof typeof depthStyles];

  const content = (
    <>
      <Icon className={styles.icon} />
      <span className="flex-1">{item.label}</span>
      {isBeta && (
        <Badge variant="info" size="sm">
          Beta
        </Badge>
      )}
      {item.comingSoon && <ComingSoonIndicator />}
      {isDisabled && !item.comingSoon && !parentComingSoon && (
        <Badge variant="secondary" size="sm">
          Disabled
        </Badge>
      )}
    </>
  );

  const baseClasses = `flex items-center ${styles.gap} rounded-lg ${styles.padding} ${styles.text} font-medium transition-all duration-200`;

  if (!isClickable || !item.href) {
    return (
      <div
        className={`${baseClasses} cursor-not-allowed opacity-60 text-white`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={isMobile ? onMobileClose : undefined}
      className={`${baseClasses} ${
        isActive
          ? 'bg-white text-[#196496] shadow-md font-bold'
          : 'text-white hover:bg-sidebar-hover hover:text-sidebar-foreground'
      }`}
    >
      {content}
    </Link>
  );
}
