'use client';

import { featureFlags, getFeatureStatus } from '@/lib/config/feature-flags';

export default function FeatureFlagsDebugPage() {
    return (
        <div className="container mx-auto p-8">
            <h1 className="text-3xl font-bold mb-6">Feature Flags Debug</h1>

            <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Current Feature Flags Status</h2>

                <div className="space-y-3">
                    {Object.entries(featureFlags).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-muted rounded">
                            <span className="font-medium capitalize">{key}</span>
                            <span className={`
                px-3 py-1 rounded text-sm font-medium
                ${value === 'enabled' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                ${value === 'beta' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                ${value === 'disabled' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' : ''}
              `}>
                                {value === 'beta' ? 'Beta' : value.charAt(0).toUpperCase() + value.slice(1)}
                            </span>
                        </div>
                    ))}
                </div>

                <div className="mt-6 p-4 bg-muted/50 rounded border border-border">
                    <h3 className="font-semibold mb-2">Environment Variables (from process.env):</h3>
                    <pre className="text-xs overflow-auto">
                        {JSON.stringify({
                            NEXT_PUBLIC_FEATURE_CLIENTS: process.env.NEXT_PUBLIC_FEATURE_CLIENTS,
                            NEXT_PUBLIC_FEATURE_EVENTS: process.env.NEXT_PUBLIC_FEATURE_EVENTS,
                            NEXT_PUBLIC_FEATURE_USERS: process.env.NEXT_PUBLIC_FEATURE_USERS,
                            NEXT_PUBLIC_FEATURE_PROFILE: process.env.NEXT_PUBLIC_FEATURE_PROFILE,
                            NEXT_PUBLIC_FEATURE_DASHBOARD: process.env.NEXT_PUBLIC_FEATURE_DASHBOARD,
                        }, null, 2)}
                    </pre>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        <strong>Note:</strong> If you changed .env file, you must restart the dev server for changes to take effect!
                    </p>
                </div>
            </div>
        </div>
    );
}
