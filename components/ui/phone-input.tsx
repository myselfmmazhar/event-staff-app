'use client';

import { forwardRef, useState, useEffect } from 'react';
import { phoneValidation } from '@/lib/utils/validation';
import { Input } from '@/components/ui/input';

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  autoFormat?: boolean;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ value = '', onChange, error, autoFormat = true, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
      setDisplayValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (autoFormat) {
        // Only allow digits, spaces, parentheses, dashes, and plus sign
        const cleaned = newValue.replace(/[^\d\s()\-+]/g, '');
        setDisplayValue(cleaned);
        onChange?.(cleaned);
      } else {
        setDisplayValue(newValue);
        onChange?.(newValue);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (autoFormat && displayValue) {
        // Format on blur
        const formatted = phoneValidation.format(displayValue);
        setDisplayValue(formatted);
        onChange?.(formatted);
      }
      props.onBlur?.(e);
    };

    const isValid = !displayValue || phoneValidation.isValid(displayValue);

    return (
      <Input
        ref={ref}
        type="tel"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        error={error || !isValid}
        placeholder="+1 (555) 123-4567"
        {...props}
      />
    );
  }
);

PhoneInput.displayName = 'PhoneInput';

