'use client';

import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Menu, X, Store, ShoppingCart, Package, Users, ReceiptText, CalendarDays, Globe, Megaphone, ChartNoAxesCombined, Sparkles, ShieldCheck, Clock3, HeartHandshake, Layers, Smartphone, Play, Zap } from 'lucide-react';
import styles from './landing.module.css';

const signup = '/bos-login?mode=register&redirect=%2F%3Fapp%3Dtrue';
const login = '/bos-login?redirect=%2F%3Fapp%3Dtrue';
const demo = '/?demo=true';
const industries = [
  ['grocery', 'Grocery & Kirana', 'Keep sales, stock and customer udhaar together.'],
  ['salon', 'Salon & Beauty', 'A little less admin. More time for your clients.'],
  ['clinic', 'Clinic & Wellness', 'Organize appointments, customers and payments.'],
  ['services', 'Service Business', 'Keep your jobs, bookings and billing in order.'],
  ['restaurant', 'Restaurant & Café', 'From the first order to the final bill.'],
];
const features = [
  [ShoppingCart, 'Sales & POS', 'Make counter billing simple, with your products and payment records in one place.'],
  [Package, 'Products & Inventory', 'Organize your catalog, track stock and keep an eye on low inventory.'],
  [Users, 'Customers & Khata', 'Know your customers. Keep a clear record of credit and collections.'],
  [ReceiptText, 'Invoices & Payments', 'Create invoices and follow up on outstanding customer balances.'],
  [CalendarDays, 'Appointments', 'Keep your bookings and daily schedule within easy reach.'],
  [Globe, 'Online Store', 'Give your business a storefront customers can browse and order from.'],
  [Megaphone, 'Offers & Promotions', 'Manage store offers and coupons alongside your catalog.'],
  [ChartNoAxesCombined, 'Reports & Insights', 'Review sales and activity to understand your business better.'],
] as const;
const benefits = [
  [Layers, 'One connected workspace', 'Bring your everyday business tasks together.'],
  [Zap, 'Made for everyday use', 'A clear interface that keeps work moving.'],
  [Clock3, 'Less time on admin', 'Spend more of your day with customers.'],
  [Smartphone, 'At the counter. On the go.', 'Access BOS on web and mobile.'],
  [ShieldCheck, 'A workspace for your team', 'Organize staff access around their work.'],
  [HeartHandshake, 'Built around your business', 'Choose the setup that fits how you operate.'],
] as const;

