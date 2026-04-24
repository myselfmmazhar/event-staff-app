'use client';

import { useState, useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Eraser, PenLine } from 'lucide-react';

interface SignaturePadProps {
    value?: string | null;
    onChange?: (dataUrl: string | null) => void;
    disabled?: boolean;
    className?: string;
}

/**
 * Signature pad with two states:
 * - "preview": shows the saved signature as an <img> (no canvas sync headaches)
 * - "drawing": shows the SignatureCanvas for the user to draw
 */
export function SignaturePad({ value, onChange, disabled, className }: SignaturePadProps) {
    const [isDrawing, setIsDrawing] = useState(!value);
    const sigCanvasRef = useRef<SignatureCanvas>(null);

    const handleDrawEnd = useCallback(() => {
        if (!sigCanvasRef.current || disabled) return;
        if (sigCanvasRef.current.isEmpty()) return;

        const dataUrl = sigCanvasRef.current.toDataURL('image/png');
        onChange?.(dataUrl);
    }, [disabled, onChange]);

    const handleAccept = useCallback(() => {
        setIsDrawing(false);
    }, []);

    const handleClear = useCallback(() => {
        if (sigCanvasRef.current) {
            sigCanvasRef.current.clear();
        }
        onChange?.(null);
        setIsDrawing(true);
    }, [onChange]);

    const handleRedraw = useCallback(() => {
        setIsDrawing(true);
    }, []);

    return (
        <div className={cn('space-y-3', className)}>
            {/* Signature Area */}
            <div
                className={cn(
                    'relative border-2 border-dashed rounded-lg overflow-hidden bg-background transition-colors',
                    disabled ? 'opacity-50 cursor-not-allowed' : isDrawing ? 'cursor-crosshair' : '',
                    'border-border',
                )}
            >
                {isDrawing ? (
                    /* Draw mode: canvas */
                    <>
                        <SignatureCanvas
                            ref={sigCanvasRef}
                            penColor="black"
                            minWidth={1}
                            maxWidth={3}
                            velocityFilterWeight={0.7}
                            canvasProps={{
                                className: 'w-full touch-none',
                                style: { height: '150px', width: '100%' },
                            }}
                            onEnd={handleDrawEnd}
                        />

                        {/* Placeholder */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <p className="text-sm text-muted-foreground/50">Sign here</p>
                        </div>
                    </>
                ) : (
                    /* Preview mode: saved signature as image */
                    <div className="flex items-center justify-center" style={{ height: '150px' }}>
                        {value ? (
                            <img
                                src={value}
                                alt="Signature"
                                className="max-h-[140px] max-w-full object-contain"
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground/50">No signature</p>
                        )}
                    </div>
                )}

                {/* Baseline guide */}
                <div className="absolute bottom-[40px] left-4 right-4 border-b border-muted-foreground/20 pointer-events-none" />
            </div>

            {/* Action buttons */}
            {!disabled && (
                <div className="flex gap-2">
                    {isDrawing && value && (
                        <Button type="button" variant="outline" size="sm" onClick={handleAccept}>
                            <PenLine className="h-3.5 w-3.5 mr-1.5" />
                            Accept Signature
                        </Button>
                    )}
                    {!isDrawing && (
                        <Button type="button" variant="outline" size="sm" onClick={handleRedraw}>
                            <PenLine className="h-3.5 w-3.5 mr-1.5" />
                            {value ? 'Re-sign' : 'Draw'}
                        </Button>
                    )}
                    {(value || isDrawing) && (
                        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
                            <Eraser className="h-3.5 w-3.5 mr-1.5" />
                            Clear
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
