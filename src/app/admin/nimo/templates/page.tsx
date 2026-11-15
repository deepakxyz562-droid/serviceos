'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  SlidersHorizontal,
  Edit3,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Coins,
  Heart,
  Gift,
  RefreshCw,
  Image as ImageIcon,
  Save,
  X,
} from 'lucide-react';

interface TemplateAdminItem {
  id: string;
  title: string;
  slug: string;
  category: 'Couple' | 'Wishes' | 'Refoto' | string;
  description: string;
  thumbnail_url: string;
  preview_url: string;
  coin_cost: number;
  required_photo_slots: number;
  aspect_ratio: string;
  is_trending?: boolean;
  is_featured?: boolean;
  is_active: boolean;
  prompt: string;
}

const DEFAULT_TEMPLATES: TemplateAdminItem[] = [
  {
    id: 'our-love-story',
    title: 'Our Love Story',
    slug: 'our-love-story',
    category: 'Couple',
    description: 'Romantic couple portrait with leather jacket, sunglasses, and warm smiles.',
    thumbnail_url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 2,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    is_active: true,
    prompt:
      'Romantic cinematic couple portrait. Preserving woman partner facial structure from <IMAGE_0> and man partner facial structure from <IMAGE_1>. Stylish leather jacket aesthetic, sunglasses, gentle golden sunset backlighting, natural radiant skin, high detail 8k',
  },
  {
    id: 'sunset-love-memories',
    title: 'Sunset Love Memories',
    slug: 'sunset-love-memories',
    category: 'Couple',
    description: 'Couple silhouette embracing on a beach with golden ocean sunset reflections.',
    thumbnail_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 2,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    is_active: true,
    prompt:
      'Dreamy golden hour beach portrait of couple. Preserving identity of woman from <IMAGE_0> and man from <IMAGE_1>. Intimate romantic embrace against setting sun over calm ocean waves, warm amber glow, lens flare, cinematic photography',
  },
  {
    id: 'long-drive-love',
    title: 'Long Drive Love',
    slug: 'long-drive-love',
    category: 'Couple',
    description: 'Joyful couple smiling in a vintage convertible on an open highway road trip.',
    thumbnail_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 2,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    is_active: true,
    prompt:
      'Scenic convertible road trip portrait featuring woman from <IMAGE_0> and man from <IMAGE_1> in a classic open-top vintage sports car. Sun-drenched open road, wind in hair, sunglasses, genuine joy, Kodachrome film look',
  },
  {
    id: 'birthday-wish',
    title: 'Birthday Wish',
    slug: 'birthday-wish',
    category: 'Wishes',
    description: 'Birthday celebration with princess tiara, pink balloons, and birthday cake with candles.',
    thumbnail_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    is_active: true,
    prompt:
      'Glamorous birthday celebration portrait preserving facial identity of <IMAGE_0>. Elegant crystal tiara, pastel pink balloon background, holding glowing birthday cake with lit candles, festive warm bokeh',
  },
  {
    id: 'anniversary-wish',
    title: 'Anniversary Wish',
    slug: 'anniversary-wish',
    category: 'Wishes',
    description: 'Anniversary romance in evening suit and red gown under golden chandelier bokeh lights.',
    thumbnail_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 2,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    is_active: true,
    prompt:
      'Opulent luxury anniversary couple portrait featuring woman from <IMAGE_0> in crimson evening gown and gentleman from <IMAGE_1> in tailored black tux. Grand ballroom setting, warm chandelier bokeh, romantic gaze',
  },
  {
    id: 'magazine-cover',
    title: 'Magazine Cover',
    slug: 'magazine-cover',
    category: 'Refoto',
    description: 'High-fashion editorial model on glossy VOGUE style luxury magazine cover.',
    thumbnail_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: true,
    is_featured: true,
    is_active: true,
    prompt:
      'Vogue fashion magazine cover portrait preserving exact facial features of <IMAGE_0>. Bold typography styling, dramatic studio rim light, radiant flawless complexion, high-fashion styling',
  },
  {
    id: 'dark-royal-bride',
    title: 'Dark Royal Bride',
    slug: 'dark-royal-bride',
    category: 'Refoto',
    description: 'Traditional royal bride with elaborate golden embroidery and ornate bridal jewelry.',
    thumbnail_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: false,
    is_featured: true,
    is_active: true,
    prompt:
      'Royal heritage bride portrait preserving facial features of <IMAGE_0>. Heavy maroon velvet lehenga with zardozi embroidery, royal gold kundan jewelry, dramatic royal palace background',
  },
  {
    id: 'luxury-car-night',
    title: 'Luxury Car Night',
    slug: 'luxury-car-night',
    category: 'Refoto',
    description: 'Sophisticated night portrait standing next to an exotic supercar under neon reflections.',
    thumbnail_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: false,
    is_featured: true,
    is_active: true,
    prompt:
      'Billionaire night street aesthetic preserving face of <IMAGE_0>. Bespoke black formal blazer, standing next to a glossy black supercar, neon city reflections on car paint, cinematic moody lighting',
  },
  {
    id: 'neon-red-smoke',
    title: 'Neon Red Smoke',
    slug: 'neon-red-smoke',
    category: 'Refoto',
    description: 'Moody dramatic portrait surrounded by crimson red smoke and dark aesthetic lighting.',
    thumbnail_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
    preview_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=1200&q=85',
    coin_cost: 5,
    required_photo_slots: 1,
    aspect_ratio: '9:16',
    is_trending: false,
    is_featured: true,
    is_active: true,
    prompt:
      'Dramatic cinematic portrait preserving facial structure of <IMAGE_0>. Surrounded by intense swirling crimson red smoke, black leather jacket, high contrast chiaroscuro, intense cinematic gaze',
  },
];

