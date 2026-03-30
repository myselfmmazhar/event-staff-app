'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MailIcon, PhoneIcon, MapPinIcon, UserIcon } from '@/components/ui/icons';
import { Badge } from '@/components/ui/badge';

interface TalentContactPopoverProps {
    talent: {
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        city?: string;
        state?: string;
        accountStatus?: string;
        staffRating?: string;
    };
    trigger: React.ReactNode;
}

export function TalentContactPopover({ talent, trigger }: TalentContactPopoverProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                {trigger}
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 overflow-hidden" align="start">
                <div className="bg-primary/5 px-4 py-3 border-b border-primary/10 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <UserIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground leading-none">{talent.firstName} {talent.lastName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            {talent.accountStatus && (
                                <Badge variant={talent.accountStatus === 'ACTIVE' ? 'success' : 'secondary'} className="text-[9px] h-4 px-1">
                                    {talent.accountStatus}
                                </Badge>
                            )}
                            {talent.staffRating && (
                                <span className="text-[10px] font-bold text-amber-500">★ {talent.staffRating}</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <MailIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Email Address</span>
                            <a href={`mailto:${talent.email}`} className="text-sm font-medium hover:text-primary transition-colors">
                                {talent.email || '—'}
                            </a>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <PhoneIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Phone Number</span>
                            <a href={`tel:${talent.phone}`} className="text-sm font-medium hover:text-primary transition-colors">
                                {talent.phone || '—'}
                            </a>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPinIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Location</span>
                            <span className="text-sm font-medium">
                                {[talent.city, talent.state].filter(Boolean).join(', ') || '—'}
                            </span>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
