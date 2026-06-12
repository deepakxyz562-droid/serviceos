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
  Users, Plus, Search, Phone, Mail, MessageCircle,
  Eye, Trash2, Pencil, MapPin, Briefcase,
  FileText, Calendar,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  address: string | null;
  whatsappId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    jobs: number;
    invoices: number;
    leads: number;
  };
}

interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  whatsappId: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EMPTY_FORM = (): ContactFormData => ({
  name: '', phone: '', email: '', address: '', whatsappId: '',
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ContactsView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<ContactFormData>(EMPTY_FORM());
  const [saving, setSaving] = useState(false);

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // ─── Debounced Search ─────────────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      params.set('limit', '100');
      params.set('sortBy', 'createdAt');
      params.set('sortOrder', 'desc');

      const res = await authFetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to fetch contacts' }));
        throw new Error(errorData.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      const message = err instanceof Error ? err.message : 'Failed to load contacts';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // ─── Stats ──────────────────────────────────────────────────────────────

  const thisMonth = contacts.filter((c) => {
    const date = new Date(c.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  const withEmail = contacts.filter((c) => c.email).length;
  const withWhatsApp = contacts.filter((c) => c.whatsappId).length;

  const stats = {
    total: contacts.length,
    withEmail,
    withWhatsApp,
    thisMonth,
  };

  // ─── Handlers ────────────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingContact(null);
    setForm(EMPTY_FORM());
    setShowCreateDialog(true);
  };

  const openEditDialog = (contact: Contact) => {
    setEditingContact(contact);
    setForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || '',
      address: contact.address || '',
      whatsappId: contact.whatsappId || '',
    });
    setShowCreateDialog(true);
  };

  const openDetailDialog = (contact: Contact) => {
    setSelectedContact(contact);
    setShowDetailDialog(true);
  };

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        whatsappId: form.whatsappId.trim() || null,
      };

      if (editingContact) {
        const res = await authFetch(`/api/contacts/${editingContact.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to update');
        }
        toast.success('Contact updated');
      } else {
        const res = await authFetch('/api/contacts', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create');
        }
        toast.success('Contact created');
      }
      setShowCreateDialog(false);
      setEditingContact(null);
      fetchContacts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save contact';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }, [form, editingContact, fetchContacts]);

  const handleDelete = useCallback(async (contactId: string) => {
    try {
      const res = await authFetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }
      toast.success('Contact deleted');
      if (selectedContact?.id === contactId) { setShowDetailDialog(false); setSelectedContact(null); }
      fetchContacts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete contact';
      toast.error(message);
    }
  }, [selectedContact, fetchContacts]);

  const handleWhatsApp = (phone: string) => {
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
    toast.success('Opening WhatsApp');
  };

  const handleCreateJob = (contact: Contact) => {
    toast.success(`Creating job for ${contact.name}...`);
    // In a real app, this would navigate to job creation with contact pre-filled
  };

  const handleCreateQuote = (contact: Contact) => {
    toast.success(`Creating quote for ${contact.name}...`);
    // In a real app, this would navigate to quote creation with contact pre-filled
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
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-10" />
                </div>
                <Skeleton className="size-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-36" />
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
        icon={Users}
        iconBg="bg-blue-600"
        title="Contacts"
        description="Manage customer contacts, details, and communication"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1.5" /> Add Contact
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Contacts', value: stats.total, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'With Email', value: stats.withEmail, icon: Mail, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'With WhatsApp', value: stats.withWhatsApp, icon: MessageCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'This Month', value: stats.thisMonth, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
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

      {/* Search */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search by name, phone, or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Content */}
      {loading ? renderLoadingSkeletons() : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts found"
          description={searchQuery ? 'Try adjusting your search query' : 'Start by adding your first contact'}
          actionLabel="Add Contact"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => openDetailDialog(contact)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center justify-center size-10 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold shrink-0">
                      {getInitials(contact.name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate group-hover:text-emerald-700 transition-colors">{contact.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{contact.phone}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {contact.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="size-3 shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.address && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{contact.address}</span>
                    </div>
                  )}
                  {contact.whatsappId && (
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="size-3 shrink-0 text-emerald-600" />
                      <span className="truncate">{contact.whatsappId}</span>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-1 pt-2 border-t">
                  <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); handleWhatsApp(contact.phone); }}>
                    <MessageCircle className="size-3 mr-1 text-emerald-600" /> WhatsApp
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); handleCreateJob(contact); }}>
                    <Briefcase className="size-3 mr-1" /> Job
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs flex-1" onClick={(e) => { e.stopPropagation(); handleCreateQuote(contact); }}>
                    <FileText className="size-3 mr-1" /> Quote
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-blue-600" />
              {editingContact ? 'Edit Contact' : 'Add Contact'}
            </DialogTitle>
            <DialogDescription>{editingContact ? 'Update contact information' : 'Add a new contact to your CRM'}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-1">
            <div className="space-y-4 pr-3">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input placeholder="Full name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone *</Label>
                  <Input placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input placeholder="Full address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp ID</Label>
                <Input placeholder="e.g., 919876543210" value={form.whatsappId} onChange={(e) => setForm((p) => ({ ...p, whatsappId: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Phone number with country code, no + sign</p>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingContact ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md max-h-[90vh]">
          {selectedContact && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-12 rounded-full bg-blue-100 text-blue-700 text-lg font-semibold shrink-0">
                    {getInitials(selectedContact.name)}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="truncate">{selectedContact.name}</DialogTitle>
                    <DialogDescription>{selectedContact.phone}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[55vh] pr-1">
                <div className="space-y-4 pr-3">
                  <div className="space-y-2">
                    {selectedContact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="size-4 text-muted-foreground shrink-0" />
                        <a href={`mailto:${selectedContact.email}`} className="text-blue-600 hover:underline truncate">{selectedContact.email}</a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="size-4 text-muted-foreground shrink-0" />
                      <a href={`tel:${selectedContact.phone}`} className="hover:underline">{selectedContact.phone}</a>
                    </div>
                    {selectedContact.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="size-4 text-muted-foreground shrink-0" />
                        <span>{selectedContact.address}</span>
                      </div>
                    )}
                    {selectedContact.whatsappId && (
                      <div className="flex items-center gap-2 text-sm">
                        <MessageCircle className="size-4 text-emerald-600 shrink-0" />
                        <span>{selectedContact.whatsappId}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold">{selectedContact._count?.jobs ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Jobs</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{selectedContact._count?.invoices ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Invoices</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="text-xs text-muted-foreground">
                    <p>Added {formatDate(selectedContact.createdAt)}</p>
                    {selectedContact.updatedAt !== selectedContact.createdAt && (
                      <p>Last updated {formatDate(selectedContact.updatedAt)}</p>
                    )}
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex gap-2 flex-1 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => handleWhatsApp(selectedContact.phone)}>
                    <MessageCircle className="size-3.5 mr-1" /> WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateJob(selectedContact)}>
                    <Briefcase className="size-3.5 mr-1" /> Create Job
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleCreateQuote(selectedContact)}>
                    <FileText className="size-3.5 mr-1" /> Create Quote
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { openEditDialog(selectedContact); setShowDetailDialog(false); }}>
                    <Pencil className="size-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => { handleDelete(selectedContact.id); setShowDetailDialog(false); }}>
                    <Trash2 className="size-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
