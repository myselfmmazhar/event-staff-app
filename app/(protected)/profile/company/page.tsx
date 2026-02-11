'use client';

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserIcon, BriefcaseIcon, MapPinIcon, CheckCircleIcon, AlertIcon, PlusIcon, TrashIcon, ClockIcon } from '@/components/ui/icons';
import { trpc } from '@/lib/client/trpc';
import { TIMEZONES } from '@/lib/schemas/event.schema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProfileSettingsPage() {
    const [formData, setFormData] = useState({
        companyName: '',
        companyTagline: '',
        companyPhone: '',
        companyAddress: '',
        companyLogoUrl: '',
        companyTimezone: 'UTC',
    });
    const [savedMessage, setSavedMessage] = useState<'success' | 'error' | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch current profile
    const { data: profile, isLoading } = trpc.settings.getCompanyProfile.useQuery();
    const utils = trpc.useUtils();

    // Update mutation
    const updateMutation = trpc.settings.updateCompanyProfile.useMutation({
        onSuccess: () => {
            setSavedMessage('success');
            utils.settings.getCompanyProfile.invalidate();
            setTimeout(() => setSavedMessage(null), 3000);
        },
        onError: () => {
            setSavedMessage('error');
            setTimeout(() => setSavedMessage(null), 5000);
        },
    });

    // Load existing data
    useEffect(() => {
        if (profile) {
            setFormData({
                companyName: profile.companyName || '',
                companyTagline: profile.companyTagline || '',
                companyPhone: profile.companyPhone || '',
                companyAddress: profile.companyAddress || '',
                companyLogoUrl: profile.companyLogoUrl || '',
                companyTimezone: profile.companyTimezone || 'UTC',
            });
            if (profile.companyLogoUrl) {
                setLogoPreview(profile.companyLogoUrl);
            }
        }
    }, [profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Image must be less than 2MB');
            return;
        }

        // Convert to base64 for preview and storage
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setLogoPreview(dataUrl);
            setFormData((prev) => ({ ...prev, companyLogoUrl: dataUrl }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        setFormData((prev) => ({ ...prev, companyLogoUrl: '' }));
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateMutation.mutate({
            companyName: formData.companyName || null,
            companyTagline: formData.companyTagline || null,
            companyPhone: formData.companyPhone || null,
            companyAddress: formData.companyAddress || null,
            companyLogoUrl: formData.companyLogoUrl || null,
            companyTimezone: formData.companyTimezone || 'UTC',
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
                        <p className="text-sm text-muted-foreground">Branding and company settings</p>
                    </div>
                </div>
                <Card className="p-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <UserIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Profile</h1>
                    <p className="text-sm text-muted-foreground">Branding and company settings</p>
                </div>
            </div>

            {/* Success/Error Message */}
            {savedMessage && (
                <div
                    className={`flex items-center gap-2 p-4 rounded-lg ${savedMessage === 'success'
                        ? 'bg-green-500/10 text-green-600'
                        : 'bg-red-500/10 text-red-600'
                        }`}
                >
                    {savedMessage === 'success' ? (
                        <>
                            <CheckCircleIcon className="h-5 w-5" />
                            <span>Company profile updated successfully!</span>
                        </>
                    ) : (
                        <>
                            <AlertIcon className="h-5 w-5" />
                            <span>Failed to update profile. Please try again.</span>
                        </>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Logo Upload Card */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Company Logo</h2>
                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        {/* Logo Preview */}
                        <div className="flex-shrink-0">
                            {logoPreview ? (
                                <div className="relative group">
                                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                                        <img
                                            src={logoPreview}
                                            alt="Company Logo"
                                            className="max-w-full max-h-full object-contain"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        className="absolute -top-2 -right-2 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <label
                                    htmlFor="logo-upload"
                                    className="w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                                >
                                    <PlusIcon className="h-8 w-8 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground mt-1">Add Logo</span>
                                </label>
                            )}
                        </div>

                        {/* Upload Instructions */}
                        <div className="flex-1 space-y-3">
                            <div>
                                <p className="text-sm text-muted-foreground">
                                    Upload your company logo. This will appear in emails and throughout the platform.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Recommended: Square image, PNG or JPG, max 2MB
                                </p>
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    id="logo-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Company Info Card */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <BriefcaseIcon className="h-5 w-5 text-primary" />
                        <h2 className="text-lg font-semibold">Company Information</h2>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                                id="companyName"
                                name="companyName"
                                value={formData.companyName}
                                onChange={handleChange}
                                placeholder="Your company name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyPhone">Phone Number</Label>
                            <Input
                                id="companyPhone"
                                name="companyPhone"
                                value={formData.companyPhone}
                                onChange={handleChange}
                                placeholder="+1 (555) 000-0000"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="companyTagline">Tagline</Label>
                            <Input
                                id="companyTagline"
                                name="companyTagline"
                                value={formData.companyTagline}
                                onChange={handleChange}
                                placeholder="A short description of your company"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="companyAddress">Address</Label>
                            <div className="relative">
                                <MapPinIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Textarea
                                    id="companyAddress"
                                    name="companyAddress"
                                    value={formData.companyAddress}
                                    onChange={handleChange}
                                    placeholder="123 Business Street, Suite 100, City, State 12345"
                                    className="pl-10 min-h-[80px]"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="companyTimezone">Default Timezone</Label>
                            <div className="flex items-center gap-2">
                                <ClockIcon className="h-4 w-4 text-muted-foreground mr-1" />
                                <Select
                                    value={formData.companyTimezone}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, companyTimezone: value }))}
                                >
                                    <SelectTrigger id="companyTimezone" className="flex-1">
                                        <SelectValue placeholder="Select timezone..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIMEZONES.map((tz) => (
                                            <SelectItem key={tz} value={tz}>
                                                {tz}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                This timezone will be used as the default for all new events and tasks.
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end">
                    <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
