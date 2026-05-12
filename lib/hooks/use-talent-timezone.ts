'use client';

import { trpc } from '@/lib/client/trpc';

/**
 * Talent's preferred display timezone. Falls back to UTC when the user hasn't
 * set one in their profile — keep this aligned with the product decision so all
 * task-time displays agree on the same fallback.
 */
export function useTalentTimezone(): { timezone: string; isLoading: boolean } {
  const { data, isLoading } = trpc.userPreference.getTimezone.useQuery();
  return {
    timezone: data?.timezone || 'UTC',
    isLoading,
  };
}
