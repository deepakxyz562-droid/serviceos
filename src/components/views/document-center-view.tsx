'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import {
  FolderOpen, Plus, Search, Upload, Eye, Trash2,
  Download, Share2, FileText, Image as ImageIcon, File, Shield,
  Lock, Globe, HardDrive, Calendar,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type DocCategory = 'customer' | 'contracts' | 'quotes' | 'invoices' | 'photos' | 'job_attachments';
type AccessLevel = 'admin' | 'manager' | 'employee' | 'customer';

interface DocumentItem {
  id: string;
  name: string;
  category: string;
  type: string;
  accessLevel: string;
  fileType: string | null;
  fileSize: string | null;
  fileUrl: string | null;
  description: string | null;
  isShared: boolean;
  tagsJson: string;
  uploadedById: string | null;
  customerId: string | null;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocFormData {
  name: string;
  category: DocCategory;
  accessLevel: AccessLevel;
  fileUrl: string;
  description: string;
  tags: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  customer: { label: 'Customer', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: <FolderOpen className="size-3" /> },
  contracts: { label: 'Contracts', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: <FileText className="size-3" /> },
  quotes: { label: 'Quotes', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <FileText className="size-3" /> },
  invoices: { label: 'Invoices', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: <FileText className="size-3" /> },
  photos: { label: 'Photos', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: <ImageIcon className="size-3" /> },
  job_attachments: { label: 'Job Attachments', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: <FolderOpen className="size-3" /> },
};

const CATEGORY_TABS = [
  { value: 'all', label: 'All' },
  { value: 'customer', label: 'Customer' },
  { value: 'contracts', label: 'Contracts' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'photos', label: 'Photos' },
  { value: 'job_attachments', label: 'Job Attachments' },
];

const ACCESS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  admin: { label: 'Admin', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  manager: { label: 'Manager', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  employee: { label: 'Employee', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  customer: { label: 'Customer', bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const EMPTY_FORM = (): DocFormData => ({
  name: '', category: 'customer', accessLevel: 'admin', fileUrl: '', description: '', tags: '',
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFileIcon(fileType: string | null) {
  switch (fileType) {
    case 'pdf': return <FileText className="size-4 text-red-500" />;
    case 'jpg': case 'jpeg': case 'png': return <ImageIcon className="size-4 text-pink-500" />;
    case 'doc': case 'docx': return <FileText className="size-4 text-blue-500" />;
    case 'xls': case 'xlsx': return <FileText className="size-4 text-green-500" />;
    default: return <File className="size-4 text-gray-500" />;
  }
}

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatFileSize(bytes: string | number | null): string {
  if (!bytes) return '—';
  const num = typeof bytes === 'string' ? parseFloat(bytes) : bytes;
  if (isNaN(num)) return String(bytes);
  if (num >= 1048576) return `${(num / 1048576).toFixed(1)} MB`;
  if (num >= 1024) return `${(num / 1024).toFixed(0)} KB`;
  return `${num} B`;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DocumentCenterView() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accessFilter, setAccessFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [form, setForm] = useState<DocFormData>(EMPTY_FORM());
  const [uploading, setUploading] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      if (accessFilter !== 'all') params.set('accessLevel', accessFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', '100');

      const res = await authFetch(`/api/documents?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Error fetching documents:', err);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, accessFilter, searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const thisMonth = documents.filter((d) => {
    const date = new Date(d.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const sharedCount = documents.filter((d) => d.isShared).length;

  const totalStorageMB = documents.reduce((s, d) => {
    const bytes = d.fileSize ? parseFloat(String(d.fileSize)) : 0;
    return s + (isNaN(bytes) ? 0 : bytes / 1048576);
  }, 0);

  const stats = {
    total: documents.length,
    thisMonth,
    shared: sharedCount,
    storageUsed: `${totalStorageMB.toFixed(1)} MB`,
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleUpload = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Document name is required'); return; }
    setUploading(true);
    try {
      const tagsArray = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        type: form.category,
        category: form.category,
        accessLevel: form.accessLevel,
        fileUrl: form.fileUrl.trim() || `uploads/${Date.now()}_${form.name.trim()}`,
        fileType: form.name.split('.').pop() || 'pdf',
        fileSize: String(Math.floor(Math.random() * 5000000 + 10000)),
        isShared: false,
        tagsJson: JSON.stringify(tagsArray),
      };

      const res = await authFetch('/api/documents', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to upload');

      toast.success('Document uploaded');
      setShowUploadDialog(false);
      setForm(EMPTY_FORM());
      fetchDocuments();
    } catch (err) {
      console.error('Error uploading document:', err);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  }, [form, fetchDocuments]);

  const handleDelete = useCallback(async (docId: string) => {
    try {
      const res = await authFetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Document deleted');
      if (selectedDoc?.id === docId) { setShowDetailDialog(false); setSelectedDoc(null); }
      fetchDocuments();
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('Failed to delete document');
    }
  }, [selectedDoc, fetchDocuments]);

  const handleToggleShare = useCallback(async (docId: string, currentShared: boolean) => {
    try {
      const res = await authFetch(`/api/documents/${docId}`, {
        method: 'PUT',
        body: JSON.stringify({ isShared: !currentShared }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(currentShared ? 'Document made private' : 'Document shared');
      fetchDocuments();
      if (selectedDoc?.id === docId) {
        setSelectedDoc((prev) => prev ? { ...prev, isShared: !prev.isShared } : prev);
      }
    } catch {
      toast.error('Failed to update share status');
    }
  }, [selectedDoc, fetchDocuments]);

  const handleDownload = (doc: DocumentItem) => {
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    }
    toast.info(`Downloading ${doc.name}...`);
  };

  // ─── Loading Skeletons ──────────────────────────────────────────────────

  const renderLoadingSkeletons = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-10" />
                </div>
                <Skeleton className="size-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <ViewHeader
        icon={FolderOpen}
        iconBg="bg-indigo-600"
        title="Document Center"
        description="Upload, organize, and share documents across your organization"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowUploadDialog(true)}>
            <Upload className="size-4 mr-1.5" /> Upload Document
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: stats.total, icon: FolderOpen, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'This Month', value: stats.thisMonth, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Shared', value: stats.shared, icon: Share2, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Storage Used', value: stats.storageUsed, icon: HardDrive, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                    <p className="text-lg font-bold truncate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2 rounded-xl shrink-0`}><Icon className={`size-4 ${stat.color}`} /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-auto">
          <TabsList className="h-9 flex-wrap">
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2">{tab.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={accessFilter} onValueChange={setAccessFilter}>
          <SelectTrigger className="w-[120px] h-9"><SelectValue placeholder="Access" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Access</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Content */}
      {loading ? renderLoadingSkeletons() : documents.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No documents found" description={categoryFilter !== 'all' || accessFilter !== 'all' || searchQuery ? 'Adjust your filters or search query' : 'Upload your first document to get started'} actionLabel="Upload" onAction={() => setShowUploadDialog(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => {
            const catConfig = CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.customer;
            const accessConfig = ACCESS_CONFIG[doc.accessLevel] || ACCESS_CONFIG.admin;
            const tags = parseTags(doc.tagsJson);
            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => { setSelectedDoc(doc); setShowDetailDialog(true); }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {getFileIcon(doc.fileType)}
                      <h3 className="text-sm font-medium truncate group-hover:text-emerald-700 transition-colors">{doc.name}</h3>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}>
                        <Download className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}>
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`text-[10px] h-5 gap-1 ${catConfig.bg} ${catConfig.text} ${catConfig.border}`}>
                      {catConfig.icon} {catConfig.label}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] h-5 ${accessConfig.bg} ${accessConfig.text} ${accessConfig.border}`}>
                      {accessConfig.label}
                    </Badge>
                    {doc.isShared ? (
                      <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200"><Share2 className="size-3 mr-0.5" /> Shared</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-5 bg-gray-50 text-gray-500 border-gray-200"><Lock className="size-3 mr-0.5" /> Private</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>{formatDate(doc.createdAt)}</span>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary" className="text-[10px] h-4">{t}</Badge>)}
                      {tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="size-5 text-indigo-600" /> Upload Document</DialogTitle>
            <DialogDescription>Upload and categorize a new document</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-4 pr-3">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-indigo-400 transition-colors">
                <Upload className="size-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Drag & drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, XLS, JPG, PNG supported</p>
              </div>
              <div className="space-y-2">
                <Label>Document Name *</Label>
                <Input placeholder="e.g., Contract - Sharma Electronics.pdf" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type / Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as DocCategory }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, val]) => <SelectItem key={key} value={key}>{val.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access Level</Label>
                  <Select value={form.accessLevel} onValueChange={(v) => setForm((p) => ({ ...p, accessLevel: v as AccessLevel }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ACCESS_CONFIG).map(([key, val]) => <SelectItem key={key} value={key}>{val.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>File URL (simulated)</Label>
                <Input placeholder="https://example.com/file.pdf" value={form.fileUrl} onChange={(e) => setForm((p) => ({ ...p, fileUrl: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Document description..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input placeholder="e.g., contract, hvac, 2025" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={uploading}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleUpload} disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          {selectedDoc && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">{getFileIcon(selectedDoc.fileType)} {selectedDoc.name}</DialogTitle>
                <DialogDescription>{selectedDoc.fileType?.toUpperCase() || 'FILE'} • {formatFileSize(selectedDoc.fileSize)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${(CATEGORY_CONFIG[selectedDoc.category] || CATEGORY_CONFIG.customer).bg} ${(CATEGORY_CONFIG[selectedDoc.category] || CATEGORY_CONFIG.customer).text} ${(CATEGORY_CONFIG[selectedDoc.category] || CATEGORY_CONFIG.customer).border}`}>
                    {(CATEGORY_CONFIG[selectedDoc.category] || CATEGORY_CONFIG.customer).label}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${(ACCESS_CONFIG[selectedDoc.accessLevel] || ACCESS_CONFIG.admin).bg} ${(ACCESS_CONFIG[selectedDoc.accessLevel] || ACCESS_CONFIG.admin).text} ${(ACCESS_CONFIG[selectedDoc.accessLevel] || ACCESS_CONFIG.admin).border}`}>
                    {(ACCESS_CONFIG[selectedDoc.accessLevel] || ACCESS_CONFIG.admin).label}
                  </Badge>
                  {selectedDoc.isShared ? (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><Share2 className="size-3 mr-0.5" /> Shared</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200"><Lock className="size-3 mr-0.5" /> Private</Badge>
                  )}
                </div>

                {selectedDoc.description && (
                  <p className="text-sm text-muted-foreground">{selectedDoc.description}</p>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Created</p><p className="font-medium">{formatDate(selectedDoc.createdAt)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Updated</p><p className="font-medium">{formatDate(selectedDoc.updatedAt)}</p></div>
                </div>

                {parseTags(selectedDoc.tagsJson).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Tags</p>
                    <div className="flex flex-wrap gap-1">
                      {parseTags(selectedDoc.tagsJson).map((t) => <Badge key={t} variant="secondary" className="text-[10px] h-5">{t}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm" onClick={() => handleDownload(selectedDoc)}><Download className="size-3.5 mr-1" /> Download</Button>
                <Button variant="outline" size="sm" onClick={() => handleToggleShare(selectedDoc.id, selectedDoc.isShared)}>
                  {selectedDoc.isShared ? <><Lock className="size-3.5 mr-1" /> Make Private</> : <><Share2 className="size-3.5 mr-1" /> Share</>}
                </Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => { handleDelete(selectedDoc.id); setShowDetailDialog(false); }}>
                  <Trash2 className="size-3.5 mr-1" /> Delete
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
