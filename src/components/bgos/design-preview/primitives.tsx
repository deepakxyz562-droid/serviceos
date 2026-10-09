'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight, X, type LucideIcon } from 'lucide-react';

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`dp-badge ${tone}`}>{children}</span>;
}
export function Avatar({ initials, small = false }: { initials: string; small?: boolean }) {
  return <span aria-hidden="true" className={`dp-avatar ${small ? 'small' : ''} tone-${initials.charCodeAt(0) % 4}`}>{initials}</span>;
}
export function Stat({ label, value, change, icon: Icon }: { label: string; value: ReactNode; change: string; icon: LucideIcon }) {
  return <div className="dp-card dp-stat"><div className="dp-between"><span>{label}</span><Icon size={17} /></div><strong>{value}</strong><small><ArrowUpRight size={13} />{change}</small></div>;
}
export function Tabs({ values, value, onChange, label = 'View' }: { values: string[]; value: string; onChange: (value: string) => void; label?: string }) {
  return <div className="dp-tabs" role="group" aria-label={label}>{values.map(item => <button type="button" key={item} aria-pressed={value === item} className={item === value ? 'active' : ''} onClick={() => onChange(item)}>{item}</button>)}</div>;
}
export function Modal({ title, children, onClose, drawer = false }: { title: string; children: ReactNode; onClose: () => void; drawer?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={`dp-dialog ${drawer ? 'drawer' : ''}`} aria-label={title} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dp-dialog-body"><div className="dp-between dp-dialog-heading"><h2>{title}</h2><button className="dp-icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div>{children}</div>
  </dialog>;
}
export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="dp-between dp-section-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="dp-empty"><h3>{title}</h3><p>{detail}</p></div>;
}
