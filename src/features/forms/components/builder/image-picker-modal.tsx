'use client';

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Search,
  Upload,
  Link2,
  Sparkles,
  ImageIcon,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { authFetch } from '@/lib/api';

export interface ImagePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (url: string) => void;
  title?: string;
}

// ─── Curated Royalty-Free Unsplash Stock Gallery by Industry ─────────────────
export interface StockImage {
  url: string;
  thumbnail: string;
  title: string;
  category: string;
  author: string;
}

export const CURATED_STOCK_IMAGES: StockImage[] = [
  // Roofing & Construction
  {
    url: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=400&q=80',
    title: 'Modern Luxury Home Exterior',
    category: 'Roofing',
    author: 'Avi Waxman',
  },
  {
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80',
    title: 'Architectural House Design',
    category: 'Roofing',
    author: 'R ARCHITECTURE',
  },
  {
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=400&q=80',
    title: 'Construction Site Craftsmanship',
    category: 'Construction',
    author: 'Jeriden Villegas',
  },
  {
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80',
    title: 'Skilled Construction Builder',
    category: 'Construction',
    author: 'Clem Onojeghuo',
  },

  // HVAC & Mechanical
  {
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
    title: 'HVAC & Electrician Pro',
    category: 'HVAC',
    author: 'Emmanuel Ikwuegbu',
  },
  {
    url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=400&q=80',
    title: 'Industrial Equipment Inspection',
    category: 'HVAC',
    author: 'Science in HD',
  },

  // Plumbing & Water
  {
    url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
    title: 'Modern Bathroom Plumbing Fixture',
    category: 'Plumbing',
    author: 'Sanibell BV',
  },
  {
    url: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=400&q=80',
    title: 'Clean Water System',
    category: 'Plumbing',
    author: 'Curology',
  },

  // Solar & Energy
  {
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=400&q=80',
    title: 'Rooftop Solar Panels',
    category: 'Solar',
    author: 'Zbynek Burival',
  },
  {
    url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=400&q=80',
    title: 'Clean Energy Home Solar',
    category: 'Solar',
    author: 'American Public Power',
  },

  // Automotive & Detailing
  {
    url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=400&q=80',
    title: 'Luxury Car Ceramic Coating',
    category: 'Automotive',
    author: 'Adrian N',
  },
  {
    url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80',
    title: 'Studio Auto Detailing',
    category: 'Automotive',
    author: 'Tekton',
  },

  // Landscaping & Yard
  {
    url: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=400&q=80',
    title: 'Lush Backyard Lawn & Garden',
    category: 'Landscaping',
    author: 'Benjamin Combs',
  },
  {
    url: 'https://images.unsplash.com/photo-1592417817098-8f3d69104a47?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1592417817098-8f3d69104a47?auto=format&fit=crop&w=400&q=80',
    title: 'Professional Landscaping Stone Patio',
    category: 'Landscaping',
    author: 'Steven Ungermann',
  },

  // Business & Office
  {
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=400&q=80',
    title: 'Modern Business Office Interior',
    category: 'Business',
    author: 'Nastuh Abootalebi',
  },
  {
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80',
    title: 'Commercial Corporate Architecture',
    category: 'Business',
    author: 'Sean Pollock',
  },
];

export const STOCK_CATEGORIES = [
  'All',
  'Roofing',
  'Construction',
  'HVAC',
  'Plumbing',
  'Solar',
  'Automotive',
  'Landscaping',
  'Business',
];
const CATEGORIES = STOCK_CATEGORIES;

export function searchUnsplashPhotos(query: string, category: string = 'All'): StockImage[] {
  return CURATED_STOCK_IMAGES.filter((img) => {
    const matchesCategory =
      !category || category === 'All' || img.category.toLowerCase() === category.toLowerCase();
    const q = (query || '').toLowerCase().trim();
    const matchesQuery =
      !q ||
      img.title.toLowerCase().includes(q) ||
      img.category.toLowerCase().includes(q) ||
      img.author.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });
}

