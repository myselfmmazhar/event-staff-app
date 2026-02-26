'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ContactSchema, type CreateContactInput, type UpdateContactInput } from '@/lib/schemas/contact.schema';
import { CheckCircle2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';

interface ContactFormModalProps {
    open: boolean;
    onClose: () => void;
    contact?: any; // Replace with proper type
    onSubmit: (data: any) => void;
    isSubmitting: boolean;
}

export function ContactFormModal({
    open,
    onClose,
    contact,
    onSubmit,
    isSubmitting,
}: ContactFormModalProps) {
    const isEdit = !!contact;

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(isEdit ? ContactSchema.update : ContactSchema.create),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            dateOfBirth: '',
            transactionType: '',
            ricsSurveyAccount: false,
            correspondingAddress: '',
            contactSource: '',
            contactType: '',
        },
    });

    useEffect(() => {
        if (contact) {
            reset({
                ...contact,
                dateOfBirth: contact.dateOfBirth ? new Date(contact.dateOfBirth).toISOString().split('T')[0] : '',
            });
        } else {
            reset({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                dateOfBirth: '',
                transactionType: '',
                ricsSurveyAccount: false,
                correspondingAddress: '',
                contactSource: '',
                contactType: '',
            });
        }
    }, [contact, reset, open]);

    const handleFormSubmit = (data: any) => {
        onSubmit(data);
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-0 border-none rounded-3xl shadow-2xl bg-white">
                <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col">
                    <DialogHeader className="p-8 pb-4">
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">
                            {isEdit ? 'Update Contact' : 'Add New Contact'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-8 py-2 space-y-6">
                        {/* Name Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="firstName" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">First Name</Label>
                                <Input
                                    id="firstName"
                                    {...register('firstName')}
                                    disabled={isSubmitting}
                                    placeholder="First Name"
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700"
                                />
                                {errors.firstName && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1">{errors.firstName.message as string}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Last Name</Label>
                                <Input
                                    id="lastName"
                                    {...register('lastName')}
                                    disabled={isSubmitting}
                                    placeholder="Last Name"
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700"
                                />
                                {errors.lastName && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1">{errors.lastName.message as string}</p>
                                )}
                            </div>
                        </div>

                        {/* Contact Info Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between ml-1">
                                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-500">Email</Label>
                                    {watch('email') && (
                                        <Badge variant="outline" className="border-none bg-emerald-50 text-emerald-600 font-black text-[9px] gap-1 px-2 py-0.5 rounded-full">
                                            <CheckCircle2 className="h-2.5 w-2.5 fill-emerald-600 text-white" />
                                            VERIFIED
                                        </Badge>
                                    )}
                                </div>
                                <div className="relative group">
                                    <Input
                                        id="email"
                                        type="email"
                                        {...register('email')}
                                        disabled={isSubmitting}
                                        placeholder="Email address"
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white pr-12 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white shadow-sm border border-slate-100 group-hover:border-primary/30 transition-colors">
                                        <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                </div>
                                {errors.email && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1">{errors.email.message as string}</p>
                                )}
                                <p className="text-[10px] text-slate-400 font-bold ml-1 uppercase tracking-tighter">
                                    You can Reverify your Email <span className="text-primary hover:underline cursor-pointer">Re-Verify Here</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Phone</Label>
                                <div className="relative group">
                                    <Input
                                        id="phone"
                                        {...register('phone')}
                                        disabled={isSubmitting}
                                        placeholder="Phone number"
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white pr-12 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-white shadow-sm border border-slate-100 group-hover:border-primary/30 transition-colors">
                                        <Pencil className="h-3.5 w-3.5 text-slate-400" />
                                    </div>
                                </div>
                                {errors.phone && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1">{errors.phone.message as string}</p>
                                )}
                            </div>
                        </div>

                        {/* Logistics Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="dateOfBirth" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Date Of Birth</Label>
                                <Input
                                    id="dateOfBirth"
                                    type="date"
                                    {...register('dateOfBirth')}
                                    disabled={isSubmitting}
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700"
                                />
                                {errors.dateOfBirth && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1">{errors.dateOfBirth.message as string}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="transactionType" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">
                                    Transaction Type
                                </Label>
                                <div className="relative group">
                                    <Input
                                        id="transactionType"
                                        {...register('transactionType')}
                                        disabled={isSubmitting}
                                        placeholder="Sale & Purchase"
                                        className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white pr-12 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                        <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                    </div>
                                </div>
                                {errors.transactionType && (
                                    <p className="text-xs text-destructive font-bold mt-1 ml-1">{errors.transactionType.message as string}</p>
                                )}
                            </div>
                        </div>

                        {/* Detailed Logistics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="contactSource" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Contact Source</Label>
                                <Input
                                    id="contactSource"
                                    {...register('contactSource')}
                                    disabled={isSubmitting}
                                    placeholder="Source"
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700 opacity-80"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contactType" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Contact Type</Label>
                                <Input
                                    id="contactType"
                                    {...register('contactType')}
                                    disabled={isSubmitting}
                                    placeholder="Contact Type"
                                    className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700"
                                />
                            </div>
                        </div>

                        {/* Address - Full Width */}
                        <div className="space-y-2">
                            <Label htmlFor="correspondingAddress" className="text-xs font-black uppercase tracking-widest text-slate-500 ml-1">Corresponding Address</Label>
                            <Input
                                id="correspondingAddress"
                                {...register('correspondingAddress')}
                                disabled={isSubmitting}
                                placeholder="Corresponding Address"
                                className="h-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-semibold text-slate-700"
                            />
                            {errors.correspondingAddress && (
                                <p className="text-xs text-destructive font-bold mt-1 ml-1">{errors.correspondingAddress.message as string}</p>
                            )}
                        </div>

                        {/* RICS Account - Professional Layout */}
                        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                            <Label className="text-sm font-black text-slate-700 leading-snug tracking-tight">
                                Want To Move Opp Into RICS Survey Account?
                            </Label>
                            <RadioGroup
                                value={watch('ricsSurveyAccount') ? "yes" : "no"}
                                onValueChange={(value) => setValue('ricsSurveyAccount', value === "yes", { shouldValidate: true, shouldDirty: true })}
                                className="flex gap-8"
                                disabled={isSubmitting}
                            >
                                <div className="flex items-center space-x-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <RadioGroupItem value="yes" id="rics-yes" className="h-5 w-5 border-slate-300 text-primary focus-visible:ring-primary h-5 w-5" />
                                    </div>
                                    <Label htmlFor="rics-yes" className="text-sm font-bold text-slate-600 cursor-pointer group-hover:text-primary transition-colors">Yes, Move Opp</Label>
                                </div>
                                <div className="flex items-center space-x-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <RadioGroupItem value="no" id="rics-no" className="h-5 w-5 border-slate-300 text-primary focus-visible:ring-primary h-5 w-5" />
                                    </div>
                                    <Label htmlFor="rics-no" className="text-sm font-bold text-slate-600 cursor-pointer group-hover:text-primary transition-colors">No, Keep Regular</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    <DialogFooter className="p-8 mt-4 bg-slate-50 border-t border-slate-100 rounded-b-3xl gap-3">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-2xl h-14 px-8 font-black text-slate-500 hover:bg-slate-200/50 transition-all">
                            Discard
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-2xl h-14 px-10 font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-primary hover:bg-primary/90 text-white gap-2">
                            {isEdit ? 'Update Record' : 'Create Contact'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