export default function NimoTemplatesAdminPage() {
  const [templates, setTemplates] = useState<TemplateAdminItem[]>(DEFAULT_TEMPLATES);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<TemplateAdminItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/nimo/templates?limit=50')
      .then((res) => res.json())
      .then((res) => {
        if (res.success && res.data && res.data.length > 0) {
          const mapped = res.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            category: item.template_categories?.name || 'Refoto',
            description: item.description || '',
            thumbnail_url: item.thumbnail_url,
            preview_url: item.preview_url || item.thumbnail_url,
            coin_cost: item.coin_cost || 5,
            required_photo_slots: item.required_photo_slots || 1,
            aspect_ratio: item.aspect_ratio || '9:16',
            is_trending: item.is_trending,
            is_featured: item.is_featured,
            is_active: item.is_active !== false,
            prompt: item.prompt_config?.prompt || '',
          }));
          setTemplates(mapped);
        }
      })
      .catch(() => {
        // Keep defaults
      });
  }, []);

  const filteredTemplates = templates.filter((tpl) => {
    const matchesCat =
      selectedCategory === 'All' || tpl.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      tpl.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.prompt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleOpenEdit = (template: TemplateAdminItem) => {
    setEditingTemplate({ ...template });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingTemplate({
      id: '',
      title: '',
      slug: '',
      category: 'Couple',
      description: '',
      thumbnail_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      preview_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=85',
      coin_cost: 5,
      required_photo_slots: 1,
      aspect_ratio: '9:16',
      is_trending: true,
      is_featured: true,
      is_active: true,
      prompt:
        'Masterpiece portrait preserving facial geometry of <IMAGE_0>, atmospheric studio lighting, 8k resolution',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingTemplate || !editingTemplate.title) return;
    setIsSaving(true);

    try {
      const res = await fetch('/api/nimo/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate.id || undefined,
          title: editingTemplate.title,
          slug: editingTemplate.slug,
          category_id:
            editingTemplate.category === 'Couple'
              ? '11111111-1111-1111-1111-111111111101'
              : editingTemplate.category === 'Wishes'
              ? '11111111-1111-1111-1111-111111111102'
              : '11111111-1111-1111-1111-111111111103',
          description: editingTemplate.description,
          thumbnail_url: editingTemplate.thumbnail_url,
          preview_url: editingTemplate.preview_url,
          coin_cost: editingTemplate.coin_cost,
          required_photo_slots: editingTemplate.required_photo_slots,
          aspect_ratio: editingTemplate.aspect_ratio,
          is_trending: editingTemplate.is_trending,
          is_featured: editingTemplate.is_featured,
          is_active: editingTemplate.is_active,
          prompt: editingTemplate.prompt,
        }),
      });

      const json = await res.json();
      if (json.success) {
        if (editingTemplate.id) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === editingTemplate.id ? { ...editingTemplate } : t))
          );
        } else {
          setTemplates((prev) => [
            { ...editingTemplate, id: json.data?.id || 'tpl-' + Date.now() },
            ...prev,
          ]);
        }
        setIsModalOpen(false);
      }
    } catch {
      // Local update
      if (editingTemplate.id) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === editingTemplate.id ? { ...editingTemplate } : t))
        );
      } else {
        setTemplates((prev) => [{ ...editingTemplate, id: 'tpl-' + Date.now() }, ...prev]);
      }
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t))
    );
  };

  return (
    <div className="min-h-screen bg-[#080014] text-white p-6 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#291D52]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">NIMO Studio Admin</h1>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Grok 2.0 Engine
                </span>
              </div>
              <p className="text-sm text-[#A79EC4]">
                Manage AI photo templates, prompt schemas, couple slots, and coin costs dynamically.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] font-bold text-sm text-white shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Template
            </button>
          </div>
        </div>

        {/* Studio Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#160D2E] border border-[#291D52] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#A79EC4] uppercase font-semibold">Active Templates</p>
              <p className="text-2xl font-black text-white">{templates.length}</p>
            </div>
          </div>

          <div className="bg-[#160D2E] border border-[#291D52] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#A79EC4] uppercase font-semibold">Couple Templates (2-Slots)</p>
              <p className="text-2xl font-black text-white">
                {templates.filter((t) => t.category === 'Couple' || t.required_photo_slots === 2).length}
              </p>
            </div>
          </div>

          <div className="bg-[#160D2E] border border-[#291D52] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#A79EC4] uppercase font-semibold">Standard Cost</p>
              <p className="text-2xl font-black text-white">5 Coins / Gen</p>
            </div>
          </div>

          <div className="bg-[#160D2E] border border-[#291D52] rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-[#A79EC4] uppercase font-semibold">Likeness Engine</p>
              <p className="text-2xl font-black text-emerald-400">Kie.ai 100%</p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#160D2E] p-3 rounded-2xl border border-[#291D52]">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {['All', 'Couple', 'Wishes', 'Refoto'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#8B5CF6] text-white shadow-md shadow-purple-600/30'
                    : 'bg-[#0E0422] text-[#A79EC4] hover:text-white border border-[#291D52]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#6B6188] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, slug, or prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0E0422] border border-[#291D52] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#6B6188] focus:outline-none focus:border-[#8B5CF6]"
            />
          </div>
        </div>

        {/* Templates Table */}
        <div className="bg-[#160D2E] rounded-2xl border border-[#291D52] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0E0422] text-[#A79EC4] uppercase border-b border-[#291D52]">
                <tr>
                  <th className="py-3 px-4">Template</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Slots & Aspect</th>
                  <th className="py-3 px-4">Prompt Pattern</th>
                  <th className="py-3 px-4">Coin Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#291D52]">
                {filteredTemplates.map((item) => (
                  <tr key={item.id} className="hover:bg-[#1E123F]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.thumbnail_url}
                          alt={item.title}
                          className="w-11 h-14 object-cover rounded-lg border border-[#3D2D78] shadow"
                        />
                        <div>
                          <p className="font-bold text-white text-sm">{item.title}</p>
                          <p className="text-[11px] text-[#A79EC4]">{item.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-white">
                          {item.required_photo_slots === 2 ? '👥 2 Slots (Couple)' : '👤 1 Slot'}
                        </span>
                        <span className="text-[10px] text-[#A79EC4]">Ratio: {item.aspect_ratio}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="text-[#A79EC4] text-[11px] line-clamp-2 leading-relaxed font-mono">
                        {item.prompt}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-amber-400">🪙 {item.coin_cost}</span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                          item.is_active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {item.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg bg-[#221545] hover:bg-[#8B5CF6] text-white transition-colors cursor-pointer"
                          title="Edit Template & Prompt"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={item.preview_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-[#221545] hover:bg-purple-900 text-[#A79EC4] hover:text-white transition-colors"
                          title="View High-Res"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit / Create Modal */}
      {isModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#160D2E] border border-[#3D2D78] rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-[#291D52]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#8B5CF6]" />
                <h2 className="text-lg font-bold text-white">
                  {editingTemplate.id ? 'Edit Template & AI Prompt' : 'Create New AI Style Template'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-[#A79EC4] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A79EC4]">Template Title</label>
                <input
                  type="text"
                  value={editingTemplate.title}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  className="w-full bg-[#0E0422] border border-[#291D52] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                  placeholder="e.g. Royal Twilight Romance"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A79EC4]">Category</label>
                <select
                  value={editingTemplate.category}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, category: e.target.value })}
                  className="w-full bg-[#0E0422] border border-[#291D52] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="Couple">Couple</option>
                  <option value="Wishes">Wishes</option>
                  <option value="Refoto">Refoto</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A79EC4]">Required Photo Slots</label>
                <select
                  value={editingTemplate.required_photo_slots}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      required_photo_slots: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full bg-[#0E0422] border border-[#291D52] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                >
                  <option value="1">1 Photo (Solo Portrait)</option>
                  <option value="2">2 Photos (Couple - Her & His)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#A79EC4]">Coin Cost</label>
                <input
                  type="number"
                  value={editingTemplate.coin_cost}
                  onChange={(e) =>
                    setEditingTemplate({
                      ...editingTemplate,
                      coin_cost: parseInt(e.target.value || '5', 10),
                    })
                  }
                  className="w-full bg-[#0E0422] border border-[#291D52] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-[#A79EC4]">Thumbnail Image URL</label>
                <input
                  type="text"
                  value={editingTemplate.thumbnail_url}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, thumbnail_url: e.target.value })
                  }
                  className="w-full bg-[#0E0422] border border-[#291D52] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#8B5CF6]"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-[#A79EC4]">
                  Grok 2.0 AI Prompt (Use <code className="text-purple-400">&lt;IMAGE_0&gt;</code> and <code className="text-pink-400">&lt;IMAGE_1&gt;</code>)
                </label>
                <textarea
                  rows={4}
                  value={editingTemplate.prompt}
                  onChange={(e) =>
                    setEditingTemplate({ ...editingTemplate, prompt: e.target.value })
                  }
                  className="w-full bg-[#0E0422] border border-[#291D52] rounded-xl p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#8B5CF6]"
                />
                <p className="text-[11px] text-[#A79EC4]">
                  Tip: Grok 2.0 uses multi-reference tokens to inject facial identity seamlessly.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#291D52]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-[#291D52] text-xs font-bold text-[#A79EC4] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold text-white shadow-lg shadow-purple-600/30 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
