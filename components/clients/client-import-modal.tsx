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
  FileSpreadsheetIcon,
  CheckIcon,
  XIcon,
  AlertIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
} from '@/components/ui/icons';
import { ClientColumnMappingStep } from './client-column-mapping-step';
import {
  parseImportFile,
  autoDetectColumnMapping,
  applyColumnMapping,
  validateRow,
  mapRowToCreateInput,
  type ColumnMapping,
  type ParsedRow,
  type RowValidationResult,
} from '@/lib/utils/client-import';
import { trpc } from '@/lib/client/trpc';
import { toast } from '@/components/ui/use-toast';
import { downloadSampleClientTemplate } from '@/lib/utils/client-export';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';
type ImportMode = 'create' | 'upsert';

interface ClientImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const REQUIRED_FIELD_VALUES = [
  'businessName',
  'firstName',
  'lastName',
  'email',
  'cellPhone',
  'city',
  'state',
  'zipCode',
];

export function ClientImportModal({ open, onClose, onSuccess }: ClientImportModalProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping[]>([]);

  const [validationResults, setValidationResults] = useState<RowValidationResult[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('create');
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: number } | null>(null);

  const importMutation = trpc.clients.bulkImport.useMutation({
    onSuccess: (result) => {
      const created = result.created ?? 0;
      const updated = (result as any).updated ?? 0;
      const errors = result.errors?.length ?? 0;

      setImportResult({ created, updated, errors });
      setStep('complete');

      if (errors === 0) {
        toast({ title: `Imported ${created + updated} clients successfully`, type: 'success' });
      } else {
        toast({ title: `Imported ${created + updated} clients with ${errors} errors`, type: 'info' });
      }
    },
    onError: (error) => {
      toast({ title: `Import failed: ${error.message}`, type: 'error' });
      setStep('preview');
    },
  });

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

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);

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

    const autoMapping = autoDetectColumnMapping(result.headers);
    setMapping(autoMapping);

    setStep('mapping');
  }, []);

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

  const handleProceedToPreview = () => {
    const mappedRows = applyColumnMapping(parsedRows, mapping);

    const emailCounts = new Map<string, number>();
    for (const row of mappedRows) {
      const raw = row.email;
      const normalized = raw ? String(raw).trim().toLowerCase() : '';
      if (!normalized) continue;
      emailCounts.set(normalized, (emailCounts.get(normalized) ?? 0) + 1);
    }

    const results = mappedRows.map((row, index) => {
      const result = validateRow(row, index);

      const raw = row.email;
      const normalized = raw ? String(raw).trim().toLowerCase() : '';
      if (normalized && (emailCounts.get(normalized) ?? 0) > 1) {
        result.warnings.push('Duplicate email in import file');
      }

      return result;
    });

    setValidationResults(results);
    setStep('preview');
  };

  const handleImport = () => {
    setStep('importing');

    const validRows = validationResults
      .filter((r) => r.valid && r.data)
      .map((r) => mapRowToCreateInput(r.data!));

    importMutation.mutate({
      clients: validRows,
      mode: importMode,
    });
  };

  const validCount = validationResults.filter((r) => r.valid).length;
  const invalidCount = validationResults.filter((r) => !r.valid).length;
  const warningCount = validationResults.filter((r) => r.warnings.length > 0).length;

  const mappedFields = mapping.map((m) => m.targetField);
  const canProceedToPreview = REQUIRED_FIELD_VALUES.every((field) => mappedFields.includes(field));

  return (
    <Dialog open={open} onClose={handleClose} className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>
          Import Clients
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
        {step === 'upload' && (
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDrop}
            onClick={() => document.getElementById('client-file-input')?.click()}
          >
            <input
              id="client-file-input"
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
            <p className="text-sm text-muted-foreground">Supported formats: .csv, .xlsx</p>
          </div>
        )}

        {/* Sample Template Downloads - shown in upload step */}
        {step === 'upload' && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-3">
              <DownloadIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Need a template?</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  downloadSampleClientTemplate('csv');
                  toast({ title: 'Sample CSV template downloaded', type: 'success' });
                }}
                className="gap-2"
              >
                <FileTextIcon className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  downloadSampleClientTemplate('xlsx');
                  toast({ title: 'Sample Excel template downloaded', type: 'success' });
                }}
                className="gap-2"
              >
                <FileSpreadsheetIcon className="h-4 w-4" />
                Download Excel
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <FileTextIcon className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{file?.name}</span>
              <Badge variant="secondary">{parsedRows.length} rows</Badge>
            </div>

            <ClientColumnMappingStep headers={headers} mapping={mapping} onMappingChange={setMapping} />
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
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
                  <span className="text-sm">Create only (existing emails will fail)</span>
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
                  <span className="text-sm">Create or update (by email)</span>
                </label>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[50px_1fr_1fr_100px] gap-2 p-3 bg-muted/50 font-medium text-sm border-b">
                <div>Row</div>
                <div>Business</div>
                <div>Email</div>
                <div>Status</div>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {validationResults.map((result) => {
                  const businessName =
                    result.data?.businessName || parsedRows[result.rowIndex]?.businessName || '(no business name)';
                  const email = result.data?.email || parsedRows[result.rowIndex]?.email || '(no email)';

                  return (
                    <div
                      key={result.rowIndex}
                      className={`grid grid-cols-[50px_1fr_1fr_100px] gap-2 p-3 border-b last:border-b-0 items-start ${!result.valid ? 'bg-destructive/5' : result.warnings.length > 0 ? 'bg-warning/5' : ''
                        }`}
                    >
                      <div className="text-sm text-muted-foreground">{result.rowIndex + 1}</div>
                      <div>
                        <p className="text-sm font-medium truncate">{String(businessName)}</p>
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
                      <div className="text-sm text-muted-foreground truncate">{String(email)}</div>
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
              <p className="text-sm text-muted-foreground">Invalid rows will be skipped during import.</p>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Importing Clients...</h3>
            <p className="text-muted-foreground">Please wait while we import {validCount} clients.</p>
          </div>
        )}

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
            <Button variant="outline" onClick={() => setStep('upload')} className="gap-1">
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleProceedToPreview} disabled={!canProceedToPreview} className="gap-1">
              Preview
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </>
        )}

        {step === 'preview' && (
          <>
            <Button variant="outline" onClick={() => setStep('mapping')} className="gap-1">
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleImport} disabled={validCount === 0}>
              Import {validCount} Client{validCount !== 1 ? 's' : ''}
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

