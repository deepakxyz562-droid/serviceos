'use client';

/**
 * Documents Tab — manage employee documents (driving license, PAN, etc.).
 *
 * Extracted from src/components/views/employees-view.tsx (Phase 3).
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileStack, FileCheck, FileWarning, ExternalLink, Upload, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { authFetch } from '@/lib/client-auth';
import { formatDate } from '@/lib/format-utils';
import type { DocumentsResponse } from '../../types';
import { apiUrl, DOCUMENT_TYPES } from '../../utils/employee-helpers';
import { UploadDocumentDialog } from '../upload-document-dialog';

export function DocumentsTab({ employeeId, employeeName }: { employeeId: string; employeeName: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<DocumentsResponse>({
    queryKey: ['employee-documents', employeeId],
    queryFn: async () => {
      const res = await authFetch(apiUrl(`/api/documents?employeeId=${employeeId}&limit=50`));
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
  });

  const documents = data?.documents ?? [];
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadPresetType, setUploadPresetType] = useState<string | null>(null);

  // For each standard doc type, find a matching uploaded document (by name/type/category fuzzy match).
  const findDoc = (key: string) => {
    return documents.find((d) => {
      const name = (d.name || '').toLowerCase();
      const type = (d.type || '').toLowerCase();
      const cat = (d.category || '').toLowerCase();
      return name.includes(key.replace('_', ' ')) || type.includes(key) || cat.includes(key)
        || (key === 'driving_license' && (name.includes('driving') || name.includes('license') || name.includes('dl')))
        || (key === 'pan' && name.includes('pan'))
        || (key === 'aadhaar' && name.includes('aadhaar'))
        || (key === 'employment_contract' && (name.includes('contract') || name.includes('employment')))
        || (key === 'certificate' && (name.includes('certificate') || name.includes('cert')));
    });
  };

  const openUpload = (presetType?: string) => {
    setUploadPresetType(presetType ?? null);
    setUploadOpen(true);
  };

  const handleUploadSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['employee-documents', employeeId] });
    setUploadOpen(false);
    setUploadPresetType(null);
  }, [queryClient, employeeId]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileStack className="size-4 text-emerald-600" /> Employee Documents
              </CardTitle>
              <CardDescription className="text-xs">Manage {employeeName}&apos;s documents and certifications</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{documents.length} uploaded</Badge>
              <Button size="sm" className="h-8" onClick={() => openUpload()}>
                <Plus className="size-3.5 mr-1" /> Upload
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCUMENT_TYPES.map((dt) => {
          const doc = findDoc(dt.key);
          const Icon = dt.icon;
          return (
            <Card key={dt.key} className={cn('hover:shadow-md transition-shadow', !doc && 'border-dashed')}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'size-9 rounded-lg flex items-center justify-center',
                      doc ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-muted',
                    )}>
                      <Icon className={cn('size-4', doc ? 'text-emerald-600' : 'text-muted-foreground')} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{dt.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {doc ? `Added ${formatDate(doc.createdAt)}` : 'Not uploaded'}
                      </p>
                    </div>
                  </div>
                  {doc ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                      <FileCheck className="size-2.5 mr-1" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                      <FileWarning className="size-2.5 mr-1" /> Missing
                    </Badge>
                  )}
                </div>
                {doc ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground truncate">{doc.name}</p>
                    {doc.fileSize && (
                      <p className="text-[10px] text-muted-foreground">{(doc.fileSize / 1024).toFixed(1)} KB{doc.fileType ? ` · ${doc.fileType}` : ''}</p>
                    )}
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs" asChild>
                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="size-3 mr-1" /> View
                      </a>
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => openUpload(dt.key)}
                  >
                    <Upload className="size-3 mr-1" /> Upload
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        employeeId={employeeId}
        employeeName={employeeName}
        presetType={uploadPresetType}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}
