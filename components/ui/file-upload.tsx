"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { UploadIcon, XIcon } from "@/components/ui/icons" // Assuming UploadIcon exists or use Lucide
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface FileUploadProps {
    onFilesChange: (files: File[]) => void
    maxFiles?: number
    maxSize?: number // in bytes
    accept?: Record<string, string[]>
}

export function FileUpload({
    onFilesChange,
    maxFiles = 5,
    maxSize = 10 * 1024 * 1024, // 10MB
    accept = {
        'image/*': [],
        'application/pdf': [],
    }
}: FileUploadProps) {
    const [files, setFiles] = React.useState<File[]>([])

    const onDrop = React.useCallback((acceptedFiles: File[]) => {
        setFiles(prev => {
            const newFiles = [...prev, ...acceptedFiles].slice(0, maxFiles);
            onFilesChange(newFiles);
            return newFiles;
        });
    }, [maxFiles, onFilesChange])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles,
        maxSize,
        accept
    })

    const removeFile = (fileToRemove: File) => {
        setFiles(prev => {
            const newFiles = prev.filter(f => f !== fileToRemove);
            onFilesChange(newFiles);
            return newFiles;
        });
    }

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={cn(
                    "border-2 border-dashed border-input rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors hover:bg-muted/50",
                    isDragActive && "border-primary bg-primary/5"
                )}
            >
                <input {...getInputProps()} />
                <Button type="button" variant="outline" className="mb-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">
                    Upload
                </Button>
                <p className="text-sm text-muted-foreground">
                    or drag files here.
                </p>
            </div>

            {files.length > 0 && (
                <div className="grid gap-2">
                    {files.map((file, i) => (
                        <div key={i} className="flex items-center justify-between p-2 border rounded-md bg-background">
                            <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(file);
                                }}
                            >
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
