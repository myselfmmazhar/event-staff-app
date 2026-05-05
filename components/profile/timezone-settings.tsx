'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/lib/client/trpc';
import { useToast } from '@/components/ui/use-toast';
import { TIMEZONES } from '@/lib/schemas/event.schema';
import { ClockIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

const TIMEZONE_LABELS: Record<string, string> = {
  'UTC': 'UTC — Coordinated Universal Time',
  'America/New_York': 'America/New_York — Eastern Time (ET)',
  'America/Chicago': 'America/Chicago — Central Time (CT)',
  'America/Denver': 'America/Denver — Mountain Time (MT)',
  'America/Los_Angeles': 'America/Los_Angeles — Pacific Time (PT)',
  'America/Phoenix': 'America/Phoenix — Arizona (MT, no DST)',
  'America/Anchorage': 'America/Anchorage — Alaska Time (AKT)',
  'Pacific/Honolulu': 'Pacific/Honolulu — Hawaii Time (HST)',
  'America/Toronto': 'America/Toronto — Eastern Time / Toronto',
  'America/Vancouver': 'America/Vancouver — Pacific Time / Vancouver',
  'Europe/London': 'Europe/London — GMT / BST',
  'Europe/Paris': 'Europe/Paris — Central European Time (CET)',
  'Asia/Tokyo': 'Asia/Tokyo — Japan Standard Time (JST)',
  'Australia/Sydney': 'Australia/Sydney — Australian Eastern Time (AEST)',
};

export function TimezoneSettings() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.userPreference.getTimezone.useQuery();
  const [selected, setSelected] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data?.timezone) {
      setSelected(data.timezone);
    }
  }, [data?.timezone]);

  const mutation = trpc.userPreference.setTimezone.useMutation({
    onSuccess: () => {
      toast({
        title: 'Timezone updated',
        description: 'Your timezone preference has been saved.',
        variant: 'success',
      });
      setIsDirty(false);
      utils.userPreference.getTimezone.invalidate();
    },
    onError: (err) => {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'error',
      });
    },
  });

  const handleChange = (value: string) => {
    setSelected(value);
    setIsDirty(value !== (data?.timezone ?? ''));
  };

  const handleSave = () => {
    if (selected) mutation.mutate({ timezone: selected });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Time Zone
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Spinner className="h-4 w-4" />
            Loading...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Your Time Zone</Label>
              <Select value={selected} onValueChange={handleChange}>
                <SelectTrigger id="timezone" className="w-full">
                  <SelectValue placeholder="Select a time zone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {TIMEZONE_LABELS[tz] ?? tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used to display event times and schedules in your local time.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={!isDirty || !selected || mutation.isPending}
              >
                {mutation.isPending && <Spinner className="h-4 w-4 mr-2" />}
                Save Time Zone
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
