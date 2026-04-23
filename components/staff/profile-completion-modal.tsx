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
import { phoneValidation } from '@/lib/utils/validation';
import { FieldErrors } from '@/lib/utils/error-messages';
import { BusinessStructure } from '@prisma/client';
import {
    StaffDocumentUpload,
    type StaffDocument,
} from '@/components/staff/staff-document-upload';
import { AddressAutocomplete } from '@/components/maps/address-autocomplete';

/**
 * Contact-only form schema used by react-hook-form. Tax fields are kept in
 * local state and validated manually; the server `staff.completeProfile`
 * schema is the authoritative source of truth for all required fields.
 */
const contactFormSchema = z.object({
    phone: z
        .string()
        .min(1, 'Phone number is required')
        .refine((phone) => phoneValidation.isValid(phone), {
            message: FieldErrors.phone.invalid,
        }),
    streetAddress: z.string().min(1, 'Street address is required').max(300),
    aptSuiteUnit: z.string().max(50).optional(),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(50),
    zipCode: z.string().min(1, 'ZIP code is required').max(20),
    country: z.string().min(1, 'Country is required').max(100),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const businessStructureLabels: Record<BusinessStructure, string> = {
    INDIVIDUAL: 'Individual / Sole Proprietor',
    LLC: 'LLC',
    C_CORPORATION: 'C Corporation',
    S_CORPORATION: 'S Corporation',
    PARTNERSHIP: 'Partnership',
    TRUST_ESTATE: 'Trust/Estate',
    OTHER: 'Other',
};

const SSN_PATTERN = /^\d{3}-?\d{2}-?\d{4}$/;
const EIN_PATTERN = /^\d{2}-?\d{7}$/;

type TaxFieldErrors = Partial<Record<
    | 'taxName'
    | 'taxAddress'
    | 'taxCity'
    | 'taxState'
    | 'taxZip'
    | 'ssn'
    | 'ein'
    | 'llcClassification',
    string
>>;

interface ProfileCompletionModalProps {
    isOpen: boolean;
}

export function ProfileCompletionModal({ isOpen }: ProfileCompletionModalProps) {
    const router = useRouter();
    const utils = trpc.useUtils();
    const [documents, setDocuments] = useState<StaffDocument[]>([]);
    const [submitAttempted, setSubmitAttempted] = useState(false);
    const [taxErrors, setTaxErrors] = useState<TaxFieldErrors>({});
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

    const completeProfileMutation = trpc.staff.completeProfile.useMutation({
        onSuccess: async () => {
            toast({ message: 'Profile completed successfully!', type: 'success' });
            await utils.staff.getMyProfile.invalidate();
            await utils.profile.getMyProfile.invalidate();
            router.push('/dashboard');
            router.refresh();
        },
        onError: (error) => {
            toast({ message: error.message || 'Failed to save profile', type: 'error' });
        },
    });

    const form = useForm<ContactFormData>({
        resolver: zodResolver(contactFormSchema),
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

    const isPending = completeProfileMutation.isPending;

    const validateTax = (): TaxFieldErrors => {
        const errors: TaxFieldErrors = {};
        const ssn = taxFields.ssn.trim();
        const ein = taxFields.ein.trim();

        if (!taxFields.taxName.trim()) {
            errors.taxName = 'Name (as shown on your income tax return) is required';
        }
        if (!taxFields.taxAddress.trim()) errors.taxAddress = 'Tax address is required';
        if (!taxFields.taxCity.trim()) errors.taxCity = 'Tax city is required';
        if (!taxFields.taxState.trim()) errors.taxState = 'Tax state is required';
        if (!taxFields.taxZip.trim()) errors.taxZip = 'Tax ZIP code is required';

        if (!ssn && !ein) {
            errors.ssn = 'Either Social Security Number or Employer Identification Number is required';
        } else {
            if (ssn && !SSN_PATTERN.test(ssn)) {
                errors.ssn = 'SSN must be in format XXX-XX-XXXX';
            }
            if (ein && !EIN_PATTERN.test(ein)) {
                errors.ein = 'EIN must be in format XX-XXXXXXX';
            }
        }

        if (
            taxFields.businessStructure === BusinessStructure.LLC &&
            !taxFields.llcClassification.trim()
        ) {
            errors.llcClassification =
                'LLC Tax Classification is required when Federal Tax Classification is LLC';
        }

        return errors;
    };

    const onSubmit = (data: ContactFormData) => {
        setSubmitAttempted(true);
        const errors = validateTax();
        setTaxErrors(errors);

        if (Object.keys(errors).length > 0) {
            const firstError = Object.values(errors)[0];
            if (firstError) toast({ message: firstError, type: 'error' });
            return;
        }

        completeProfileMutation.mutate({
            ...data,
            documents: documents.length > 0 ? documents : undefined,
            taxName: taxFields.taxName,
            businessName: taxFields.businessName || undefined,
            businessStructure: taxFields.businessStructure,
            llcClassification: taxFields.llcClassification || undefined,
            taxAddress: taxFields.taxAddress,
            taxCity: taxFields.taxCity,
            taxState: taxFields.taxState,
            taxZip: taxFields.taxZip,
            ssn: taxFields.ssn || undefined,
            ein: taxFields.ein || undefined,
        });
    };

    const showError = (field: keyof TaxFieldErrors) =>
        submitAttempted && !!taxErrors[field];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop with blur */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="w-full max-w-2xl my-8">
                    <Card className="shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
                            <CardDescription>
                                Please fill in your details to start using the platform. This cannot be skipped.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="max-h-[calc(100vh-200px)] overflow-y-auto">
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
                                        <AddressAutocomplete
                                            label="Search Address"
                                            placeholder="Type to search..."
                                            disabled={isPending}
                                            onSelect={(data) => {
                                                form.setValue('streetAddress', data.address, { shouldValidate: true });
                                                form.setValue('city', data.city, { shouldValidate: true });
                                                form.setValue('state', data.state, { shouldValidate: true });
                                                form.setValue('zipCode', data.zipCode, { shouldValidate: true });
                                                form.setValue('country', 'USA', { shouldValidate: true });
                                            }}
                                        />
                                    </div>
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
                                            <Label htmlFor="taxName" requiredMark>
                                                Name (as shown on your income tax return)
                                            </Label>
                                            <Input
                                                id="taxName"
                                                placeholder="Legal name"
                                                disabled={isPending}
                                                value={taxFields.taxName}
                                                onChange={(e) => setTaxFields(p => ({ ...p, taxName: e.target.value }))}
                                                invalid={showError('taxName')}
                                            />
                                            {showError('taxName') && (
                                                <p className="text-sm text-destructive mt-1">{taxErrors.taxName}</p>
                                            )}
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
                                                Federal Tax Classification
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
                                                <Label htmlFor="llcClassification" requiredMark>LLC Tax Classification</Label>
                                                <Select
                                                    value={taxFields.llcClassification}
                                                    onValueChange={(v) => setTaxFields(p => ({ ...p, llcClassification: v }))}
                                                    disabled={isPending}
                                                >
                                                    <SelectTrigger id="llcClassification" aria-invalid={showError('llcClassification')}>
                                                        <SelectValue placeholder="Select LLC classification" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="C">C — C Corporation</SelectItem>
                                                        <SelectItem value="S">S — S Corporation</SelectItem>
                                                        <SelectItem value="P">P — Partnership</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {showError('llcClassification') && (
                                                    <p className="text-sm text-destructive mt-1">{taxErrors.llcClassification}</p>
                                                )}
                                            </div>
                                        )}
                                        <div>
                                            <Label htmlFor="taxAddress" requiredMark>Address (number, street, apt/suite)</Label>
                                            <Input
                                                id="taxAddress"
                                                placeholder="Street address"
                                                disabled={isPending}
                                                value={taxFields.taxAddress}
                                                onChange={(e) => setTaxFields(p => ({ ...p, taxAddress: e.target.value }))}
                                                invalid={showError('taxAddress')}
                                            />
                                            {showError('taxAddress') && (
                                                <p className="text-sm text-destructive mt-1">{taxErrors.taxAddress}</p>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <Label htmlFor="taxCity" requiredMark>City</Label>
                                                <Input
                                                    id="taxCity"
                                                    placeholder="City"
                                                    disabled={isPending}
                                                    value={taxFields.taxCity}
                                                    onChange={(e) => setTaxFields(p => ({ ...p, taxCity: e.target.value }))}
                                                    invalid={showError('taxCity')}
                                                />
                                                {showError('taxCity') && (
                                                    <p className="text-sm text-destructive mt-1">{taxErrors.taxCity}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="taxState" requiredMark>State</Label>
                                                <Input
                                                    id="taxState"
                                                    placeholder="State"
                                                    disabled={isPending}
                                                    value={taxFields.taxState}
                                                    onChange={(e) => setTaxFields(p => ({ ...p, taxState: e.target.value }))}
                                                    invalid={showError('taxState')}
                                                />
                                                {showError('taxState') && (
                                                    <p className="text-sm text-destructive mt-1">{taxErrors.taxState}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label htmlFor="taxZip" requiredMark>ZIP Code</Label>
                                                <Input
                                                    id="taxZip"
                                                    placeholder="ZIP"
                                                    disabled={isPending}
                                                    value={taxFields.taxZip}
                                                    onChange={(e) => setTaxFields(p => ({ ...p, taxZip: e.target.value }))}
                                                    invalid={showError('taxZip')}
                                                />
                                                {showError('taxZip') && (
                                                    <p className="text-sm text-destructive mt-1">{taxErrors.taxZip}</p>
                                                )}
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
                                                        invalid={showError('ssn')}
                                                    />
                                                    {showError('ssn') && (
                                                        <p className="text-sm text-destructive mt-1">{taxErrors.ssn}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <Label htmlFor="ein">Employer Identification Number</Label>
                                                    <Input
                                                        id="ein"
                                                        placeholder="XX-XXXXXXX"
                                                        disabled={isPending}
                                                        value={taxFields.ein}
                                                        onChange={(e) => setTaxFields(p => ({ ...p, ein: e.target.value }))}
                                                        invalid={showError('ein')}
                                                    />
                                                    {showError('ein') && (
                                                        <p className="text-sm text-destructive mt-1">{taxErrors.ein}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4 border-t">
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-full"
                                        disabled={isPending}
                                        isLoading={isPending}
                                    >
                                        {isPending ? 'Saving Profile...' : 'Complete Profile'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
