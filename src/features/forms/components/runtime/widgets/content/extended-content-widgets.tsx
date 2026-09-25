'use client';

/**
 * Extended Content Widget Runtime Components
 *
 * Runtime components for the Elementor basic widgets:
 *   Video, Image Box, Icon Box, Counter, Testimonial,
 *   Progress Bar, Social Icons, HTML, Accordion
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';
import { Star } from 'lucide-react';

// ─── Video Widget ─────────────────────────────────────────────────────

export function VideoWidget(props: { [key: string]: any }) {
  const { src, videoType, aspectRatio, autoplay, loop, muted, controls } = props;
  if (!src) return <div className="w-full h-32 bg-muted/30 rounded-lg flex items-center justify-center text-xs text-muted-foreground">No video URL set</div>;

  const ratioMap: Record<string, string> = { '16:9': '56.25%', '4:3': '75%', '1:1': '100%', '9:16': '177.78%' };
  const paddingTop = ratioMap[aspectRatio || '16:9'] || '56.25%';
  const params = new URLSearchParams({ autoplay: autoplay ? '1' : '0', loop: loop ? '1' : '0', muted: muted ? '1' : '0', controls: controls ? '1' : '0' });

  if (videoType === 'youtube') {
    let videoId = '';
    if (src.includes('watch?v=')) videoId = src.split('watch?v=')[1]?.split('&')[0] || '';
    else if (src.includes('youtu.be/')) videoId = src.split('youtu.be/')[1]?.split('?')[0] || '';
    else if (src.includes('embed/')) videoId = src.split('embed/')[1]?.split('?')[0] || '';
    return <div style={{ position: 'relative', width: '100%', paddingTop }}><iframe src={`https://www.youtube.com/embed/${videoId}?${params}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen /></div>;
  }
  if (videoType === 'vimeo') {
    const videoId = src.split('vimeo.com/')[1]?.split('?')[0] || '';
    return <div style={{ position: 'relative', width: '100%', paddingTop }}><iframe src={`https://player.vimeo.com/video/${videoId}?${params}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen /></div>;
  }
  return <video src={src} autoPlay={autoplay} loop={loop} muted={muted} controls={controls} style={{ width: '100%', borderRadius: '8px' }} />;
}

// ─── Image Box Widget ─────────────────────────────────────────────────

export function ImageBoxWidget(props: { [key: string]: any }) {
  const { imageSrc, title, description, alignment, gap, imageWidth, imageHeight, imageRadius, titleColor, descColor, fontSize } = props;
  const alignClass = alignment === 'left' ? 'flex-row' : alignment === 'right' ? 'flex-row-reverse' : 'flex-col items-center';
  return (
    <div className={cn('flex w-full gap-3', alignClass)} style={{ gap: gap || '12px' }}>
      {imageSrc && <img src={imageSrc} alt={title || ''} style={{ width: imageWidth || '80px', height: imageHeight || '80px', borderRadius: imageRadius || '8px', objectFit: 'cover' }} />}
      <div className="flex-1 text-center">
        {title && <h4 className="font-bold text-sm mb-1" style={{ color: titleColor || undefined }}>{title}</h4>}
        {description && <p className="text-muted-foreground" style={{ fontSize: fontSize || '14px', color: descColor || undefined }}>{description}</p>}
      </div>
    </div>
  );
}

// ─── Icon Box Widget ──────────────────────────────────────────────────

export function IconBoxWidget(props: { [key: string]: any }) {
  const { icon, title, description, iconColor, iconSize, titleColor, descColor, fontSize, alignment, gap } = props;
  const IconComp = (LucideIcons as any)[icon || 'Box'] || LucideIcons.Box;
  const alignClass = alignment === 'left' ? 'flex-row' : alignment === 'right' ? 'flex-row-reverse' : 'flex-col items-center';
  return (
    <div className={cn('flex w-full', alignClass)} style={{ gap: gap || '12px' }}>
      <IconComp size={iconSize || 40} color={iconColor || '#059669'} />
      <div className="flex-1 text-center">
        {title && <h4 className="font-bold text-sm mb-1" style={{ color: titleColor || undefined }}>{title}</h4>}
        {description && <p className="text-muted-foreground" style={{ fontSize: fontSize || '14px', color: descColor || undefined }}>{description}</p>}
      </div>
    </div>
  );
}

// ─── Counter Widget ──────────────────────────────────────────────────

export function CounterWidget(props: { [key: string]: any }) {
  const { value, prefix, suffix, title, duration, numberColor, titleColor, fontSize, titleFontSize, alignment } = props;
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        const target = Number(value || 0);
        const steps = 60;
        const stepDuration = (duration || 2000) / steps;
        let current = 0;
        const increment = target / steps;
        const interval = setInterval(() => {
          current += increment;
          if (current >= target) {
            setDisplayValue(target);
            clearInterval(interval);
          } else {
            setDisplayValue(Math.floor(current));
          }
        }, stepDuration);
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  const alignClass = alignment === 'left' ? 'text-left' : alignment === 'right' ? 'text-right' : 'text-center';
  return (
    <div className={cn('w-full', alignClass)}>
      <div ref={ref} className="font-black" style={{ color: numberColor || '#059669', fontSize: fontSize || '32px' }}>
        {prefix}{displayValue.toLocaleString()}{suffix}
      </div>
      {title && <p className="text-muted-foreground mt-1" style={{ color: titleColor || undefined, fontSize: titleFontSize || '14px' }}>{title}</p>}
    </div>
  );
}

// ─── Testimonial Widget ───────────────────────────────────────────────

export function TestimonialWidget(props: { [key: string]: any }) {
  const { text, author, role, avatar, rating, textColor, authorColor, fontSize, bgColor, borderRadius, padding, alignment } = props;
  const alignClass = alignment === 'center' ? 'text-center' : 'text-left';
  return (
    <div className={cn('w-full', alignClass)} style={{ backgroundColor: bgColor || undefined, borderRadius: borderRadius || '12px', padding: padding || '24px' }}>
      {rating > 0 && (
        <div className={cn('flex gap-0.5 mb-3', alignment === 'center' ? 'justify-center' : 'justify-start')}>
          {[...Array(5)].map((_, i) => <Star key={i} className={cn('size-4', i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300')} />)}
        </div>
      )}
      <p className="leading-relaxed mb-4" style={{ color: textColor || undefined, fontSize: fontSize || '14px' }}>{text}</p>
      <div className="flex items-center gap-2" style={{ justifyContent: alignment === 'center' ? 'center' : 'flex-start' }}>
        {avatar && <img src={avatar} alt={author || ''} className="size-8 rounded-full object-cover" />}
        <div>
          {author && <p className="font-bold text-xs" style={{ color: authorColor || undefined }}>{author}</p>}
          {role && <p className="text-[10px] text-muted-foreground">{role}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Progress Bar Widget ─────────────────────────────────────────────

export function ProgressBarWidget(props: { [key: string]: any }) {
  const { value, label, barColor, trackColor, textColor, fontSize, height, borderRadius, showLabel, showPercentage } = props;
  return (
    <div className="w-full">
      {(showLabel || showPercentage) && (
        <div className="flex items-center justify-between mb-1.5" style={{ fontSize: fontSize || '14px', color: textColor || undefined }}>
          {showLabel && <span>{label}</span>}
          {showPercentage && <span className="font-bold">{value}%</span>}
        </div>
      )}
      <div className="w-full overflow-hidden" style={{ backgroundColor: trackColor || '#e2e8f0', height: height || '8px', borderRadius: borderRadius || '4px' }}>
        <div className="h-full transition-all duration-1000 ease-out" style={{ width: `${value}%`, backgroundColor: barColor || '#059669', borderRadius: borderRadius || '4px' }} />
      </div>
    </div>
  );
}

// ─── Social Icons Widget ──────────────────────────────────────────────

export function SocialIconsWidget(props: { [key: string]: any }) {
  const { items, iconSize, iconColor, iconHoverColor, gap, alignment, bgColor, padding, borderRadius } = props;
  const [hovered, setHovered] = useState<string | null>(null);
  const platformIcons: Record<string, any> = {
    facebook: LucideIcons.Facebook, twitter: LucideIcons.Twitter, instagram: LucideIcons.Instagram,
    linkedin: LucideIcons.Linkedin, youtube: LucideIcons.Youtube, github: LucideIcons.Github,
  };
  const iconList = Array.isArray(items) ? items : [
    { platform: 'facebook', url: '#' }, { platform: 'twitter', url: '#' }, { platform: 'instagram', url: '#' },
  ];
  const alignClass = alignment === 'left' ? 'justify-start' : alignment === 'right' ? 'justify-end' : 'justify-center';
  return (
    <div className={cn('flex w-full items-center', alignClass)} style={{ backgroundColor: bgColor || undefined, padding: padding || '0', borderRadius: borderRadius || '0', gap: gap || '12px' }}>
      {iconList.map((item: any, idx: number) => {
        const Icon = platformIcons[item.platform] || LucideIcons.Globe;
        return (
          <a key={idx} href={item.url || '#'} target="_blank" rel="noopener noreferrer"
            onMouseEnter={() => setHovered(idx + '')} onMouseLeave={() => setHovered(null)}
            style={{ color: hovered === idx + '' ? (iconHoverColor || '#059669') : (iconColor || '#64748b'), transition: 'color 0.2s' }}>
            <Icon size={iconSize || 20} />
          </a>
        );
      })}
    </div>
  );
}

// ─── HTML Widget ──────────────────────────────────────────────────────

export function HtmlWidget(props: { [key: string]: any }) {
  const { html } = props;
  // Basic sanitization: strip <script> tags
  const sanitized = (html || '').replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '').replace(/\son\w+='[^']*'/gi, '').replace(/javascript:/gi, '');
  return <div className="w-full" dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ─── Accordion Widget ─────────────────────────────────────────────────

export function AccordionWidget(props: { [key: string]: any }) {
  const { items, defaultOpen, titleColor, textColor, titleBgColor, contentBgColor, fontSize, borderColor, borderRadius, gap } = props;
  const [openIndex, setOpenIndex] = useState<number>(defaultOpen ?? 0);

  // Parse items: "Question|Answer" format, one per line
  const parsedItems = (typeof items === 'string' ? items : '').split('\n').filter(Boolean).map(line => {
    const [q, a] = line.split('|');
    return { question: (q || '').trim(), answer: (a || '').trim() };
  });

  return (
    <div className="w-full space-y-2" style={{ gap: gap || '8px' }}>
      {parsedItems.map((item, idx) => (
        <div key={idx} style={{ border: `1px solid ${borderColor || '#e2e8f0'}`, borderRadius: borderRadius || '8px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setOpenIndex(openIndex === idx ? -1 : idx)}
            className="w-full flex items-center justify-between p-3 text-left font-semibold transition-colors hover:bg-muted/30"
            style={{ fontSize: fontSize || '14px', color: titleColor || undefined, backgroundColor: titleBgColor || undefined }}
          >
            <span>{item.question}</span>
            <LucideIcons.ChevronDown className={cn('size-4 shrink-0 transition-transform', openIndex === idx && 'rotate-180')} />
          </button>
          {openIndex === idx && (
            <div className="p-3 border-t" style={{ backgroundColor: contentBgColor || undefined, color: textColor || undefined, fontSize: fontSize || '14px' }}>
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
