'use client';

import * as React from 'react';
import { MoreVerticalIcon } from '@/components/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ActionItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'warning' | 'info';
    disabled?: boolean;
}

interface ActionDropdownProps {
    actions: ActionItem[];
    align?: 'start' | 'center' | 'end';
}

export function ActionDropdown({ actions, align = 'end' }: ActionDropdownProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 hover:bg-muted"
                >
                    <MoreVerticalIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                align={align} 
                className="w-40 p-1 z-[110]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col gap-0.5">
                    {actions.map((action, index) => (
                        <button
                            key={`${action.label}-${index}`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!action.disabled) {
                                    setOpen(false);
                                    action.onClick();
                                }
                            }}
                            disabled={action.disabled}
                            className={cn(
                                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-[11px] font-medium transition-colors text-left",
                                "hover:bg-accent hover:text-accent-foreground",
                                action.variant === 'destructive' && "text-red-600 hover:bg-red-50",
                                action.variant === 'warning' && "text-amber-600 hover:bg-amber-50",
                                action.variant === 'info' && "text-blue-600 hover:bg-blue-50",
                                action.disabled && "opacity-50 cursor-not-allowed pointer-events-none grayscale"
                            )}
                        >
                            {action.icon && <span className="h-3.5 w-3.5 flex-shrink-0">{action.icon}</span>}
                            <span className="truncate">{action.label}</span>
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
