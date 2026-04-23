'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { trpc } from '@/lib/client/trpc';
import { StaffSchema } from '@/lib/schemas/staff.schema';
import { BusinessStructure } from '@prisma/client';
import { Loader2 } from 'lucide-react';
import {
    StaffDocumentUpload,
    type StaffDocument,
} from '@/components/staff/staff-document-upload';

type ProfileFormData = z.infer<typeof StaffSchema.completeProfile>;

const businessStructureLabels: Record<BusinessStructure, string> = {
    INDIVIDUAL: 'Individual / Sole Proprietor',
    LLC: 'LLC',
    C_CORPORATION: 'C Corporation',
    S_CORPORATION: 'S Corporation',
    PARTNERSHIP: 'Partnership',
    TRUST_ESTATE: 'Trust/Estate',
    OTHER: 'Other',
};

export default function CompleteProfilePage() {
    const router = useRouter();
    const [documents, setDocuments] = useState<StaffDocument[]>([]);
    const [taxFields, setTaxFields] = useState<{
        taxName: string;
        businessName: string;
        businessStructure: BusinessStructure;
        llcClassification: string;
        taxAddress: string;
        taxCity: string;
        taxState: string;
        taxZip: string;
        ssn: string;
        ein: string;
    }>({
        taxName: '',
        businessName: '',
        businessStructure: BusinessStructure.INDIVIDUAL,
        llcClassification: '',
        taxAddress: '',
        taxCity: '',
        taxState: '',
        taxZip: '',
        ssn: '',
        ein: '',
    });

    const taxDetailsMutation = trpc.staffTaxDetails.upsert.useMutation();

    const completeProfileMutation = trpc.staff.completeProfile.useMutation({
        onSuccess: async (staff) => {
            try {
                await taxDetailsMutation.mutateAsync({
                    staffId: staff.id,
                    taxFilledBy: 'TALENT' as const,
                    taxName: taxFields.taxName || undefined,
                    businessStructure: taxFields.businessStructure,
                    businessName: taxFields.businessName || undefined,
                    llcClassification: taxFields.llcClassification || undefined,
                    taxAddress: taxFields.taxAddress || undefined,
                    taxCity: taxFields.taxCity || undefined,
                    taxState: taxFields.taxState || undefined,
                    taxZip: taxFields.taxZip || undefined,
                    ssn: taxFields.ssn || undefined,
                    ein: taxFields.ein || undefined,
                });
                toast({ message: 'Profile completed successfully!', type: 'success' });
                router.push('/dashboard');
            } catch {
                toast({ message: 'Profile saved. Tax details could not be saved — update them from your profile.', type: 'error' });
            }
        },
        onError: (error) => {
            toast({ message: error.message || 'Failed to save profile', type: 'error' });
        },
    });

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(StaffSchema.completeProfile),
        defaultValues: {
            phone: '',
            streetAddress: '',
            aptSuiteUnit: '',
            city: '',
            state: '',
            zipCode: '',
            country: 'USA',
        },
    });

    const isPending = completeProfileMutation.isPending || taxDetailsMutation.isPending;

    const onSubmit = (data: ProfileFormData) => {
        // Validate required tax fields
        if (!taxFields.taxName || taxFields.taxName.trim() === '') {
            toast({ message: 'Name (as shown on your income tax return) is required', type: 'error' });
            return;
        }

        if (!taxFields.ssn || taxFields.ssn.trim() === '') {
            if (!taxFields.ein || taxFields.ein.trim() === '') {
                toast({ message: 'Either Social Security Number or Employer Identification Number is required', type: 'error' });
                return;
            }
        }

        completeProfileMutation.mutate({
            ...data,
            documents: documents.length > 0 ? documents : undefined,
        });
    };

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground">Complete Your Profile</h1>
                <p className="text-muted-foreground mt-2">
                    Please fill in your details to start using the platform.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                        This information helps us set up your account properly.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Contact */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Contact</h3>
                            <div>
                                <Label htmlFor="phone" requiredMark>Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="(555) 555-5555"
                                    invalid={!!form.formState.errors.phone}
                                    disabled={isPending}
                                    {...form.register('phone')}
                                />
                                {form.formState.errors.phone && (
                                    <p className="text-sm text-destructive mt-1">{String(form.formState.errors.phone.message)}</p>
                                )}
                            </div>
                        </div>

                        {/* Address */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Address</h3>
                            <div>
                                <Label htmlFor="streetAddress" requiredMark>Street Address</Label>
                                <Input
                                    id="streetAddress"
                                    placeholder="123 Main St"
                                    invalid={!!form.formState.errors.streetAddress}
                                    disabled={isPending}
                                    {...form.register('streetAddress')}
                                />
                                {form.formState.errors.streetAddress && (
                                    <p className="text-sm text-destructive mt-1">{String(form.formState.errors.streetAddress.message)}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="aptSuiteUnit">Apt/Suite/Unit</Label>
                                <Input id="aptSuiteUnit" placeholder="Apt 4B (optional)" disabled={isPending} {...form.register('aptSuiteUnit')} />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <Label htmlFor="city" requiredMark>City</Label>
                                    <Input id="city" placeholder="New York" invalid={!!form.formState.errors.city} disabled={isPending} {...form.register('city')} />
                                    {form.formState.errors.city && <p className="text-sm text-destructive mt-1">{String(form.formState.errors.city.message)}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="state" requiredMark>State</Label>
                                    <Input id="state" placeholder="NY" invalid={!!form.formState.errors.state} disabled={isPending} {...form.register('state')} />
                                    {form.formState.errors.state && <p className="text-sm text-destructive mt-1">{String(form.formState.errors.state.message)}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="zipCode" requiredMark>ZIP Code</Label>
                                    <Input id="zipCode" placeholder="10001" invalid={!!form.formState.errors.zipCode} disabled={isPending} {...form.register('zipCode')} />
                                    {form.formState.errors.zipCode && <p className="text-sm text-destructive mt-1">{String(form.formState.errors.zipCode.message)}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="country" requiredMark>Country</Label>
                                    <Input id="country" placeholder="USA" invalid={!!form.formState.errors.country} disabled={isPending} {...form.register('country')} />
                                    {form.formState.errors.country && <p className="text-sm text-destructive mt-1">{String(form.formState.errors.country.message)}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Documents */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Documents (Optional)</h3>
                            <StaffDocumentUpload documents={documents} onChange={setDocuments} disabled={isPending} />
                        </div>

                        {/* Tax Details */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium border-b pb-2">Tax Information (Required)</h3>

                            <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                <p className="text-sm text-muted-foreground">
                                    Please provide your tax information to complete your profile.
                                </p>

                                <div>
                                    <Label htmlFor="taxName" className="font-medium">
                                        Name (as shown on your income tax return) <span className="text-destructive">*</span>
                                    </Label>
                                    <Input 
                                        id="taxName" 
                                        placeholder="Legal name" 
                                        disabled={isPending} 
                                        value={taxFields.taxName} 
                                        onChange={(e) => setTaxFields(p => ({ ...p, taxName: e.target.value }))} 
                                        className={taxFields.taxName?.trim() === '' ? 'border-destructive' : ''}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="businessName">Business name (if different from above)</Label>
                                    <Input 
                                        id="businessName" 
                                        placeholder="Business name (if applicable)" 
                                        disabled={isPending} 
                                        value={taxFields.businessName} 
                                        onChange={(e) => setTaxFields(p => ({ ...p, businessName: e.target.value }))} 
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="businessStructure" className="font-medium">
                                        Federal Tax Classification <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={taxFields.businessStructure}
                                        onValueChange={(v) => setTaxFields(p => ({ ...p, businessStructure: v as BusinessStructure }))}
                                        disabled={isPending}
                                    >
                                        <SelectTrigger id="businessStructure">
                                            <SelectValue placeholder="Select classification" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(businessStructureLabels).map(([value, label]) => (
                                                <SelectItem key={value} value={value}>{label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {taxFields.businessStructure === BusinessStructure.LLC && (
                                    <div>
                                        <Label htmlFor="llcClassification">LLC Tax Classification</Label>
                                        <Select value={taxFields.llcClassification} onValueChange={(v) => setTaxFields(p => ({ ...p, llcClassification: v }))} disabled={isPending}>
                                            <SelectTrigger id="llcClassification"><SelectValue placeholder="Select LLC classification" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="C">C — C Corporation</SelectItem>
                                                <SelectItem value="S">S — S Corporation</SelectItem>
                                                <SelectItem value="P">P — Partnership</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                                <div>
                                    <Label htmlFor="taxAddress">Address (number, street, apt/suite)</Label>
                                    <Input 
                                        id="taxAddress" 
                                        placeholder="Street address" 
                                        disabled={isPending} 
                                        value={taxFields.taxAddress} 
                                        onChange={(e) => setTaxFields(p => ({ ...p, taxAddress: e.target.value }))} 
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label htmlFor="taxCity">City</Label>
                                        <Input 
                                            id="taxCity" 
                                            placeholder="City" 
                                            disabled={isPending} 
                                            value={taxFields.taxCity} 
                                            onChange={(e) => setTaxFields(p => ({ ...p, taxCity: e.target.value }))} 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="taxState">State</Label>
                                        <Input 
                                            id="taxState" 
                                            placeholder="State" 
                                            disabled={isPending} 
                                            value={taxFields.taxState} 
                                            onChange={(e) => setTaxFields(p => ({ ...p, taxState: e.target.value }))} 
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="taxZip">ZIP Code</Label>
                                        <Input 
                                            id="taxZip" 
                                            placeholder="ZIP" 
                                            disabled={isPending} 
                                            value={taxFields.taxZip} 
                                            onChange={(e) => setTaxFields(p => ({ ...p, taxZip: e.target.value }))} 
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4 p-3 border border-border/30 bg-accent/5 rounded-lg">
                                    <p className="text-sm font-medium">Taxpayer Identification Number (TIN) <span className="text-destructive">*</span></p>
                                    <p className="text-xs text-muted-foreground">Provide at least one of the following:</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <Label htmlFor="ssn">Social Security Number</Label>
                                            <Input 
                                                id="ssn" 
                                                type="password" 
                                                placeholder="XXX-XX-XXXX" 
                                                disabled={isPending} 
                                                autoComplete="off" 
                                                value={taxFields.ssn} 
                                                onChange={(e) => setTaxFields(p => ({ ...p, ssn: e.target.value }))} 
                                                className={(taxFields.ssn?.trim() === '' && taxFields.ein?.trim() === '') ? 'border-destructive' : ''}
                                            />
                                        </div>
                                        <div>
                                            <Label htmlFor="ein">Employer Identification Number</Label>
                                            <Input 
                                                id="ein" 
                                                placeholder="XX-XXXXXXX" 
                                                disabled={isPending} 
                                                value={taxFields.ein} 
                                                onChange={(e) => setTaxFields(p => ({ ...p, ein: e.target.value }))} 
                                                className={(taxFields.ssn?.trim() === '' && taxFields.ein?.trim() === '') ? 'border-destructive' : ''}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button type="submit" size="lg" className="w-full" isLoading={isPending}>
                            {isPending ? 'Saving...' : 'Complete Profile'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
