'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, RefreshCw, Settings, Store } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { authFetch } from '@/lib/api';
import { BusinessBlueprintWizard } from '@/components/onboarding/business-blueprint-wizard';
import { MoneyPanel } from './money-panel';
import type { MoneyKind } from '../../../shared/money';
import type { ViewType } from '@/types/workflow';
import { getBusinessHome, homeText, homeMetricAction, HOME_DESTINATIONS, formatHomeMetric, type BusinessHomeSnapshot, type HomeAction, type HomeLanguage } from '../../../shared/business-home';

export function BusinessHomeView() {
  const { blueprint, auth, setBlueprint, setCurrentView } = useAppStore();
  const home = getBusinessHome(blueprint || { businessType: 'other' });
  const [snapshot, setSnapshot] = useState<BusinessHomeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [revision, setRevision] = useState(0);
  const [setup, setSetup] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [moneyKind,setMoneyKind] = useState<MoneyKind|null>(null);
  const language = home.language;
  useEffect(() => {
    const controller = new AbortController();
    setSnapshot(null); setLoading(true); setError(false); setSetupRequired(false);
    authFetch('/api/commerce/home', { signal: controller.signal })
      .then(async (response) => {
        if (response.status === 404 && !controller.signal.aborted) setSetupRequired(true);
        if (!response.ok) throw new Error('Home unavailable');
        const data = await response.json();
        if (!controller.signal.aborted) setSnapshot(data);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [auth.user?.id, auth.tenant?.id, blueprint?.businessType, blueprint?.version, revision]);

  const navigate = (action: HomeAction) => {
    if (['money_in','money_out','opening'].includes(action)) {
      setMoneyKind(action==='money_out'?'EXPENSE':action==='opening'?'OPENING':'COLLECTION');
      return;
    }
    const destination = HOME_DESTINATIONS[action];
    if (destination.tab) {
      sessionStorage.setItem('nuvora_commerce_tab', destination.tab);
      window.dispatchEvent(new CustomEvent('nuvora_switch_commerce_tab', { detail: destination.tab }));
    }
    setCurrentView(destination.view as ViewType);
  };
  const changeLanguage = async (value: HomeLanguage) => {
    setSavingLanguage(true);
    try {
      const response = await authFetch('/api/tenant/blueprint', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: value }) });
      if (!response.ok) throw new Error('Unable to save language');
      const data = await response.json();
      setBlueprint(data.blueprint);
    } catch { setError(true); }
    finally { setSavingLanguage(false); }
  };
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-24 md:p-8" lang={language}>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-muted-foreground">{homeText(home.type, language)}</p><h1 className="text-2xl font-bold">{blueprint?.businessName || auth.tenant?.name || homeText('home', language)}</h1></div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="home-language">{homeText('language', language)}</label>
          <select id="home-language" value={language} disabled={savingLanguage} onChange={(e) => void changeLanguage(e.target.value as HomeLanguage)} className="min-h-11 rounded-xl border bg-background px-3"><option value="en">English</option><option value="hi">हिन्दी</option></select>
          <button type="button" onClick={() => setSetup(true)} aria-label={homeText('setup', language)} className="rounded-xl border p-3"><Settings className="size-5" /></button>
        </div>
      </header>
      <BusinessBlueprintWizard open={setup} onOpenChange={setSetup} />
      {moneyKind&&<MoneyPanel initialKind={moneyKind} language={language} onClose={()=>setMoneyKind(null)} onSaved={()=>setRevision(v=>v+1)} />}
      {loading ? <p role="status" className="rounded-2xl border p-8">{homeText('loading', language)}</p> : error ? (
        <div role="alert" className="rounded-2xl border p-6"><p>{homeText(setupRequired ? 'setupRequired' : 'error', language)}</p><button type="button" className="mt-4 flex min-h-11 items-center gap-2" onClick={() => setupRequired ? setSetup(true) : setRevision((v) => v + 1)}><RefreshCw className="size-4" />{homeText(setupRequired ? 'setup' : 'retry', language)}</button></div>
      ) : (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label={homeText('home', language)}>
          {home.metrics.map((metric, index) => {
            const value = snapshot?.metrics[metric];
            const missing = value == null;
            const action = homeMetricAction(metric, snapshot?.salesSource);
            return <button type="button" disabled={missing || !action} onClick={() => { if (action) navigate(action); }} key={metric} className={`rounded-2xl border p-5 text-left ${index === 0 ? 'col-span-2 bg-emerald-950 text-white md:col-span-3' : 'bg-card'}`}>
              <p className={`text-sm ${index === 0 ? 'text-emerald-100' : 'text-muted-foreground'}`}>{homeText(metric, language)}</p>
              <p className={`mt-2 font-bold tabular-nums ${index === 0 ? 'text-4xl' : 'text-2xl'}`}>{formatHomeMetric(metric, value, snapshot?.currency || 'INR', language)}</p>
              {missing ? <p className="mt-2 text-xs opacity-70">{homeText('unavailable', language)}</p> : metric === 'sales' ? <p className="mt-2 text-xs opacity-70">{homeText(snapshot?.salesSource === 'invoices' ? 'invoiceScope' : 'orderScope', language)}</p> : metric === 'lowStock' ? <p className="mt-2 text-xs opacity-70">{homeText('stockScope', language)}</p> : null}
            </button>;
          })}
        </section>
      )}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {home.actions.filter((a) => a !== 'production').map((action) => <button key={action} type="button" onClick={() => navigate(action)} className="flex min-h-20 items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left font-semibold hover:border-emerald-500"><span>{homeText(action, language)}</span><ArrowRight className="size-4 shrink-0" /></button>)}
      </section>
      {home.type === 'manufacturing' && <p className="rounded-xl border p-4 text-sm text-muted-foreground">{homeText('workflowPending', language)}</p>}
      <footer className="flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-2"><Store className="size-4" />{snapshot?.date} · {snapshot?.timezone}</span><button type="button" onClick={() => setRevision((v) => v + 1)} className="min-h-11 px-3" aria-label={homeText('retry', language)}><RefreshCw className="size-4" /></button></footer>
    </main>
  );
}
