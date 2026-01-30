'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { useTerminology } from '@/lib/hooks/use-terminology';

export default function CalendarPage() {
  const { terminology } = useTerminology();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${terminology.event.route}?view=calendar`, { scroll: false });
  }, [router, terminology.event.route]);

  return (
    <div className="p-6">
      <Card className="p-6">
        <div className="text-muted-foreground">Loading calendar…</div>
      </Card>
    </div>
  );
}
