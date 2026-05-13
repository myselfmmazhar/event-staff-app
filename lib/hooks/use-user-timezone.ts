'use client';

import { trpc } from '@/lib/client/trpc';

/**
 * Current user's preferred display timezone. Generic across roles (talent,
 * client, admin) — backed by the same `userPreference.timezone` row that the
 * profile page writes. Falls back to UTC when not set.
 */
export function useUserTimezone(): { timezone: string; isLoading: boolean } {
  const { data, isLoading } = trpc.userPreference.getTimezone.useQuery();
  return {
    timezone: data?.timezone || 'UTC',
    isLoading,
  };
}
