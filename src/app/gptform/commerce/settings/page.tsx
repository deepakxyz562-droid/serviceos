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

const PRESET_TEMPLATES = [
  {
    name: "🎂 Birthday Cake Order",
    desc: "Flavors, sizes, message & delivery",
    greeting: "Hi! Welcome to our bakery. What cake would you like to order today?",
    catalog: [
      { id: "1", name: "Belgian Chocolate Cake", price: 800, isActive: true },
      { id: "2", name: "Red Velvet Cake", price: 850, isActive: true },
      { id: "3", name: "Fresh Pineapple Cake", price: 650, isActive: true },
      { id: "4", name: "Black Forest Cake", price: 700, isActive: true },
    ],
    fields: [
      { id: "product", label: "What cake flavor would you like to order?", type: "product", required: true, mapsTo: "product" },
      { id: "quantity", label: "What size / weight do you need? (e.g. 0.5kg, 1kg, 2kg)", type: "quantity", required: true, mapsTo: "quantity" },
      { id: "message_on_cake", label: "Any message you want written on the cake?", type: "text", required: false, mapsTo: "notes" },
      { id: "delivery_date", label: "What date & time do you need it by?", type: "date", required: true, mapsTo: "deliveryDate" },
      { id: "delivery_type", label: "Would you prefer Delivery or Store Pickup?", type: "choice", options: ["Delivery", "Pickup"], required: true, mapsTo: "deliveryType" },
      { id: "address", label: "Please share your delivery address:", type: "address", required: true, mapsTo: "deliveryAddress" },
      { id: "name", label: "May I know your name for the order?", type: "text", required: true, mapsTo: "customerName" },
    ],
  },
  {
    name: "🍱 Tiffin Service",
    desc: "Meal plans, dietary preferences & address",
    greeting: "Namaste! Welcome to our Home Tiffin Service. Which meal plan can we start for you?",
    catalog: [
      { id: "1", name: "Daily Veg Thali", price: 120, isActive: true },
      { id: "2", name: "Weekly Lunch Plan (6 days)", price: 700, isActive: true },
      { id: "3", name: "Monthly Lunch + Dinner (30 days)", price: 4500, isActive: true },
    ],
    fields: [
      { id: "product", label: "Which tiffin plan would you like?", type: "product", required: true, mapsTo: "product" },
      { id: "quantity", label: "How many tiffins per delivery?", type: "quantity", required: true, mapsTo: "quantity" },
      { id: "start_date", label: "Starting from which date?", type: "date", required: true, mapsTo: "deliveryDate" },
      { id: "diet", label: "Any dietary preference? (e.g. Jain, No Onion/Garlic)", type: "text", required: false, mapsTo: "notes" },
      { id: "address", label: "Please provide your full delivery address:", type: "address", required: true, mapsTo: "deliveryAddress" },
      { id: "name", label: "Your name please:", type: "text", required: true, mapsTo: "customerName" },
    ],
  },
  {
    name: "💇 Salon Booking",
    desc: "Services, slot & stylist preference",
    greeting: "Hello! Welcome to our Salon. Which service would you like to book?",
    catalog: [
      { id: "1", name: "Haircut & Styling", price: 499, isActive: true },
      { id: "2", name: "Facial & Glow Treatment", price: 1299, isActive: true },
      { id: "3", name: "Hair Spa & Keratin", price: 1899, isActive: true },
    ],
    fields: [
      { id: "product", label: "Which service would you like to book?", type: "product", required: true, mapsTo: "product" },
      { id: "appointment_date", label: "Preferred date & time slot for your appointment?", type: "date", required: true, mapsTo: "deliveryDate" },
      { id: "stylist", label: "Any preferred stylist or staff member?", type: "text", required: false, mapsTo: "notes" },
      { id: "name", label: "May I know your name?", type: "text", required: true, mapsTo: "customerName" },
    ],
  },
];

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

  function applyPreset(preset: typeof PRESET_TEMPLATES[0]) {
    if (catalog.length > 0 && !confirm(`Load the "${preset.name}" template? This will replace your current catalog and fields.`)) {
      return;
    }
    setCatalog(preset.catalog);
    setFields(preset.fields);
    setGreetingMessage(preset.greeting);
  }

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
        {/* Quick Setup Templates */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1">
            ⚡ Quick Setup from Template
          </h3>
          <p className="text-[11px] text-blue-700 mb-3">
            Choose a vertical to auto-populate products, checkout fields, and greeting message:
          </p>
          <div className="grid grid-cols-1 gap-2">
            {PRESET_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(tmpl)}
                className="flex items-center justify-between rounded-lg border border-blue-200 bg-white px-3 py-2 text-left hover:border-blue-400 hover:bg-blue-50 transition shadow-2xs"
              >
                <div>
                  <div className="text-xs font-bold text-stone-900">{tmpl.name}</div>
                  <div className="text-[10px] text-stone-500">{tmpl.desc}</div>
                </div>
                <span className="text-[10px] font-semibold text-blue-600">Apply →</span>
              </button>
            ))}
          </div>
        </div>
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
