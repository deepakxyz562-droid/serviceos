import { describe, it, expect } from 'vitest';
import {
  createDesign,
  validateDesign,
  createFieserosCampaignDesign,
  createCommercialPosterDesign,
  COMMERCIAL_THEMES,
  COMMERCIAL_THEME_KEYS,
  type CommercialTheme,
} from '../shared/marketing-design';
import { buildHighQualityImagePrompt } from '../src/lib/designs/image-provider';

const base = () =>
  createDesign({
    brand: 'A business',
    headline: 'Our services',
    subtitle: 'Contact us',
    badge: '',
    cta: 'Learn more',
    photo: 'https://images.unsplash.com/example',
  });

describe('editable marketing source documents', () => {
  it('validates the Fieseros AI Assistant 4:5 portrait campaign design', () => {
    const d = createFieserosCampaignDesign();
    expect(d.width).toBe(1080);
    expect(d.height).toBe(1350);
    expect(d.background).toBe('#062419');
    expect(validateDesign(d)).toEqual(d);
    expect(d.layers.some((l) => l.text === 'Less admin. More jobs.')).toBe(true);
    expect(d.layers.some((l) => l.id === 'cmd_text')).toBe(true);
  });

  it.each(['1:1', '4:5', '9:16', '16:9'])('round trips a %s document without losing layers', (ratio) => {
    const d = createDesign({
      brand: 'Business',
      headline: 'Hello',
      subtitle: 'Services',
      badge: 'New',
      cta: 'Contact',
      photo: '',
      ratio,
    });
    expect(validateDesign(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });

  it('rejects malformed geometry and duplicate layer IDs', () => {
    const d = base();
    d.layers[0].x = -1;
    expect(() => validateDesign(d)).toThrow();
    const b = base();
    b.layers.push(b.layers[0]);
    expect(() => validateDesign(b)).toThrow();
  });

  it('rejects executable and internal image URLs', () => {
    for (const src of ['javascript:alert(1)', 'file:///etc/passwd', 'http://127.0.0.1/a']) {
      const d = base();
      d.layers[0].src = src;
      expect(() => validateDesign(d)).toThrow();
    }
  });

  it('preserves independent image and text editing', () => {
    const d = base();
    const headline = d.layers.find((l) => l.id === 'headline')!;
    headline.text = 'Changed';
    const parsed = validateDesign(d);
    expect(parsed.layers[0].src).toBe(d.layers[0].src);
    expect(parsed.layers.find((l) => l.id === 'headline')!.text).toBe('Changed');
    parsed.layers[0].opacity = 1;
    expect(d.layers[0].opacity).toBe(0.3);
  });

  it('rejects unknown document versions', () =>
    expect(() => validateDesign({ ...base(), version: 2 })).toThrow());

  describe('commercial themes & style switching', () => {
    it('defines 5 commercial themes with complete color palettes', () => {
      expect(COMMERCIAL_THEME_KEYS).toEqual([
        'royal_gold',
        'luxe_dark',
        'rose_chic',
        'cyber_tech',
        'trust_amber',
      ]);
      for (const key of COMMERCIAL_THEME_KEYS) {
        const theme = COMMERCIAL_THEMES[key];
        expect(theme.name).toBeDefined();
        expect(theme.badgeBg).toMatch(/^#/);
        expect(theme.badgeText).toMatch(/^#/);
        expect(theme.ctaBg).toMatch(/^#/);
        expect(theme.scrimBg).toMatch(/^#/);
        expect(theme.footerBg).toMatch(/^#/);
      }
    });

    it.each(COMMERCIAL_THEME_KEYS)('applies theme %s to poster bottom scrim and footer', (themeKey) => {
      const design = createCommercialPosterDesign({
        brand: 'Test Store',
        headline: 'Huge Festival Offer',
        subtitle: 'Visit our flagship store',
        badge: '50% OFF',
        cta: 'SHOP NOW',
        theme: themeKey,
      });

      const scrim = design.layers.find((l) => l.id === 'bottom_scrim');
      expect(scrim).toBeDefined();
      expect(scrim?.background).toBe(COMMERCIAL_THEMES[themeKey].scrimBg);

      const footer = design.layers.find((l) => l.id === 'footer_bg');
      expect(footer).toBeDefined();
      expect(footer?.background).toBe(COMMERCIAL_THEMES[themeKey].footerBg);
    });
  });

  describe('domain-accurate commercial image prompt generation', () => {
    it('generates rich mithai photography for sweet shop business', () => {
      const prompt = buildHighQualityImagePrompt('Special 20% discount this weekend', {
        category: 'Sweets & Mithai Shop',
        businessName: 'Royal Sweets & Namkeen',
        products: 'Kaju Katli, Gulab Jamun, Motichoor Ladoo, Rasgulla',
      });
      expect(prompt.toLowerCase()).toMatch(/mithai|sweets|dessert|pistachio|cardamom|brass/);
      expect(prompt).toContain('ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS');
    });

    it('generates silk saree & bridal photography for clothing boutique', () => {
      const prompt = buildHighQualityImagePrompt('Exclusive wedding festive collection', {
        category: 'Women Ethnic Wear & Bridal Sarees',
        businessName: 'Vastra Boutique',
        products: 'Banarasi silk sarees, bridal lehengas, designer dupattas',
      });
      expect(prompt.toLowerCase()).toMatch(/saree|lehenga|silk|embroidery|mannequin|fashion/);
      expect(prompt).toContain('ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS');
    });

    it('generates fine jewellery photography on black velvet for jewellery showroom', () => {
      const prompt = buildHighQualityImagePrompt('Akshaya Tritiya Gold Offer', {
        category: 'Fine Jewellery & Diamonds',
        businessName: 'Tanishq Jewellers',
        products: '22K Gold Necklaces, Diamond Solitaires, Bridal Chokers',
      });
      expect(prompt.toLowerCase()).toMatch(/jewellery|gold|diamond|velvet|luxury/);
      expect(prompt).toContain('ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS');
    });

    it('generates modern tech workspace photography for IT & Software company', () => {
      const prompt = buildHighQualityImagePrompt('Transform your business with custom software', {
        category: 'IT Services & Cloud Solutions',
        businessName: 'Apex Cloud Systems',
        services: 'Web Development, Mobile Apps, Cloud Migration',
      });
      expect(prompt.toLowerCase()).toMatch(/software|code|tech|workstation|modern/);
      expect(prompt).toContain('ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS');
    });

    it('generates certified technician photography for HVAC and trade contractors', () => {
      const prompt = buildHighQualityImagePrompt('Emergency repair discount today', {
        category: 'HVAC & Plumbing Services',
        businessName: 'Apex Air Conditioning & Heating',
        services: 'AC Repair, Furnace Installation, Duct Cleaning',
      });
      expect(prompt.toLowerCase()).toMatch(/technician|hvac|tools|repair|equipment/);
      expect(prompt).toContain('ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS');
    });

    it('strips user web URLs and CTA commands from diffusion prompt', () => {
      const prompt = buildHighQualityImagePrompt(
        'Call now at 9876543210 or visit https://sweetshop.example.com/order to order now!',
        {
          category: 'Sweet Shop',
          businessName: 'Mithai Mahal',
        }
      );
      expect(prompt).not.toContain('https://sweetshop.example.com/order');
      expect(prompt).not.toContain('9876543210');
      expect(prompt).not.toContain('Call now');
      expect(prompt).toContain('ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS');
    });
  });
});
