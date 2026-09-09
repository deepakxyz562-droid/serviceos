'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, FileText, Trash2, Upload, Plus, Loader2, Search, CircleAlert, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface KnowledgeDoc {
  id: string;
  title: string;
  sourceType: string;
  charCount: number;
  chunkCount: number;
  status: string;
  error: string | null;
  createdAt: string;
}

interface SearchSnippet {
  documentId: string;
  documentTitle: string;
  chunkId?: string;
  score: number;
  content: string;
}

const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.markdown', '.csv', '.json', '.log'];
const MAX_FILE_CHARS = 200_000;

export function KnowledgeBasePanel() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<SearchSnippet[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/knowledge');
      const data = await res.json().catch(() => ({}));
      if (res.ok) setDocs(Array.isArray(data.documents) ? data.documents : []);
      else toast.error('Could not load documents', { description: data?.error });
    } catch {
      toast.error('Network error while loading documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDocs(); }, [loadDocs]);

  const ingest = useCallback(async (docTitle: string, docText: string, sourceType: 'manual' | 'file') => {
    setSaving(true);
    try {
      const res = await fetch('/api/ai/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle, text: docText, sourceType }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Knowledge added', { description: `"${data.document?.title}" indexed in ${data.document?.chunkCount} chunks` });
        setAddOpen(false);
        setTitle('');
        setText('');
        await loadDocs();
      } else {
        toast.error('Could not add document', { description: data?.error });
      }
    } catch {
      toast.error('Network error while adding document');
    } finally {
      setSaving(false);
    }
  }, [loadDocs]);

  const handleFileSelected = async (file: File) => {
    const lower = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
      toast.error('Unsupported file type', { description: `Use: ${ACCEPTED_EXTENSIONS.join(', ')}` });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', { description: 'Maximum 2 MB.' });
      return;
    }
    const content = await file.text();
    if (content.length > MAX_FILE_CHARS) {
      toast.error('File too large', { description: `Max ${MAX_FILE_CHARS.toLocaleString()} characters.` });
      return;
    }
    if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, ''));
    setText(content);
    toast.info('File loaded', { description: 'Review then click "Add to Knowledge Base".' });
  };

  const handleDelete = async (doc: KnowledgeDoc) => {
    if (deletingId) return;
    if (!window.confirm(`Delete "${doc.title}"?`)) return;
    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/ai/knowledge/${doc.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Document deleted'); await loadDocs(); }
      else { const data = await res.json().catch(() => ({})); toast.error('Delete failed', { description: data?.error }); }
    } catch {
      toast.error('Network error while deleting');
    } finally {
      setDeletingId(null);
    }
  };

  const runTest = async () => {
    const q = testQuery.trim();
    if (!q || testing) return;
    setTesting(true);
    setTestResults(null);
    try {
      const res = await fetch(`/api/ai/knowledge?q=${encodeURIComponent(q)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setTestResults(Array.isArray(data.results) ? data.results : []);
      else toast.error('Search failed', { description: data?.error });
    } catch {
      toast.error('Network error during search');
    } finally {
      setTesting(false);
    }
  };

  const statusBadge = (doc: KnowledgeDoc) => {
    if (doc.status === 'ready') return <Badge variant="secondary" className="gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" /> {doc.chunkCount} chunks</Badge>;
    if (doc.status === 'processing') return <Badge variant="outline" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> processing</Badge>;
    return <Badge variant="destructive" className="gap-1 text-[10px]"><CircleAlert className="h-3 w-3" /> failed</Badge>;
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><BookOpen className="h-4 w-4 text-primary" />Knowledge Documents</CardTitle>
            <CardDescription>Policies, FAQs & procedures the AI quotes when answering</CardDescription>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No documents yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Add your business hours, cancellation policy, pricing rules or FAQs — the AI assistant and phone receptionist will use them.</p>
              <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add your first document</Button>
            </div>
          ) : (
            <ScrollArea className="max-h-96">
              <div className="space-y-2 pr-3">
                {docs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                    <div className="flex min-w-0 items-start gap-3">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{doc.sourceType === 'file' ? 'Uploaded' : 'Pasted'} · {doc.charCount.toLocaleString()} chars · {new Date(doc.createdAt).toLocaleDateString()}</p>
                        {doc.status === 'failed' && doc.error && <p className="mt-1 truncate text-xs text-destructive">{doc.error}</p>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {statusBadge(doc)}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => void handleDelete(doc)} disabled={deletingId === doc.id} aria-label={`Delete ${doc.title}`}>
                        {deletingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 self-start">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4 text-primary" />Retrieval Tester</CardTitle>
          <CardDescription>Check what the AI would find before asking it live</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={testQuery} onChange={(e) => setTestQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void runTest(); }} placeholder="e.g. cancellation policy" aria-label="Test query" />
            <Button size="icon" onClick={() => void runTest()} disabled={testing || !testQuery.trim()} aria-label="Run test search">{testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}</Button>
          </div>
          {testResults !== null && (testResults.length === 0 ? (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">No matches. Add a document that covers this topic.</p>
          ) : (
            <div className="space-y-2">
              {testResults.map((r) => (
                <div key={r.chunkId} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-medium">{r.documentTitle}</p>
                    <Badge variant="outline" className="text-[10px]">{(r.score * 100).toFixed(0)}%</Badge>
                  </div>
                  <p className="line-clamp-4 text-xs text-muted-foreground">{r.content}</p>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={(open) => { if (!saving) setAddOpen(open); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Add knowledge document</DialogTitle>
            <DialogDescription>Paste text or upload a file. It will be split into chunks and indexed for retrieval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g. Cancellation Policy)" aria-label="Document title" />
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the document text here…" rows={9} className="max-h-72 resize-y" aria-label="Document text" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <input ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS.join(',')} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileSelected(f); e.target.value = ''; }} />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}><Upload className="mr-1 h-4 w-4" /> Upload .txt / .md / .csv</Button>
              </div>
              <p className="text-xs text-muted-foreground">{text.length > 0 ? `${text.length.toLocaleString()} characters` : ' '}</p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={() => void ingest(title.trim() || 'Untitled document', text, 'manual')} disabled={saving || !text.trim()}>
                {saving ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Indexing…</> : <><Plus className="mr-1 h-4 w-4" /> Add to Knowledge Base</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