export function BosLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className={styles.page}>
    <a className={styles.skip} href="#main">Skip to content</a>
    <div className={styles.heroWash}>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="BOS home"><img src="/bos/logo-mark.png" width="42" height="42" alt=""/><span><b>BOS</b><small>Business Operating System</small></span></a>
        <nav className={`${styles.nav} ${menuOpen ? styles.navOpen : ''}`} aria-label="Main navigation">
          {['Features', 'Industries', 'Pricing'].map(item => <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMenuOpen(false)}>{item}</a>)}
          <a href="#questions" onClick={() => setMenuOpen(false)}>Resources <ChevronDown size={13}/></a>
        </nav>
        <div className={styles.headerActions}><a className={styles.login} href={login}>Login</a><a className={styles.button} href={signup}>Get Started <ArrowRight size={15}/></a></div>
        <button className={styles.menuButton} onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X/> : <Menu/>}</button>
      </header>
      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}><span className={styles.eyebrow}><span/> BIG POSSIBILITIES. SMALL BUSINESS SIMPLICITY.</span>
            <h1 id="hero-title">Run your entire<br/>business in <em>one place.</em></h1>
            <p>From your first sale to your next big step. Bring billing, inventory, customers and your online store together with BOS.</p>
            <ul className={styles.checks}><li><Check/>One workspace for your daily business</li><li><Check/>Made for shops, salons and service teams</li><li><Check/>Available on web and mobile</li></ul>
            <div className={styles.actions}><a className={styles.button} href={signup}>Get Started <ArrowRight size={18}/></a><a className={styles.secondary} href={demo}><Play size={16}/> Explore Live Demo</a></div>
            <div className={styles.heroNote}><ShieldCheck size={17}/> Explore the demo without creating an account</div>
          </div>
          <div className={styles.preview}>
            <div className={styles.previewTop}><span/><span/><span/><small>YOUR BUSINESS, AT A GLANCE</small></div>
            <img className={styles.dashboard} src="/bos/landing/dashboard.webp" width="1440" height="960" fetchPriority="high" alt="BOS demo dashboard showing sales, customers and recent orders"/>
            <div className={styles.phone}><div className={styles.phoneNotch}/><div className={styles.phoneBar}><Store size={18}/> BOS <span>Mobile</span></div><div className={styles.phoneBody}><small>YOUR BUSINESS, WITH YOU</small><h3>Good morning! ☀</h3><p>Let’s make it a great day.</p><div className={styles.phoneStat}><span>Today’s sales</span><strong>₹12,480</strong><small>Illustrative preview</small></div><div className={styles.phoneGrid}>{[[ShoppingCart,'Sales'],[Package,'Products'],[Users,'Customers'],[ReceiptText,'Invoices'],[CalendarDays,'Bookings'],[ChartNoAxesCombined,'Reports']].map(([Icon,label]) => {const I=Icon as typeof Store; return <div key={String(label)}><I size={19}/><span>{String(label)}</span></div>;})}</div><div className={styles.phoneActivity}><Check size={16}/><span>Everything in one place</span></div></div></div>
            <span className={styles.previewLabel}>BOS demo workspace · sample data</span>
          </div>
        </section>
      </main>
    </div>
    <section className={styles.businessStrip} aria-label="Business categories"><p>For the businesses that keep our neighbourhoods moving</p><div>{[[Store,'Local shops'],[Package,'Retail stores'],[HeartHandshake,'Salons & wellness'],[ShieldCheck,'Clinics'],[Zap,'Service teams']].map(([Icon,label])=>{const I=Icon as typeof Store;return <span key={String(label)}><I size={22}/>{String(label)}</span>;})}</div></section>
    <section className={styles.section} id="industries"><SectionTitle eyebrow="YOUR BUSINESS. YOUR WAY." title="Built for every kind of business" text="Whether you run a shop, salon, clinic or café, make BOS your own."/><div className={styles.industryGrid}>{industries.map(([id,title,text])=><a href={signup} className={styles.industryCard} key={id}><img src={`/bos/landing/${id}.webp`} width="1200" height="800" loading="lazy" alt={`${title} business`}/><div><h3>{title}<ArrowRight size={15}/></h3><p>{text}</p></div></a>)}</div></section>
    <section className={styles.section} id="features"><SectionTitle eyebrow="LESS JUGGLING. MORE DOING." title="Everything you need. Working together." text="Your everyday essentials, connected in one easy-to-use workspace."/><div className={styles.featureGrid}>{features.map(([Icon,title,text],i)=><article key={title} className={styles.featureCard}><span className={styles.featureIcon} data-tone={i%4}><Icon size={23}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section className={styles.aiSection} id="ai"><div className={styles.aiCopy}><span className={styles.eyebrow}><Sparkles size={17}/> MEET YOUR BUSINESS COPILOT</span><h2>A little help.<br/>A lot more possibility.</h2><p>Meet BOS AI Assistant. Ask questions in everyday language, explore ideas and draft content—all from your business workspace.</p><div className={styles.actions}><a className={styles.button} href="/?demo=true&view=aiAssistant">Explore BOS AI <ArrowRight size={17}/></a></div><small>AI responses should be reviewed before use.</small></div><div className={styles.chat}><div className={styles.chatHeader}><span><Sparkles size={19}/> BOS Assistant</span><small>Illustrative conversation</small></div><div className={styles.userBubble}>Help me welcome a new customer.</div><div className={styles.botBubble}><span className={styles.botIcon}><Sparkles size={16}/></span><div><p>Of course! Here’s a friendly starting point:</p><blockquote>“Welcome to our store! We’re happy you’re here. Let us know what you’re looking for—we’d love to help.”</blockquote><p>Make it your own by adding your store name and opening hours.</p></div></div><a href="/?demo=true&view=aiAssistant" className={styles.chatInput}>What can we work on today?<span><ArrowRight size={17}/></span></a></div></section>
    <section className={styles.section}><SectionTitle eyebrow="MADE FOR THE WAY YOU WORK" title="More business. Less busywork." text="Keep the big picture in view, without losing the little details."/><div className={styles.benefitGrid}>{benefits.map(([Icon,title,text])=><article key={title}><span><Icon size={25}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section className={`${styles.section} ${styles.pricing}`} id="pricing"><SectionTitle eyebrow="START WITH WHAT YOU NEED" title="Your next chapter starts here" text="Explore the workspace first. Review current pricing and availability when you sign up."/><div className={styles.planGrid}>{[
      ['Explore BOS','See how it works','Take a hands-on look before you decide.',['Interactive demo workspace','Sample business data','No account needed'],'Explore Demo',demo],
      ['Your Business','Make it your own','Create an account and discover your setup.',['Business-specific workspace','Sales, products and customers','Web and mobile access'],'Get Started',signup],
      ['Your Team','Work better together','Explore tools for your day-to-day team.',['Staff access settings','Shared business records','Connected daily workflows'],'Explore Team Features','/?demo=true&view=settings'],
    ].map(([name,headline,text,items,label,href],i)=><article className={styles.plan} data-featured={i===1} key={String(name)}>{i===1&&<span className={styles.planBadge}>YOUR BUSINESS, CONNECTED</span>}<small>{name}</small><h3>{headline}</h3><p>{text}</p><ul>{(items as string[]).map(item=><li key={item}><Check size={16}/>{item}</li>)}</ul><a className={i===1?styles.button:styles.secondary} href={String(href)}>{label}<ArrowRight size={16}/></a></article>)}</div><p className={styles.pricingNote}>Plan prices and feature availability are confirmed during onboarding. No payment is taken on this page.</p></section>
    <section className={`${styles.section} ${styles.faq}`} id="questions"><SectionTitle title="A few things you might be wondering" text="A simpler start for your business."/>{[
      ['Can I try BOS before signing up?','Yes. Open the live demo to explore the workspace with sample data, without creating an account.'],
      ['Which businesses can use BOS?','BOS offers workspace setups for retail and kirana shops, salons, clinics, restaurants and service businesses. Available features depend on your business setup and plan.'],
      ['Can I use BOS on my phone?','BOS has web and mobile experiences. Sign in to review the options available for your account.'],
      ['How do I get started?','Create an account, choose your business type and follow the setup flow. You can then add your products and customer records.'],
    ].map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={18}/></summary><p>{a}</p></details>)}</section>
    <section className={styles.cta}><img src="/bos/landing/owner.webp" width="1536" height="1024" loading="lazy" alt="Shop owner holding a tablet in his grocery store"/><div><span className={styles.eyebrow}>YOUR BUSINESS DESERVES A BETTER EVERYDAY</span><h2>Less to manage.<br/>More room to grow.</h2><p>Make your next business day a little simpler with BOS.</p><div className={styles.actions}><a className={styles.whiteButton} href={signup}>Get Started <ArrowRight size={17}/></a><a className={styles.lightButton} href={demo}><Play size={15}/> Explore Demo</a></div></div></section>
    <footer className={styles.footer}><div><a className={styles.brand} href="/"><img src="/bos/logo-mark.png" width="38" height="38" alt=""/><span><b>BOS</b><small>Business Operating System</small></span></a><p>One place for your business.<br/>More time for what matters.</p></div><div><h3>Product</h3><a href="#features">Features</a><a href="#industries">Industries</a><a href="#pricing">Getting started</a></div><div><h3>Explore</h3><a href={demo}>Live demo</a><a href="#ai">BOS AI Assistant</a><a href="#questions">Common questions</a></div><div><h3>Your workspace</h3><a href={login}>Login</a><a href={signup}>Create an account</a></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} BOS. All rights reserved.</span><span>Built for everyday business.</span></div></footer>
  </div>;
}

function SectionTitle({eyebrow,title,text}:{eyebrow?:string;title:string;text:string}) {return <div className={styles.sectionTitle}>{eyebrow&&<span className={styles.eyebrow}>{eyebrow}</span>}<h2>{title}</h2><p>{text}</p></div>;}
