'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eraser, PenLine, Type } from 'lucide-react';

interface SignaturePadProps {
    value?: string | null;
    onChange?: (dataUrl: string | null) => void;
    disabled?: boolean;
    className?: string;
}

type Mode = 'draw' | 'type';

export function SignaturePad({ value, onChange, disabled, className }: SignaturePadProps) {
    const [mode, setMode] = useState<Mode>('draw');
    const [typedName, setTypedName] = useState('');
    const [hasSignature, setHasSignature] = useState(!!value);
    const sigCanvasRef = useRef<SignatureCanvas>(null);
    const typeCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load existing signature into draw canvas
    useEffect(() => {
        if (value && mode === 'draw' && sigCanvasRef.current) {
            sigCanvasRef.current.fromDataURL(value, {
                width: sigCanvasRef.current.getCanvas().offsetWidth,
                height: 150,
            });
            setHasSignature(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount

    // Handle draw end — export canvas to data URL
    const handleDrawEnd = useCallback(() => {
        if (!sigCanvasRef.current || disabled) return;
        if (sigCanvasRef.current.isEmpty()) {
            setHasSignature(false);
            onChange?.(null);
            return;
        }
        setHasSignature(true);
        const dataUrl = sigCanvasRef.current.getTrimmedCanvas().toDataURL('image/png');
        onChange?.(dataUrl);
    }, [disabled, onChange]);

    // Render typed signature on a separate canvas
    const renderTypedSignature = useCallback((name: string) => {
        const canvas = typeCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        const container = containerRef.current;
        if (container) {
            const rect = container.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = 150 * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = '150px';
            ctx.scale(dpr, dpr);
        }

        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, width, height);

        if (!name.trim()) {
            setHasSignature(false);
            onChange?.(null);
            return;
        }

        // Draw signature-style text
        ctx.font = 'italic 42px "Brush Script MT", "Segoe Script", "Apple Chancery", cursive';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, width / 2, height / 2);

        setHasSignature(true);
        const dataUrl = canvas.toDataURL('image/png');
        onChange?.(dataUrl);
    }, [onChange]);

    const handleTypedNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setTypedName(name);
        renderTypedSignature(name);
    }, [renderTypedSignature]);

    const clearSignature = useCallback(() => {
        if (mode === 'draw' && sigCanvasRef.current) {
            sigCanvasRef.current.clear();
        }
        if (mode === 'type' && typeCanvasRef.current) {
            const ctx = typeCanvasRef.current.getContext('2d');
            if (ctx) {
                const dpr = window.devicePixelRatio || 1;
                ctx.clearRect(0, 0, typeCanvasRef.current.width / dpr, typeCanvasRef.current.height / dpr);
            }
        }
        setTypedName('');
        setHasSignature(false);
        onChange?.(null);
    }, [mode, onChange]);

    const handleModeSwitch = useCallback((newMode: Mode) => {
        clearSignature();
        setMode(newMode);
    }, [clearSignature]);


    return (
        <div className={cn('space-y-3', className)}>
            {/* Mode Tabs */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
                <button
                    type="button"
                    onClick={() => handleModeSwitch('draw')}
                    disabled={disabled}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        mode === 'draw'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <PenLine className="h-3.5 w-3.5" />
                    Draw
                </button>
                <button
                    type="button"
                    onClick={() => handleModeSwitch('type')}
                    disabled={disabled}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                        mode === 'type'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    )}
                >
                    <Type className="h-3.5 w-3.5" />
                    Type
                </button>
            </div>

            {/* Type input (only in type mode) */}
            {mode === 'type' && (
                <Input
                    value={typedName}
                    onChange={handleTypedNameChange}
                    placeholder="Type your full name"
                    disabled={disabled}
                />
            )}

            {/* Signature Area */}
            <div
                ref={containerRef}
                className={cn(
                    'relative border-2 border-dashed rounded-lg overflow-hidden bg-background transition-colors',
                    disabled ? 'opacity-50 cursor-not-allowed' : mode === 'draw' ? 'cursor-crosshair' : '',
                    'border-border'
                )}
            >
                {/* Draw mode: react-signature-canvas */}
                {mode === 'draw' && (
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
                )}

                {/* Type mode: custom canvas rendering */}
                {mode === 'type' && (
                    <canvas
                        ref={typeCanvasRef}
                        className="w-full touch-none"
                        style={{ height: '150px' }}
                    />
                )}

                {/* Baseline guide */}
                <div className="absolute bottom-[40px] left-4 right-4 border-b border-muted-foreground/20 pointer-events-none" />

                {/* Placeholder text when empty */}
                {!hasSignature && mode === 'draw' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-sm text-muted-foreground/50">Sign here</p>
                    </div>
                )}
            </div>

            {/* Clear button */}
            {hasSignature && !disabled && (
                <Button type="button" variant="outline" size="sm" onClick={clearSignature}>
                    <Eraser className="h-3.5 w-3.5 mr-1.5" />
                    Clear
                </Button>
            )}
        </div>
    );
}
