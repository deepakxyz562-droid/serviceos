'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  MoreHorizontal,
  FileText,
  Upload,
  Download,
  Eye,
  Lock,
  Globe,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  X,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocumentRecord {
  id: string;
  name: string;
  description: string | null;
  type: string;
  category: string;
  fileUrl: string;
  fileType: string | null;
  fileSize: number | null;
  accessLevel: string;
  customerId: string | null;
  jobId: string | null;
  employeeId: string | null;
  uploadedById: string | null;
  isShared: boolean;
  sharedWithJson: string;
  tagsJson: string;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocumentsResponse {
  documents: DocumentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface DocumentFormData {
  name: string;
  description: string;
  type: string;
  category: string;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  accessLevel: string;
  isShared: boolean;
  tags: string;
}

const EMPTY_FORM: DocumentFormData = {
  name: '',
  description: '',
  type: 'general',
  category: 'general',
  fileUrl: '',
  fileType: '',
  fileSize: '',
  accessLevel: 'admin',
  isShared: false,
  tags: '',
};

const TYPE_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'contract', label: 'Contract' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'report', label: 'Report' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'manual', label: 'Manual' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'hr', label: 'HR' },
  { value: 'legal', label: 'Legal' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'technical', label: 'Technical' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileTypeIcon(fileType: string | null) {
  if (!fileType) return <File className="size-4 text-gray-500" />;
  const ft = fileType.toLowerCase();
  if (ft === 'pdf') return <FileText className="size-4 text-red-500" />;
  if (['doc', 'docx', 'odt'].includes(ft)) return <File className="size-4 text-blue-500" />;
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ft)) return <FileSpreadsheet className="size-4 text-green-500" />;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ft)) return <ImageIcon className="size-4 text-purple-500" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ft)) return <FileArchive className="size-4 text-orange-500" />;
  return <File className="size-4 text-gray-500" />;
}

function getFileTypeBadgeColor(fileType: string | null): string {
  if (!fileType) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  const ft = fileType.toLowerCase();
  if (ft === 'pdf') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (['doc', 'docx', 'odt'].includes(ft)) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ft)) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ft)) return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ft)) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
}

