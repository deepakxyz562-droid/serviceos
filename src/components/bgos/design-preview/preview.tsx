'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart3, Bell, Bot, CalendarDays, ChevronDown, ChevronRight, CircleHelp, Command, FileText, Globe, LayoutDashboard, Menu, MessageSquare, Phone, Search, Settings, Sparkles, Star, Users, Workflow, X, type LucideIcon } from 'lucide-react';
import { INITIAL_LEADS } from './fixtures';
import { Avatar, Modal } from './primitives';
import { CrmPreview } from './crm';
import { InboxPreview, MarketingPreview, Overview } from './workspaces';
import { SupportingPreview } from './supporting-pages';
import './preview.css';

const sections: { title: string; items: { label: string; icon: LucideIcon; count?: string }[] }[] = [
  { title: 'WORKSPACE', items: [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Business profile', icon: Globe }, { label: 'Leads & CRM', icon: Users }, { label: 'Inbox', icon: MessageSquare, count: '3' }, { label: 'Appointments', icon: CalendarDays }] },
  { title: 'GROW YOUR BUSINESS', items: [{ label: 'Marketing studio', icon: Sparkles }, { label: 'Lead intelligence', icon: Search }, { label: 'Reviews & Google growth', icon: Star }, { label: 'AI studio', icon: Bot }, { label: 'Forms & funnels', icon: FileText }, { label: 'Automations', icon: Workflow }] },
  { title: 'MANAGE', items: [{ label: 'Business phone', icon: Phone }, { label: 'Reports', icon: BarChart3 }, { label: 'Settings', icon: Settings }] },
];
const pages = sections.flatMap(section => section.items);

export function BgosDesignPreview() {
  const [page, setPage] = useState('Overview');
  const [leads, setLeads] = useState(INITIAL_LEADS);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [panel, setPanel] = useState<string | null>(null);
  const main = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const sync = () => { const value = new URLSearchParams(window.location.search).get('page'); setPage(value && pages.some(p => p.label === value) ? value : 'Overview'); };
    sync(); window.addEventListener('popstate', sync);
    return () => { window.removeEventListener('popstate', sync); if (timer.current) clearTimeout(timer.current); };
  }, []);
  function go(next: string) {
    setPage(next); setMobileNav(false); setSearch('');
    const url = new URL(window.location.href); url.searchParams.set('page', next); window.history.pushState({}, '', url);
    main.current?.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
  }
  function notify(message: string) {
    setToast(message); if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 6500);
  }
  return <div className="bgos-design">
    <a href="#dp-content" className="dp-skip">Skip to content</a>
    {mobileNav && <button className="dp-mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
    <aside className={`dp-sidebar ${mobileNav ? 'open' : ''}`}>
      <a href="/design-preview" className="dp-brand" onClick={e => { e.preventDefault(); go('Overview'); }}><span className="dp-brand-mark">b</span>BGOS<span className="dp-brand-caption">GROWTH OS</span></a>
      <button className="dp-workspace-switch" onClick={() => setPanel('Sample workspace')}><span className="dp-business-avatar">LK</span><span><strong>Laddu Kirana</strong><small>Your growth workspace</small></span><ChevronDown size={14} /></button>
      <nav aria-label="BGOS main navigation">{sections.map(section => <div className="dp-nav-group" key={section.title}><p>{section.title}</p>{section.items.map(({ label, icon: Icon, count }) => <button key={label} onClick={() => go(label)} aria-current={page === label ? 'page' : undefined} className={page === label ? 'active' : ''}><Icon size={17} /><span>{label}</span>{count && <small>{count}</small>}</button>)}</div>)}</nav>
      <div className="dp-sidebar-bottom"><button className="dp-help" onClick={() => setPanel('About this preview')}><CircleHelp size={17} /><span>Help & design notes</span><ChevronRight size={14} /></button><button className="dp-user" onClick={() => setPanel('Sample workspace')}><Avatar initials="RS" /><span><strong>Rohit Sharma</strong><small>Workspace owner</small></span><ChevronDown size={14} /></button></div>
    </aside>
    <div className="dp-main-shell"><header className="dp-topbar"><button className="dp-icon-button dp-menu" aria-label="Open navigation" aria-expanded={mobileNav} onClick={() => setMobileNav(!mobileNav)}><Menu size={21} /></button><div className="dp-global-search"><label><Search size={17} /><input aria-label="Find a BGOS page" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a page in your workspace…" /><kbd>⌕</kbd></label>{search && <div className="dp-search-results">{pages.filter(p => p.label.toLowerCase().includes(search.toLowerCase())).map(({ label, icon: Icon }) => <button key={label} onClick={() => go(label)}><Icon size={16} />{label}<ChevronRight size={14} /></button>)}{!pages.some(p => p.label.toLowerCase().includes(search.toLowerCase())) && <p>No matching pages.</p>}</div>}</div><div className="dp-topbar-actions"><span className="dp-topbar-date">Sat, 10 Oct</span><button className="dp-icon-button" aria-label="Preview notifications" onClick={() => setPanel('Notifications')}><Bell size={18} /><span className="dp-notification-dot" /></button><span className="dp-topbar-divider" /><button aria-label="Rohit Sharma account" className="dp-topbar-user" onClick={() => setPanel('Sample workspace')}><Avatar initials="RS" small /><span>Rohit Sharma</span><ChevronDown size={13} /></button></div></header>
      <div className="dp-preview-strip"><span><span className="dp-preview-dot" />DESIGN PREVIEW</span><p>Sample data only · Changes reset on reload · No messages or payments are sent</p><button onClick={() => setPanel('About this preview')}>What’s interactive? <ChevronRight size={12} /></button></div>
      <main id="dp-content" tabIndex={-1} ref={main} className="dp-content"><div className="dp-page-inner" key={page}>{page === 'Overview' ? <Overview leads={leads} go={go} /> : page === 'Leads & CRM' ? <CrmPreview leads={leads} setLeads={setLeads} notify={notify} openInbox={() => go('Inbox')} /> : page === 'Marketing studio' ? <MarketingPreview notify={notify} /> : page === 'Inbox' ? <InboxPreview leads={leads} notify={notify} /> : <SupportingPreview page={page} notify={notify} />}<footer className="dp-page-footer"><span>BGOS · A little more growth, every day.</span><span>Design concept / October 2026</span></footer></div></main>
    </div>
    {toast && <div className="dp-toast" role="status"><span>{toast}</span><button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16} /></button></div>}
    {panel && <Modal title={panel} onClose={() => setPanel(null)}>{panel === 'About this preview' ? <><p className="dp-muted">A clickable design concept based on your reference, built with reusable React components. Leads & CRM is a first-class workspace section.</p><ul className="dp-note-list"><li><strong>Leads & CRM:</strong> add sample leads, search/filter, switch pipeline/table, change stages and owners, save notes and export sample CSV.</li><li><strong>Inbox:</strong> switch conversations, preview replies and toggle AI takeover.</li><li><strong>Marketing:</strong> explore the content calendar and save a sample post draft.</li><li><strong>Other pages:</strong> initial layouts with local controls. Detailed builders, channel connections and data mapping follow the visual review.</li><li><strong>Product boundaries:</strong> no store, POS, inventory, orders or accounting pages.</li></ul><p className="dp-helper">This is a visual prototype, not a production-readiness demonstration.</p></> : panel === 'Notifications' ? <><p className="dp-muted">Illustrative notifications</p>{['Priya Singh joined your lead pipeline', 'Your festive post is ready to review', 'You have 3 reviews awaiting a reply'].map(n => <div className="dp-activity-row" key={n}><span className="dp-icon-tile"><Bell size={17} /></span><p>{n}</p></div>)}</> : <><div className="dp-person"><Avatar initials="RS" /><div><h3>Rohit Sharma</h3><p>Owner · Laddu Kirana</p></div></div><p className="dp-muted dp-subheading">This identity is fictional sample data. The preview does not read or change your authenticated session.</p><button className="dp-button" onClick={() => { setPanel(null); go('Settings'); }}>View workspace settings</button></>}</Modal>}
  </div>;
}
