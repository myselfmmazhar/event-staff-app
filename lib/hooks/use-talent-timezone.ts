'use client';

import { trpc } from '@/lib/client/trpc';

/**
 * Talent's preferred display timezone. Returns an empty string when the user
 * hasn't set one — callers should then fall back to the event's IANA timezone
 * (e.g. `talentTz || event.timezone || 'UTC'`) so unconfigured users see times
 * exactly as the admin entered them rather than getting shifted into UTC.
 */
export function useTalentTimezone(): { timezone: string; isLoading: boolean } {
  const { data, isLoading } = trpc.userPreference.getTimezone.useQuery();
  return {
    timezone: data?.timezone || '',
    isLoading,
  };
}
