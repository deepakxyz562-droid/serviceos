'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/features/quote-flow/store/app';
import { api, apiPatch } from '@/features/quote-flow/lib/api';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Package,
  IndianRupee,
  MapPin,
  MessageSquare,
} from 'lucide-react';

export default function CommerceSettingsPage() {
  const closeModal = useAppStore((s) => s.closeModal);
  const business = useAppStore((s) => s.business);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [catalog, setCatalog] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [upiId, setUpiId] = useState('');
  const [deliveryAreas, setDeliveryAreas] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');

  useEffect(() => {
    api<{ config: any }>('/api/commerce/config')
      .then((r) => {
        const c = r.config;
        setConfig(c);
        setCatalog(JSON.parse(c.catalogJson || '[]'));
        setFields(JSON.parse(c.fieldsJson || '[]'));
        setUpiId(c.upiId || '');
        setDeliveryAreas(JSON.parse(c.deliveryAreasJson || '[]').join(', '));
        setGreetingMessage(c.greetingMessage || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await apiPatch('/api/commerce/config', {
        catalogJson: catalog,
        fieldsJson: fields,
        upiId: upiId || null,
        deliveryAreasJson: deliveryAreas.split(',').map((s) => s.trim()).filter(Boolean),
        greetingMessage: greetingMessage || null,
      });
      alert('Settings saved!');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-50">
        <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-stone-50 overflow-y-auto">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button onClick={() => window.history.back()} className="text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-stone-900">Commerce Settings</h2>
        <button onClick={save} disabled={saving} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
        </button>
      </div>

      <div className="mx-auto max-w-md px-5 py-4 pb-24 space-y-6">
        <Section icon={<MessageSquare className="size-4" />} title="Greeting Message">
          <textarea value={greetingMessage} onChange={(e) => setGreetingMessage(e.target.value)} placeholder="Hi! Welcome to our store. What would you like to order?" className="w-full rounded-lg border border-stone-200 p-2 text-xs" rows={2} />
        </Section>

        <Section icon={<Package className="size-4" />} title="Product Catalog">
          {catalog.map((product, idx) => (
            <div key={idx} className="mb-2 flex gap-2">
              <input value={product.name} onChange={(e) => { const n = [...catalog]; n[idx] = { ...product, name: e.target.value }; setCatalog(n); }} placeholder="Product name" className="flex-1 rounded-lg border border-stone-200 p-2 text-xs" />
              <input type="number" value={product.price} onChange={(e) => { const n = [...catalog]; n[idx] = { ...product, price: parseFloat(e.target.value) || 0 }; setCatalog(n); }} placeholder="Price" className="w-20 rounded-lg border border-stone-200 p-2 text-xs" />
              <button onClick={() => setCatalog(catalog.filter((_, i) => i !== idx))} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="size-4" /></button>
            </div>
          ))}
          <button onClick={() => setCatalog([...catalog, { id: Date.now().toString(), name: '', price: 0, isActive: true }])} className="flex items-center gap-1 text-xs font-semibold text-blue-600"><Plus className="size-4" /> Add Product</button>
        </Section>

        <Section icon={<IndianRupee className="size-4" />} title="Payment">
          <label className="text-xs font-semibold text-stone-600 mb-1 block">UPI ID</label>
          <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@okhdfcbank" className="w-full rounded-lg border border-stone-200 p-2 text-xs" />
        </Section>

        <Section icon={<MapPin className="size-4" />} title="Delivery Areas">
          <label className="text-xs font-semibold text-stone-600 mb-1 block">Supported areas (comma-separated)</label>
          <input value={deliveryAreas} onChange={(e) => setDeliveryAreas(e.target.value)} placeholder="Bangalore, Mumbai, Patna" className="w-full rounded-lg border border-stone-200 p-2 text-xs" />
          <p className="text-[10px] text-stone-400 mt-1">Leave empty to accept all areas.</p>
        </Section>

        <Section icon={<Package className="size-4" />} title="Order Fields">
          <p className="text-[10px] text-stone-400 mb-2">These are the fields the AI agent will collect from the customer.</p>
          {fields.map((field, idx) => (
            <div key={idx} className="mb-2 rounded-lg border border-stone-200 p-2">
              <input value={field.label} onChange={(e) => { const n = [...fields]; n[idx] = { ...field, label: e.target.value }; setFields(n); }} className="w-full rounded border border-stone-200 p-1.5 text-xs" />
              <div className="flex items-center gap-2 mt-1"><span className="text-[10px] text-stone-400">{field.type}</span>{field.required && <span className="text-[10px] text-red-500">required</span>}</div>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4 border border-stone-200/80 shadow-2xs">
      <div className="flex items-center gap-2 mb-3"><div className="rounded-lg bg-stone-100 p-1.5">{icon}</div><h3 className="text-sm font-bold text-stone-900">{title}</h3></div>
      {children}
    </div>
  );
}
