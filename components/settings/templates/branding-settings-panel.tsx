'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/client/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ColorPicker } from './color-picker';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import type { ButtonStyle, HeaderBackground } from '@/lib/schemas/template.schema';

export function BrandingSettingsPanel() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#667eea');
  const [secondaryColor, setSecondaryColor] = useState('#764ba2');
  const [buttonStyle, setButtonStyle] = useState<ButtonStyle>('gradient');
  const [buttonBorderRadius, setButtonBorderRadius] = useState('8px');
  const [headerBackground, setHeaderBackground] = useState<HeaderBackground>('gradient');
  const [footerText, setFooterText] = useState<string | null>(null);

  const { data: branding, isLoading, refetch } = trpc.template.getBrandingSettings.useQuery();

  const updateMutation = trpc.template.updateBrandingSettings.useMutation({
    onSuccess: () => {
      toast({ title: 'Branding settings saved', type: 'success' });
      refetch();
    },
    onError: (error) => {
      toast({ title: error.message || 'Failed to save branding settings', type: 'error' });
    },
  });

  const resetMutation = trpc.template.resetBrandingSettings.useMutation({
    onSuccess: () => {
      toast({ title: 'Branding reset to defaults', type: 'success' });
      refetch();
    },
    onError: (error) => {
      toast({ title: error.message || 'Failed to reset branding', type: 'error' });
    },
  });

  useEffect(() => {
    if (branding) {
      setLogoUrl(branding.logoUrl);
      setPrimaryColor(branding.primaryColor);
      setSecondaryColor(branding.secondaryColor);
      setButtonStyle(branding.buttonStyle as ButtonStyle);
      setButtonBorderRadius(branding.buttonBorderRadius);
      setHeaderBackground(branding.headerBackground as HeaderBackground);
      setFooterText(branding.footerText);
    }
  }, [branding]);

  const handleSave = () => {
    updateMutation.mutate({
      logoUrl,
      primaryColor,
      secondaryColor,
      buttonStyle,
      buttonBorderRadius,
      headerBackground,
      footerText,
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset branding to defaults?')) {
      resetMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Generate button preview styles
  const getButtonPreviewStyle = () => {
    const baseStyle = {
      padding: '12px 24px',
      borderRadius: buttonBorderRadius,
      color: buttonStyle === 'outline' ? primaryColor : 'white',
      fontWeight: 600,
      border: 'none',
      cursor: 'pointer',
    };

    if (buttonStyle === 'gradient') {
      return {
        ...baseStyle,
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
      };
    } else if (buttonStyle === 'solid') {
      return {
        ...baseStyle,
        background: primaryColor,
      };
    } else {
      return {
        ...baseStyle,
        background: 'transparent',
        border: `2px solid ${primaryColor}`,
      };
    }
  };

  return (
    <div className="space-y-8">
      {/* Colors Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Brand Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorPicker
            label="Primary Color"
            value={primaryColor}
            onChange={setPrimaryColor}
          />
          <ColorPicker
            label="Secondary Color"
            value={secondaryColor}
            onChange={setSecondaryColor}
          />
        </div>
      </div>

      {/* Logo Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Logo</h3>
        <div className="space-y-2">
          <Label htmlFor="logo-url">Logo URL</Label>
          <Input
            id="logo-url"
            type="url"
            value={logoUrl || ''}
            onChange={(e) => setLogoUrl(e.target.value || null)}
            placeholder="https://example.com/logo.png"
          />
          <p className="text-xs text-muted-foreground">
            Enter a URL to your logo image. Recommended size: 200x60 pixels.
          </p>
          {logoUrl && (
            <div className="mt-2 p-4 bg-muted rounded-lg">
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-16 max-w-[200px] object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Button Style Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Button Style</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="button-style">Button Style</Label>
            <Select
              id="button-style"
              value={buttonStyle}
              onChange={(e) => setButtonStyle(e.target.value as ButtonStyle)}
            >
              <option value="gradient">Gradient</option>
              <option value="solid">Solid</option>
              <option value="outline">Outline</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="button-radius">Border Radius</Label>
            <Select
              id="button-radius"
              value={buttonBorderRadius}
              onChange={(e) => setButtonBorderRadius(e.target.value)}
            >
              <option value="0px">Square (0px)</option>
              <option value="4px">Slight (4px)</option>
              <option value="8px">Rounded (8px)</option>
              <option value="12px">More Rounded (12px)</option>
              <option value="9999px">Pill (Full)</option>
            </Select>
          </div>
        </div>
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-3">Button Preview:</p>
          <button type="button" style={getButtonPreviewStyle()}>
            Example Button
          </button>
        </div>
      </div>

      {/* Header Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Header Style</h3>
        <div className="space-y-2">
          <Label htmlFor="header-background">Header Background</Label>
          <Select
            id="header-background"
            value={headerBackground}
            onChange={(e) => setHeaderBackground(e.target.value as HeaderBackground)}
            className="w-full md:w-[200px]"
          >
            <option value="gradient">Gradient</option>
            <option value="solid">Solid Color</option>
          </Select>
        </div>
        <div className="rounded-lg overflow-hidden">
          <div
            style={{
              background:
                headerBackground === 'gradient'
                  ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
                  : primaryColor,
              padding: '24px',
            }}
          >
            <h2 style={{ color: 'white', margin: 0, fontSize: '20px' }}>
              Header Preview
            </h2>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Footer Text</h3>
        <div className="space-y-2">
          <Label htmlFor="footer-text">Custom Footer (optional)</Label>
          <Textarea
            id="footer-text"
            value={footerText || ''}
            onChange={(e) => setFooterText(e.target.value || null)}
            placeholder="Add a custom footer message that appears at the bottom of all emails..."
            className="resize-none"
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            This text will appear at the bottom of all email templates.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
