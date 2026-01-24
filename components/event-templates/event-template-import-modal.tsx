'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  UploadIcon,
  FileTextIcon,
  CheckIcon,
  XIcon,
  AlertIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/ui/icons';
import { ColumnMappingStep } from './column-mapping-step';
import {
  parseImportFile,
  autoDetectColumnMapping,
  applyColumnMapping,
  validateRow,
  mapRowToCreateInput,
  type ColumnMapping,
  type ParsedRow,
  type RowValidationResult,
} from '@/lib/utils/event-template-import';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';
type ImportMode = 'create' | 'upsert';

interface EventTemplateImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EventTemplateImportModal({
  open,
  onClose,
  onSuccess,
}: EventTemplateImportModalProps) {
  // Step state
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);

  // Parse state
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);

  // Validation state
  const [validationResults, setValidationResults] = useState<RowValidationResult[]>([]);

  // Import mode
  const [importMode, setImportMode] = useState<ImportMode>('create');

  // Import result
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: number } | null>(null);

  // Fetch clients for matching
  const { data: clientsData } = trpc.clients.getAll.useQuery({ page: 1, limit: 1000 });
  const clients = clientsData?.data ?? [];

  // Create client map for validation
  const clientMap = new Map<string, string>();
  clients.forEach((c) => {
    clientMap.set(c.businessName.toLowerCase(), c.id);
  });

  // Import mutation
  const importMutation = trpc.eventTemplate.bulkImport.useMutation({
    onSuccess: (result) => {
      const created = result.created ?? 0;
      const updated = (result as any).updated ?? 0;
      const errors = result.errors?.length ?? 0;

      setImportResult({ created, updated, errors });
      setStep('complete');

      if (errors === 0) {
        toast({ title: `Imported ${created + updated} templates successfully`, type: 'success' });
      } else {
        toast({ title: `Imported ${created + updated} templates with ${errors} errors`, type: 'info' });
      }
    },
    onError: (error) => {
      toast({ title: `Import failed: ${error.message}`, type: 'error' });
      setStep('preview');
    },
  });

  // Reset state on close
  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setHeaders([]);
    setParsedRows([]);
    setMapping([]);
    setValidationResults([]);
    setImportResult(null);
    setImportMode('create');
    onClose();
  };

  // Handle file drop/select
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);

    // Parse file
    const result = await parseImportFile(selectedFile);

    if (!result.success) {
      toast({ title: result.error || 'Failed to parse file', type: 'error' });
      return;
    }

    if (result.rows.length === 0) {
      toast({ title: 'No data rows found in file', type: 'error' });
      return;
    }

    setHeaders(result.headers);
    setParsedRows(result.rows);

    // Auto-detect column mapping
    const autoMapping = autoDetectColumnMapping(result.headers);
    setMapping(autoMapping);

    // Move to mapping step
    setStep('mapping');
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer.files;
      const file = files[0];
      if (file) {
        if (
          file.type === 'text/csv' ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.xlsx')
        ) {
          handleFileSelect(file);
        } else {
          toast({ title: 'Please upload a CSV or Excel file', type: 'error' });
        }
      }
    },
    [handleFileSelect]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      const file = files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Move to preview step - validate all rows
  const handleProceedToPreview = () => {
    // Apply column mapping
    const mappedRows = applyColumnMapping(parsedRows, mapping);

    // Validate each row
    const results = mappedRows.map((row, index) => validateRow(row, index, clientMap));
    setValidationResults(results);

    setStep('preview');
  };

  // Start import
  const handleImport = () => {
    setStep('importing');

    // Filter valid rows and map to input
    const validRows = validationResults
      .filter((r) => r.valid && r.data)
      .map((r) => mapRowToCreateInput(r.data!, clientMap));

    importMutation.mutate({
      templates: validRows,
      mode: importMode,
    });
  };

  // Count stats
  const validCount = validationResults.filter((r) => r.valid).length;
  const invalidCount = validationResults.filter((r) => !r.valid).length;
  const warningCount = validationResults.filter((r) => r.warnings.length > 0).length;

  // Check if can proceed to preview
  const canProceedToPreview = mapping.some((m) => m.targetField === 'name');

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>
          Import Event Templates
          {step !== 'upload' && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              - {step === 'mapping' && 'Column Mapping'}
              {step === 'preview' && 'Preview & Validate'}
              {step === 'importing' && 'Importing...'}
              {step === 'complete' && 'Complete'}
            </span>
          )}
        </DialogTitle>
      </DialogHeader>

      <DialogContent className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <UploadIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Upload CSV or Excel File</h3>
            <p className="text-muted-foreground mb-4">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-sm text-muted-foreground">
              Supported formats: .csv, .xlsx
            </p>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <FileTextIcon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{file?.name}</span>
              <Badge variant="secondary">{parsedRows.length} rows</Badge>
            </div>

            <ColumnMappingStep
              headers={headers}
              mapping={mapping}
              onMappingChange={setMapping}
            />
          </div>
        )}

        {/* Step 3: Preview & Validate */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="default">
                <CheckIcon className="h-3 w-3 mr-1" />
                {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  <XIcon className="h-3 w-3 mr-1" />
                  {invalidCount} invalid
                </Badge>
              )}
              {warningCount > 0 && (
                <Badge variant="warning">
                  <AlertIcon className="h-3 w-3 mr-1" />
                  {warningCount} with warnings
                </Badge>
              )}
            </div>

            {/* Import Mode Selection */}
            <div className="bg-muted/30 rounded-lg p-4">
              <label className="text-sm font-medium mb-2 block">Import Mode</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="create"
                    checked={importMode === 'create'}
                    onChange={() => setImportMode('create')}
                    className="accent-primary"
                  />
                  <span className="text-sm">Create only (skip duplicates)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="importMode"
                    value="upsert"
                    checked={importMode === 'upsert'}
                    onChange={() => setImportMode('upsert')}
                    className="accent-primary"
                  />
                  <span className="text-sm">Create or update (by name)</span>
                </label>
              </div>
            </div>

            {/* Validation results table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[50px_1fr_100px] gap-2 p-3 bg-muted/50 font-medium text-sm border-b">
                <div>Row</div>
                <div>Template Name</div>
                <div>Status</div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {validationResults.map((result) => {
                  const name = result.data?.name || parsedRows[result.rowIndex]?.name || '(no name)';

                  return (
                    <div
                      key={result.rowIndex}
                      className={`grid grid-cols-[50px_1fr_100px] gap-2 p-3 border-b last:border-b-0 items-start ${
                        !result.valid ? 'bg-destructive/5' : result.warnings.length > 0 ? 'bg-warning/5' : ''
                      }`}
                    >
                      <div className="text-sm text-muted-foreground">{result.rowIndex + 1}</div>
                      <div>
                        <p className="text-sm font-medium truncate">{String(name)}</p>
                        {result.errors.length > 0 && (
                          <ul className="text-xs text-destructive mt-1">
                            {result.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        )}
                        {result.warnings.length > 0 && (
                          <ul className="text-xs text-warning-foreground mt-1">
                            {result.warnings.map((warn, i) => (
                              <li key={i}>• {warn}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div>
                        {result.valid ? (
                          result.warnings.length > 0 ? (
                            <Badge variant="warning" size="sm">
                              Warning
                            </Badge>
                          ) : (
                            <Badge variant="default" size="sm">
                              Valid
                            </Badge>
                          )
                        ) : (
                          <Badge variant="destructive" size="sm">
                            Invalid
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {invalidCount > 0 && (
              <p className="text-sm text-muted-foreground">
                Invalid rows will be skipped during import.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Importing */}
        {step === 'importing' && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Importing Templates...</h3>
            <p className="text-muted-foreground">
              Please wait while we import {validCount} templates.
            </p>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && importResult && (
          <div className="py-8 text-center">
            <CheckIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-4">Import Complete</h3>
            <div className="flex justify-center gap-4 mb-4">
              {importResult.created > 0 && (
                <Badge variant="default" size="lg">
                  {importResult.created} created
                </Badge>
              )}
              {importResult.updated > 0 && (
                <Badge variant="info" size="lg">
                  {importResult.updated} updated
                </Badge>
              )}
              {importResult.errors > 0 && (
                <Badge variant="destructive" size="lg">
                  {importResult.errors} failed
                </Badge>
              )}
            </div>
          </div>
        )}
      </DialogContent>

      <DialogFooter>
        {step === 'upload' && (
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        )}

        {step === 'mapping' && (
          <>
            <Button
              variant="outline"
              onClick={() => setStep('upload')}
              className="gap-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleProceedToPreview}
              disabled={!canProceedToPreview}
              className="gap-1"
            >
              Preview
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </>
        )}

        {step === 'preview' && (
          <>
            <Button
              variant="outline"
              onClick={() => setStep('mapping')}
              className="gap-1"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleImport}
              disabled={validCount === 0}
            >
              Import {validCount} Template{validCount !== 1 ? 's' : ''}
            </Button>
          </>
        )}

        {step === 'importing' && (
          <Button variant="outline" disabled>
            Importing...
          </Button>
        )}

        {step === 'complete' && (
          <Button
            onClick={() => {
              handleClose();
              onSuccess();
            }}
          >
            Done
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
