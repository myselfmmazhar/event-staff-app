'use client';

import { Card } from '@/components/ui/card';
import { MapPinIcon } from '@/components/ui/icons';

export default function LocationsPage() {
  return (
    <div className="p-6">
      <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <MapPinIcon className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Operational Locations</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          We are currently building the location management system. Soon you will be able to define service zones, branch offices, and event venues here.
        </p>
        <div className="mt-8 px-4 py-2 bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest rounded-full">
          Coming Soon
        </div>
      </Card>
    </div>
  );
}
