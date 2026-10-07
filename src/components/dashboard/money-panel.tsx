'use client';
import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { authFetch } from '@/lib/api';
import { MONEY_KINDS, RequestTracker, moneyKindText, type MoneyKind, type MoneySnapshot } from '../../../shared/money';

export function MoneyPanel({ initialKind, language, onSaved, onClose }: { initialKind: MoneyKind; language: 'en'|'hi'; onSaved: () => void; onClose: () => void }) {
  const [data,setData]=useState<MoneySnapshot|null>(null);
  const [kind,setKind]=useState(initialKind);
  const [amount,setAmount]=useState('');
  const [account,setAccount]=useState('CASH');
  const [person,setPerson]=useState('');
  const [reference,setReference]=useState('');
  const [reviewed,setReviewed]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState(false);
  const tracker=useRef(new RequestTracker());
  const t=(en:string,hi:string)=>language==='hi'?hi:en;
  useEffect(()=>{
    const controller=new AbortController();
    authFetch('/api/commerce/money',{signal:controller.signal}).then(async r=>{ if(!r.ok)throw new Error();return r.json(); }).then(d=>{if(!controller.signal.aborted){setData(d);if(d.initialized&&initialKind==='OPENING')setKind('MONEY_IN');}}).catch(()=>{if(!controller.signal.aborted)setError(true);});
    return()=>controller.abort();
  },[]);
  const save=async()=>{
    if(saving || !data)return;
    setSaving(true);setError(false);
    const payload={kind,amount:kind==='SUPPLIER_REVIEW'?0:amount,account,customerPhone:kind==='COLLECTION'||kind==='CREDIT_SALE'?person:undefined,supplierId:['SUPPLIER_BILL','SUPPLIER_PAYMENT'].includes(kind)?person:undefined,invoiceId:kind==='INVOICE_PAYMENT'?person:undefined,orderId:kind==='RECONCILE_ORDER'?person:undefined,reference,supplierReviewComplete:reviewed};
    try{
      const response=await authFetch('/api/commerce/money',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':tracker.current.for(payload)},body:JSON.stringify(payload)});
      if(!response.ok)throw new Error();
      tracker.current.clear();onSaved();onClose();
    }catch{setError(true);}finally{setSaving(false);}
  };
  return <Dialog open onOpenChange={open=>{if(!open&&!saving)onClose();}}><DialogContent className="max-h-[90vh] overflow-y-auto">
    <form className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-background p-6 shadow-xl" onSubmit={e=>{e.preventDefault();void save();}}>
      <DialogHeader><DialogTitle>{moneyKindText(kind,language)}</DialogTitle></DialogHeader>
      {error&&<p role="alert" className="text-red-700">{t('Entry not saved. Check the amount and dues, then retry.','रकम और बाकी पैसे जाँचें, फिर कोशिश करें। एंट्री सेव नहीं हुई।')}</p>}
      {!data?<p>{t('Loading accounts…','खाता लोड हो रहा है…')}</p>:<>
        <label className="block">{t('What is this for?','किसलिए?')}<select className="mt-1 min-h-12 w-full rounded-xl border bg-background p-3" value={kind} onChange={e=>{setKind(e.target.value as MoneyKind);setPerson('');}}>{MONEY_KINDS.filter(k=>k!=='ORDER_PAYMENT').map(k=><option key={k} value={k} disabled={k==='OPENING'&&data.initialized}>{moneyKindText(k,language)}</option>)}</select></label>
        {kind==='COLLECTION'&&<label className="block">{t('From whom?','किससे?')}<select required value={person} onChange={e=>setPerson(e.target.value)} className="min-h-12 w-full rounded-xl border bg-background p-3"><option value="">{t('Choose customer','ग्राहक चुनें')}</option>{data.customers.filter(c=>!c.needsReconciliation).map(c=><option key={c.phone} value={c.phone}>{c.name||c.phone} · {c.balance}</option>)}</select></label>}
        {kind==='CREDIT_SALE'&&<label>{t('Customer phone','ग्राहक का फोन')}<input required type="tel" value={person} onChange={e=>setPerson(e.target.value)} className="min-h-12 w-full rounded-xl border bg-background p-3" /></label>}
        {['SUPPLIER_BILL','SUPPLIER_PAYMENT'].includes(kind)&&<label className="block">{t('Supplier','सप्लायर')}<select required value={person} onChange={e=>setPerson(e.target.value)} className="min-h-12 w-full rounded-xl border bg-background p-3"><option value="">{t('Choose supplier','सप्लायर चुनें')}</option>{data.suppliers.map(s=><option key={s.id} value={s.id}>{s.name} · {s.balance}</option>)}</select></label>}
        {kind==='INVOICE_PAYMENT'&&<label>{t('Invoice','बिल')}<select required value={person} onChange={e=>setPerson(e.target.value)} className="min-h-12 w-full rounded-xl border bg-background p-3"><option value="">{t('Choose invoice','बिल चुनें')}</option>{(data.invoices||[]).map(i=><option key={i.id} value={i.id}>{i.number} · {i.balance}</option>)}</select></label>}
        {kind==='RECONCILE_ORDER'&&<label className="block">{t('Bill to review','कौन सा बिल जाँचना है?')}<select required value={person} onChange={e=>setPerson(e.target.value)} className="min-h-12 w-full rounded-xl border bg-background p-3"><option value="">{t('Choose bill','बिल चुनें')}</option>{data.reviewOrders.map(o=><option key={o.id} value={o.id}>{o.name||o.id} · {o.total}</option>)}</select></label>}
        <label className="block">{kind==='RECONCILE_ORDER'?t('Amount already paid','पहले दिए पैसे'):t('Amount','रकम')}<input required={kind!=='SUPPLIER_REVIEW'} inputMode="decimal" type="number" min={kind==='OPENING'||kind==='RECONCILE_ORDER'?0:0.01} step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="min-h-12 w-full rounded-xl border bg-background p-3" /></label>
        <label className="block">{t('Account','खाता')}<select value={account} onChange={e=>setAccount(e.target.value)} className="min-h-12 w-full rounded-xl border bg-background p-3"><option value="CASH">{t('Cash','नकद')}</option><option value="BANK">{t('Bank / UPI / Card','बैंक / UPI / कार्ड')}</option></select></label>
        <label className="block">{kind==='SUPPLIER_BILL'?t('Bill number','बिल नंबर'):t('Note (optional)','नोट (ज़रूरी नहीं)')}<input required={kind==='SUPPLIER_BILL'} maxLength={200} value={reference} onChange={e=>setReference(e.target.value)} className="min-h-12 w-full rounded-xl border bg-background p-3" /></label>
        {(kind==='OPENING'||kind==='SUPPLIER_REVIEW')&&<label className="flex gap-3"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)} />{t('All outstanding supplier bills have been entered.','सप्लायर के सभी बाकी बिल दर्ज कर दिए हैं।')}</label>}
        {data.reviewOrders.length>0&&<p className="text-sm">{t('Some old partial payments need review before collection.','पैसे लेने से पहले कुछ पुराने आंशिक भुगतान जाँचना ज़रूरी है।')}</p>}
        <button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl bg-emerald-700 p-3 font-semibold text-white">{saving?'…':t('Save','सेव करें')}</button>
      </>}
      <button type="button" disabled={saving} onClick={onClose} className="min-h-12 w-full p-3">{t('Close','बंद करें')}</button>
    </form>
  </DialogContent></Dialog>;
}
