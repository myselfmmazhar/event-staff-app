import {
    ChevronDownIcon,
    ChevronUpIcon,
    ChevronsUpDownIcon,
} from '@/components/ui/icons';
import type { SortField, SortOrder } from './types';

export function SortIndicator({ field, activeField, order }: {
    field: SortField;
    activeField: SortField;
    order: SortOrder;
}) {
    if (field !== activeField) {
        return <ChevronsUpDownIcon className="h-3.5 w-3.5 text-muted-foreground/40" />;
    }
    return order === 'asc'
        ? <ChevronUpIcon className="h-3.5 w-3.5 text-primary" />
        : <ChevronDownIcon className="h-3.5 w-3.5 text-primary" />;
}
