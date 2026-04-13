'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type TimesheetDetailToolbarProps = {
    search: string;
    onSearchChange: (v: string) => void;
    status: string;
    onStatusChange: (v: string) => void;
    commission: string;
    onCommissionChange: (v: string) => void;
    rateType: string;
    onRateTypeChange: (v: string) => void;
    variance: string;
    onVarianceChange: (v: string) => void;
    onCustomizeColumns: () => void;
    exportControl: React.ReactNode;
    subTab?: string;
};

export function TimesheetDetailToolbar({
    search,
    onSearchChange,
    status,
    onStatusChange,
    commission,
    onCommissionChange,
    rateType,
    onRateTypeChange,
    variance,
    onVarianceChange,
    onCustomizeColumns,
    exportControl,
    subTab,
}: TimesheetDetailToolbarProps) {
    const isCommission = subTab === 'commission';

    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between px-1 pb-3">
            <Input
                placeholder={isCommission ? "Search Team / User" : "Search talent, service, shift, or task"}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 max-w-md rounded-lg border-border bg-background text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
                <Select value={status} onValueChange={onStatusChange}>
                    <SelectTrigger className="h-9 w-[130px] rounded-lg text-xs">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Status</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REVIEW">Review</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                </Select>

                {!isCommission && (
                    <>
                        <Select value={commission} onValueChange={onCommissionChange}>
                            <SelectTrigger className="h-9 w-[140px] rounded-lg text-xs">
                                <SelectValue placeholder="Commission" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Commission</SelectItem>
                                <SelectItem value="yes">Commission: Yes</SelectItem>
                                <SelectItem value="no">Commission: No</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={rateType} onValueChange={onRateTypeChange}>
                            <SelectTrigger className="h-9 w-[140px] rounded-lg text-xs">
                                <SelectValue placeholder="Rate type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Rate type</SelectItem>
                                <SelectItem value="PER_HOUR">Hour</SelectItem>
                                <SelectItem value="PER_SHIFT">Shift</SelectItem>
                                <SelectItem value="PER_DAY">Day</SelectItem>
                                <SelectItem value="PER_EVENT">Event</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={variance} onValueChange={onVarianceChange}>
                            <SelectTrigger className="h-9 w-[130px] rounded-lg text-xs">
                                <SelectValue placeholder="Variance" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Variance</SelectItem>
                                <SelectItem value="zero">No variance</SelectItem>
                                <SelectItem value="positive">Over scheduled</SelectItem>
                                <SelectItem value="negative">Under scheduled</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button type="button" variant="outline" size="sm" className="h-9 rounded-lg text-xs" onClick={onCustomizeColumns}>
                            Customize columns
                        </Button>
                    </>
                )}
                <div className="flex items-center">{exportControl}</div>
            </div>
        </div>
    );
}