export function ImagePickerModal({
  open,
  onOpenChange,
  value,
  onChange,
  title = 'Select or Upload Image',
}: ImagePickerModalProps) {
  const [activeTab, setActiveTab] = useState<'stock' | 'upload' | 'url'>('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [tempUrl, setTempUrl] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync tempUrl when modal opens with a value
  React.useEffect(() => {
    if (open) {
      setTempUrl(value || '');
    }
  }, [open, value]);

  // Filter stock images
  const filteredStockImages = CURATED_STOCK_IMAGES.filter((img) => {
    const matchesCategory =
      selectedCategory === 'All' || img.category.toLowerCase() === selectedCategory.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      img.title.toLowerCase().includes(q) ||
      img.category.toLowerCase().includes(q) ||
      img.author.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const handleSelectImage = (url: string) => {
    setTempUrl(url);
  };

  const handleApply = () => {
    if (tempUrl) {
      onChange(tempUrl);
      toast.success('Image applied!');
    }
    onOpenChange(false);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'form-images');
      formData.append('folder', 'builder');

      const res = await authFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          setTempUrl(data.url);
          toast.success('Image uploaded successfully!');
          return;
        }
      }

      // Fallback to FileReader base64 if server upload endpoint is unavailable in sandbox
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setTempUrl(result);
          toast.success('Image loaded locally');
        }
      };
      reader.readAsDataURL(file);
    } catch {
      // Fallback to FileReader data URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setTempUrl(result);
          toast.success('Image loaded locally');
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full rounded-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="p-4 sm:p-6 pb-3 border-b border-border/70 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <ImageIcon className="size-5 text-emerald-600" />
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Choose a royalty-free Unsplash photo, upload your own file, or paste an image URL.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-4 sm:p-6 pt-3 space-y-4">
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-3 h-9 bg-muted/60 p-1 rounded-xl shrink-0">
              <TabsTrigger value="stock" className="text-xs font-semibold gap-1.5 rounded-lg">
                <Sparkles className="size-3.5 text-amber-500" />
                <span>Stock Photos</span>
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-xs font-semibold gap-1.5 rounded-lg">
                <Upload className="size-3.5 text-blue-500" />
                <span>Upload File</span>
              </TabsTrigger>
              <TabsTrigger value="url" className="text-xs font-semibold gap-1.5 rounded-lg">
                <Link2 className="size-3.5 text-emerald-500" />
                <span>Direct URL</span>
              </TabsTrigger>
            </TabsList>

            {/* ─── TAB 1: STOCK PHOTOS ─── */}
            <TabsContent value="stock" className="flex-1 min-h-0 flex flex-col space-y-3 pt-3 overflow-hidden">
              {/* Search & Category Filter */}
              <div className="space-y-2 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search high-res stock photos (e.g. roof, construction, hvac, tools)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all',
                        selectedCategory === cat
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos Gallery Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1">
                {filteredStockImages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-xs space-y-2">
                    <ImageIcon className="size-8 mx-auto text-muted-foreground/40" />
                    <p>No stock photos matching "{searchQuery}"</p>
                    <Button size="sm" variant="outline" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
                      Reset filters
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredStockImages.map((img, idx) => {
                      const isSelected = tempUrl === img.url;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSelectImage(img.url)}
                          className={cn(
                            'group relative rounded-xl overflow-hidden border cursor-pointer aspect-video bg-muted transition-all',
                            isSelected
                              ? 'ring-2 ring-emerald-500 border-transparent shadow-md'
                              : 'border-border/70 hover:border-emerald-500/50 hover:shadow-xs'
                          )}
                        >
                          <img
                            src={img.thumbnail}
                            alt={img.title}
                            className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end text-white text-[10px]">
                            <p className="font-bold truncate">{img.title}</p>
                            <p className="text-white/70 text-[9px] truncate">Photo by {img.author}</p>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-md">
                              <Check className="size-3.5" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ─── TAB 2: UPLOAD FILE ─── */}
            <TabsContent value="upload" className="flex-1 flex flex-col justify-center items-center p-6 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md p-8 border-2 border-dashed border-border/80 hover:border-emerald-500/70 hover:bg-emerald-500/5 transition-all rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer text-center"
              >
                <div className="size-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shadow-xs">
                  {uploading ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">
                    {uploading ? 'Processing Image...' : 'Click to Upload or Drag & Drop'}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG, WebP, SVG up to 10MB
                  </p>
                </div>
                <Button size="sm" variant="outline" className="text-xs rounded-xl h-8" disabled={uploading}>
                  Browse Files
                </Button>
              </div>
            </TabsContent>

            {/* ─── TAB 3: DIRECT URL ─── */}
            <TabsContent value="url" className="flex-1 flex flex-col justify-center space-y-4 p-4">
              <div className="max-w-md mx-auto w-full space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Image URL</Label>
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Paste any public image link (Unsplash, Cloudinary, AWS S3, etc.)
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Active Preview Thumbnail Strip */}
          {tempUrl && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/70 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={tempUrl}
                  alt="Selected preview"
                  className="size-12 rounded-lg object-cover border border-border/80 shrink-0 bg-background"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">Selected Image</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate max-w-sm">{tempUrl}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setTempUrl('')}
                className="size-8 p-0 text-muted-foreground hover:text-rose-500 shrink-0"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/70 bg-background shrink-0 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!tempUrl}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl px-4"
          >
            Insert Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ImagePickerControl({
  value,
  onChange,
  label = 'Image',
  placeholder = 'Select or upload image...',
}: {
  value?: string;
  onChange: (val: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] font-semibold">{label}</Label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] text-muted-foreground hover:text-rose-500 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {value ? (
          <div
            onClick={() => setModalOpen(true)}
            className="group relative size-12 rounded-lg overflow-hidden border border-border/80 cursor-pointer shrink-0 bg-muted hover:border-emerald-500 transition-colors"
          >
            <img src={value} alt="Preview" className="size-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
              Change
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="size-12 rounded-lg border border-dashed border-border/80 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all flex flex-col items-center justify-center text-muted-foreground hover:text-emerald-600 shrink-0"
          >
            <ImageIcon className="size-4" />
          </button>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="h-8 text-xs font-mono bg-background truncate"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setModalOpen(true)}
            className="h-6 text-[10px] font-semibold gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
          >
            <Sparkles className="size-3" /> Stock &amp; Upload Picker
          </Button>
        </div>
      </div>

      <ImagePickerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        value={value || ''}
        onChange={onChange}
        title={`Choose ${label}`}
      />
    </div>
  );
}
