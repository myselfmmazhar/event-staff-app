'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Spinner } from '@/components/ui/spinner';
import { Upload, X, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StaffDocument {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

interface StaffDocumentUploadProps {
  documents: StaffDocument[];
  onChange: (documents: StaffDocument[]) => void;
  maxDocuments?: number;
  disabled?: boolean;
}

export function StaffDocumentUpload({
  documents,
  onChange,
  maxDocuments = 10,
  disabled = false,
}: StaffDocumentUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxDocuments - documents.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Maximum documents reached',
        description: `You can only upload up to ${maxDocuments} documents.`,
        variant: 'error',
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);

    try {
      const uploadedDocs: StaffDocument[] = [];

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('bucket', 'staff-documents');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to upload ${file.name}`);
        }

        const data = await response.json();
        uploadedDocs.push({
          name: data.name || file.name,
          url: data.url,
          type: data.type || file.type,
          size: data.size || file.size,
        });
      }

      onChange([...documents, ...uploadedDocs]);
      toast({
        title: 'Documents uploaded',
        description: `Successfully uploaded ${uploadedDocs.length} document(s).`,
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload documents.',
        variant: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleUpload(e.target.files);
    // Reset input value so the same file can be selected again
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    const newDocs = documents.filter((_, i) => i !== index);
    onChange(newDocs);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [documents, maxDocuments]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          dragActive ? 'border-primary bg-primary/5' : 'border-border',
          disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={disabled || uploading ? undefined : handleDrop}
        onClick={() => {
          if (!disabled && !uploading) {
            document.getElementById('staff-document-input')?.click();
          }
        }}
      >
        <Input
          id="staff-document-input"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif"
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Spinner className="h-8 w-8 text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, Word, Excel, images, and more ({documents.length}/{maxDocuments})
              </p>
            </>
          )}
        </div>
      </div>

      {/* Document list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Documents</Label>
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-2 p-3 bg-accent/5 border border-border/30 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    {doc.size && (
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => window.open(doc.url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => handleRemove(index)}
                    disabled={disabled}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
