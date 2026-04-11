import { trpc } from '@/lib/client/trpc';
import { useTerminology } from '@/lib/hooks/use-terminology';
import { interpolateLabel } from '@/lib/config/labels';

/**
 * Hook to get column labels for a page
 * Returns saved labels from the database, falling back to defaults
 */
export function useColumnLabels(page: string, defaults: Record<string, string>) {
    // Query labels with proper cache settings - refetch when cache is invalidated
    const { data: allLabels } = trpc.settings.getLabels.useQuery(undefined, {
        // Keep cached data but respond to invalidations
        staleTime: 0,
    });
    const { terminology } = useTerminology();

    // Merge saved labels with defaults
    const labels: Record<string, string> = { ...defaults };

    const pages = allLabels?.pages as unknown as Record<string, Record<string, unknown>> | undefined;
    const pageLabels = pages?.[page];


    if (pageLabels) {
        // Column labels are stored in nested object structure: { columns: { clientId: "value" } }
        const columnsData = pageLabels.columns as Record<string, unknown> | undefined;


        Object.keys(defaults).forEach((key) => {
            const nestedValue = columnsData?.[key];
            const legacyValue = (pageLabels as Record<string, unknown>)[`columns.${key}`];

            const rawValue =
                (typeof nestedValue === 'string' && nestedValue) ||
                (typeof legacyValue === 'string' && legacyValue);

            if (rawValue) {
                labels[key] = interpolateLabel(rawValue, terminology);
            } else {
                labels[key] = interpolateLabel(labels[key] ?? defaults[key] ?? '', terminology);
            }
        });
    }

    // Ensure defaults are interpolated even when no server labels exist yet
    if (!pageLabels) {
        Object.keys(defaults).forEach((key) => {
            labels[key] = interpolateLabel(labels[key] ?? defaults[key] ?? '', terminology);
        });
    }

    return labels;
}
