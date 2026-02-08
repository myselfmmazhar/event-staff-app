'use client';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { VARIABLE_DESCRIPTIONS } from '@/lib/config/default-templates';
import { useState } from 'react';

interface VariableInserterProps {
  variables: string[];
  onInsert: (variable: string) => void;
}

export function VariableInserter({ variables, onInsert }: VariableInserterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleInsert = (variable: string) => {
    onInsert(variable);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          Insert Variable
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-80 overflow-y-auto" align="start">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Available Variables</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Click a variable to insert it into the template.
          </p>
          <div className="space-y-1">
            {variables.map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => handleInsert(variable)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors group"
              >
                <code className="text-sm font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  {variable}
                </code>
                {VARIABLE_DESCRIPTIONS[variable] && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {VARIABLE_DESCRIPTIONS[variable]}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
