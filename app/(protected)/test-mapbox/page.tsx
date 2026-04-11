"use client";

import { useState } from "react";
import { AddressAutocomplete } from "@/components/maps/address-autocomplete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestMapboxPage() {
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [token, setToken] = useState<string | undefined>(undefined);

  useState(() => {
    setToken(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapbox Token Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Token Status:</p>
            <code className="text-xs bg-muted p-2 rounded block break-all">
              {token ? `✅ Token loaded: ${token.substring(0, 20)}...` : "❌ No token found"}
            </code>
          </div>

          <div>
            <p className="text-sm font-medium mb-4">Test Address Autocomplete:</p>
            <AddressAutocomplete
              onSelect={(data) => {
                console.log("Selected address:", data);
                setSelectedAddress(data);
              }}
              placeholder="Type an address..."
            />
          </div>

          {selectedAddress && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <p className="text-sm font-semibold text-green-900 mb-2">
                ✅ Address Selected Successfully!
              </p>
              <pre className="text-xs bg-white p-2 rounded">
                {JSON.stringify(selectedAddress, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