function getAccessBadge(accessLevel: string) {
  switch (accessLevel) {
    case 'admin':
      return (
        <Badge variant="outline" className="gap-1 border-red-200 text-red-700 dark:border-red-800 dark:text-red-400">
          <Lock className="size-3" /> Admin
        </Badge>
      );
    case 'employee':
      return (
        <Badge variant="outline" className="gap-1 border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400">
          Employee
        </Badge>
      );
    case 'customer':
      return (
        <Badge variant="outline" className="gap-1 border-green-200 text-green-700 dark:border-green-800 dark:text-green-400">
          <Globe className="size-3" /> Customer
        </Badge>
      );
    default:
      return <Badge variant="outline">{accessLevel}</Badge>;
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function isThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DocumentCenterView() {
  // State
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [formData, setFormData] = useState<DocumentFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Fetch Documents ─────────────────────────────────────────────────────

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      params.set('page', '1');
      params.set('limit', '50');

      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await apiGet<DocumentsResponse>(`/api/documents${query}`);
      setDocuments(data.documents);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, typeFilter, categoryFilter, demoPageSize]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // ─── Computed Stats ──────────────────────────────────────────────────────

  const totalDocuments = pagination.total;
  const categoriesCount = new Set(documents.map((d) => d.category)).size;
  const uploadsThisMonth = documents.filter((d) => isThisMonth(d.createdAt)).length;
  const sharedCount = documents.filter((d) => d.isShared).length;

  // ─── Form Handlers ──────────────────────────────────────────────────────

  const updateForm = (field: keyof DocumentFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
  };

  const openEditDialog = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    const tags = parseTags(doc.tagsJson);
    setFormData({
      name: doc.name,
      description: doc.description || '',
      type: doc.type,
      category: doc.category,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType || '',
      fileSize: doc.fileSize?.toString() || '',
      accessLevel: doc.accessLevel,
      isShared: doc.isShared,
      tags: tags.join(', '),
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (doc: DocumentRecord) => {
    setSelectedDoc(doc);
    setDeleteDialogOpen(true);
  };

  // ─── CRUD Operations ────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Document name is required');
      return;
    }
    if (!formData.fileUrl.trim()) {
      toast.error('File URL is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await apiPost('/api/documents', {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        category: formData.category,
        fileUrl: formData.fileUrl.trim(),
        fileType: formData.fileType.trim() || null,
        fileSize: formData.fileSize ? parseInt(formData.fileSize, 10) : null,
        accessLevel: formData.accessLevel,
        isShared: formData.isShared,
        tagsJson: JSON.stringify(tagsArray),
      });

      toast.success('Document created successfully');
      setAddDialogOpen(false);
      resetForm();
      fetchDocuments();
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Failed to create document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDoc) return;
    if (!formData.name.trim()) {
      toast.error('Document name is required');
      return;
    }
    if (!formData.fileUrl.trim()) {
      toast.error('File URL is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await apiPut(`/api/documents/${selectedDoc.id}`, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        type: formData.type,
        category: formData.category,
        fileUrl: formData.fileUrl.trim(),
        fileType: formData.fileType.trim() || null,
        fileSize: formData.fileSize ? parseInt(formData.fileSize, 10) : null,
        accessLevel: formData.accessLevel,
        isShared: formData.isShared,
        tagsJson: JSON.stringify(tagsArray),
      });

      toast.success('Document updated successfully');
      setEditDialogOpen(false);
      setSelectedDoc(null);
      resetForm();
      fetchDocuments();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Failed to update document');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDoc) return;

    try {
      await apiDelete(`/api/documents/${selectedDoc.id}`);
      toast.success('Document deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedDoc(null);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // ─── Form Dialog Content (shared between Add & Edit) ────────────────────

  const renderForm = () => (
    <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto px-1">
      {/* Name */}
      <div className="grid gap-2">
        <Label htmlFor="doc-name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="doc-name"
          placeholder="Document name"
          value={formData.name}
          onChange={(e) => updateForm('name', e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="grid gap-2">
        <Label htmlFor="doc-description">Description</Label>
        <Textarea
          id="doc-description"
          placeholder="Brief description..."
          value={formData.description}
          onChange={(e) => updateForm('description', e.target.value)}
          rows={3}
        />
      </div>

      {/* Type & Category */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Type</Label>
          <Select value={formData.type} onValueChange={(v) => updateForm('type', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => updateForm('category', v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* File URL */}
      <div className="grid gap-2">
        <Label htmlFor="doc-fileurl">
          File URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="doc-fileurl"
          placeholder="https://example.com/document.pdf"
          value={formData.fileUrl}
          onChange={(e) => updateForm('fileUrl', e.target.value)}
        />
      </div>

      {/* File Type & Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="doc-filetype">File Type</Label>
          <Input
            id="doc-filetype"
            placeholder="pdf, docx, xlsx..."
            value={formData.fileType}
            onChange={(e) => updateForm('fileType', e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="doc-filesize">File Size (bytes)</Label>
          <Input
            id="doc-filesize"
            type="number"
            placeholder="e.g. 1048576"
            value={formData.fileSize}
            onChange={(e) => updateForm('fileSize', e.target.value)}
          />
        </div>
      </div>

      {/* Access Level */}
      <div className="grid gap-2">
        <Label>Access Level</Label>
        <Select value={formData.accessLevel} onValueChange={(v) => updateForm('accessLevel', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select access level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">
              <span className="flex items-center gap-2">
                <Lock className="size-3" /> Admin Only
              </span>
            </SelectItem>
            <SelectItem value="employee">
              <span className="flex items-center gap-2">Employee</span>
            </SelectItem>
            <SelectItem value="customer">
              <span className="flex items-center gap-2">
                <Globe className="size-3" /> Customer
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Is Shared */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label>Shared</Label>
          <p className="text-xs text-muted-foreground">Make this document visible to others</p>
        </div>
        <Switch checked={formData.isShared} onCheckedChange={(v) => updateForm('isShared', v)} />
      </div>

      {/* Tags */}
      <div className="grid gap-2">
        <Label htmlFor="doc-tags">Tags</Label>
        <Input
          id="doc-tags"
          placeholder="tag1, tag2, tag3..."
          value={formData.tags}
          onChange={(e) => updateForm('tags', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Comma-separated tags</p>
      </div>
    </div>
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <FolderOpen className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Document Center</h2>
            <p className="text-sm text-muted-foreground">Store and manage business documents</p>
          </div>
        </div>
        <Dialog
          open={addDialogOpen}
          onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="size-4 mr-1.5" /> Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Add Document</DialogTitle>
              <DialogDescription>Create a new document record in the center.</DialogDescription>
            </DialogHeader>
            {renderForm()}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleCreate}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Document'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FileText className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '—' : totalDocuments}</p>
                <p className="text-xs text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FolderOpen className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '—' : categoriesCount}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Upload className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '—' : uploadsThisMonth}</p>
                <p className="text-xs text-muted-foreground">Uploads (this month)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Eye className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{isLoading ? '—' : sharedCount}</p>
                <p className="text-xs text-muted-foreground">Shared Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className={`shrink-0 ${showFilters ? 'bg-accent' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="size-4" />
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t">
              <div className="grid gap-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="size-8 rounded" />
                  <Skeleton className="h-4 flex-1 max-w-[200px]" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && documents.length === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <FolderOpen className="size-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold">No documents found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {searchQuery || typeFilter !== 'all' || categoryFilter !== 'all'
                  ? 'Try adjusting your search or filters to find what you\'re looking for.'
                  : 'Upload and organize your business documents. Create your first document to get started.'}
              </p>
              {!searchQuery && typeFilter === 'all' && categoryFilter === 'all' && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="size-4 mr-1.5" /> Add Document
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop Table */}
      {!isLoading && documents.length > 0 && (
        <>
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Access</TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Shared</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const tags = parseTags(doc.tagsJson);
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>{getFileTypeIcon(doc.fileType)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{doc.name}</p>
                            {doc.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                {doc.description}
                              </p>
                            )}
                            {tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tags.slice(0, 3).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {tag}
                                  </Badge>
                                ))}
                                {tags.length > 3 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    +{tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {doc.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{doc.category}</span>
                        </TableCell>
                        <TableCell>{getAccessBadge(doc.accessLevel)}</TableCell>
                        <TableCell>
                          {doc.fileType ? (
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getFileTypeBadgeColor(doc.fileType)}`}>
                              {doc.fileType.toUpperCase()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatFileSize(doc.fileSize)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(doc.createdAt)}
                        </TableCell>
                        <TableCell>
                          {doc.isShared ? (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Eye className="size-3" /> Shared
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Private</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => window.open(doc.fileUrl, '_blank')}>
                                <Download className="size-4 mr-2" /> Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(doc)}>
                                <Pencil className="size-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => openDeleteDialog(doc)}
                              >
                                <Trash2 className="size-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {documents.map((doc) => {
              const tags = parseTags(doc.tagsJson);
              return (
                <Card key={doc.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="mt-0.5 shrink-0">{getFileTypeIcon(doc.fileType)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{doc.name}</p>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {doc.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Badge variant="outline" className="capitalize text-[10px]">
                              {doc.type}
                            </Badge>
                            {getAccessBadge(doc.accessLevel)}
                            {doc.isShared && (
                              <Badge variant="secondary" className="text-[10px] gap-0.5">
                                <Eye className="size-2.5" /> Shared
                              </Badge>
                            )}
                          </div>
                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                              {tags.length > 3 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  +{tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="capitalize">{doc.category}</span>
                            {doc.fileType && (
                              <span className={`font-medium px-1.5 py-0.5 rounded ${getFileTypeBadgeColor(doc.fileType)}`}>
                                {doc.fileType.toUpperCase()}
                              </span>
                            )}
                            <span>{formatFileSize(doc.fileSize)}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1.5">
                            {formatDate(doc.createdAt)}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8 shrink-0">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(doc.fileUrl, '_blank')}>
                            <Download className="size-4 mr-2" /> Download
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(doc)}>
                            <Pencil className="size-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => openDeleteDialog(doc)}
                          >
                            <Trash2 className="size-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setSelectedDoc(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update the document record details.</DialogDescription>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedDoc(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedDoc?.name}&quot;? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
