'use client';
import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { authHeaders } from '@/lib/client-auth';
import { BosLanding } from './bos-landing';
const Workspace = dynamic(() => import('@/components/bos/bos-web-app').then(m => m.BosWebApp), { loading: () => <p role="status" style={{padding:40}}>Opening your BOS workspace…</p> });
function Entry() {
 const params = useSearchParams();
 const demo = params.get('demo') === 'true' || params.get('mode') === 'demo';
 const requested = params.get('app') === 'true' || params.has('view') || params.has('tab') || params.get('google_login') === 'success';
 const landing = params.get('landing') === 'true' || params.has('logout');
 const [authenticated,setAuthenticated] = useState(false);
 useEffect(() => {
  if (demo || requested || landing) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(),8000);
  fetch('/api/auth/me',{headers:authHeaders(),credentials:'include',signal:controller.signal})
   .then(async response => response.ok ? response.json() : null)
   .then(data => {if(!controller.signal.aborted && (data?.user?.id || data?.data?.user?.id)) setAuthenticated(true);})
   .catch(() => {}).finally(() => clearTimeout(timer));
  return () => {controller.abort();clearTimeout(timer);};
 },[demo,requested,landing]);
 return demo || requested || (authenticated && !landing) ? <Workspace demoMode={demo} initialView={params.get('view') || params.get('tab') || undefined}/> : <BosLanding/>;
}
export default function BosEntry(){return <Suspense fallback={<BosLanding/>}><Entry/></Suspense>;}
