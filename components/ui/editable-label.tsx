"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableLabelProps {
    value: string | null | undefined;
    defaultLabel: string;
    onChange: (value: string | null) => void;
    className?: string;
}

export function EditableLabel({ value, defaultLabel, onChange, className }: EditableLabelProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value ?? "");
    const inputRef = useRef<HTMLInputElement>(null);

    const display = value && value.trim().length > 0 ? value : defaultLabel;

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const commit = () => {
        const trimmed = draft.trim();
        onChange(trimmed === "" || trimmed === defaultLabel ? null : trimmed);
        setIsEditing(false);
    };

    const cancel = () => {
        setDraft(value ?? "");
        setIsEditing(false);
    };

    const startEdit = () => {
        setDraft(value ?? "");
        setIsEditing(true);
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        commit();
                    } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancel();
                    }
                }}
                placeholder={defaultLabel}
                className={cn(
                    "block w-full text-sm font-medium text-foreground leading-none mb-2 px-1 py-0.5 border border-primary rounded outline-none bg-background",
                    className,
                )}
            />
        );
    }

    return (
        <div
            onDoubleClick={startEdit}
            title="Double-click to rename"
            className={cn(
                "group inline-flex items-center gap-1 text-sm font-medium text-foreground leading-none mb-2 cursor-pointer select-none",
                className,
            )}
        >
            <span>{display}</span>
            <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                    e.preventDefault();
                    startEdit();
                }}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                aria-label="Rename label"
            >
                <Pencil className="h-3 w-3" />
            </button>
        </div>
    );
}
