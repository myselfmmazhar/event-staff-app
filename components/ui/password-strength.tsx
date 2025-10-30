'use client';

import { passwordValidation } from '@/lib/utils/validation';
import { useMemo } from 'react';
import { CheckIcon, XIcon } from '@/components/ui/icons';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrength({ password, showRequirements = true }: PasswordStrengthProps) {
  const strength = useMemo(() => passwordValidation.calculateStrength(password), [password]);
  const strengthLabel = useMemo(() => passwordValidation.getStrengthLabel(password), [password]);
  
  const requirements = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: passwordValidation.hasUpperCase(password) },
    { label: 'One lowercase letter', met: passwordValidation.hasLowerCase(password) },
    { label: 'One number', met: passwordValidation.hasNumber(password) },
    { label: 'One special character', met: passwordValidation.hasSpecialChar(password) },
  ], [password]);

  const strengthColors = {
    0: { bg: 'bg-destructive', text: 'text-destructive' },
    1: { bg: 'bg-warning', text: 'text-warning' },
    2: { bg: 'bg-success', text: 'text-success' },
  };

  const currentColor = strengthColors[strength as keyof typeof strengthColors];

  if (!password) return null;

  return (
    <div className="space-y-2">
      {/* Strength Indicator Bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Password strength:</span>
          <span className={`text-xs font-medium ${currentColor.text}`}>
            {strengthLabel}
          </span>
        </div>
        <div className="flex gap-1 h-1.5">
          {[0, 1, 2].map((level) => (
            <div
              key={level}
              className={`flex-1 rounded-full transition-colors ${
                level <= strength ? currentColor.bg : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="space-y-1 pt-1">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2">
              {req.met ? (
                <CheckIcon className="h-3.5 w-3.5 text-success flex-shrink-0" />
              ) : (
                <XIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span
                className={`text-xs ${
                  req.met ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {req.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

