import React, {useState} from 'react';
import {Alert, AppState, NativeModules, Pressable, Text, View} from 'react-native';
import {captureSupported,captureAccounts,enableCapture,disableCapture,syncCapturedCalls,PhoneAccount} from '../../lib/call-capture';
export function CaptureSettings({onSynced}:{onSynced:()=>void}) {
  const [accounts,setAccounts]=useState<PhoneAccount[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('Capture business-SIM calls on this device. Saved calls sync online; reopen BGOS if your session expires.');
  async function sync() { try { const n=await syncCapturedCalls(); if(n) onSynced(); const status=await NativeModules.BgosCallTracking.getTrackingStatus(); setMessage(status.syncError || (status.enabled ? "Business SIM capture is enabled. Calls sync online while your session is valid." : "Capture is off. Choose a business SIM to begin.")); } catch { setMessage('Calls are saved on this device. Open BGOS online to retry syncing.'); } }
  React.useEffect(()=>{if(!captureSupported)return; void sync(); const sub=AppState.addEventListener('change',state=>{if(state==='active')void sync();}); const timer=setInterval(()=>void sync(),30000); return()=>{sub.remove();clearInterval(timer);};},[]);
  if (!captureSupported) return null;
  async function choose() {
    setBusy(true);
    try { const list=await captureAccounts(); setAccounts(list); if(!list.length)setMessage('No supported SIM accounts found. Manual logging remains available.'); }
    catch(e){setMessage(e instanceof Error?e.message:'Tracking unavailable');} finally {setBusy(false);}
  }
  return <View style={{padding:16,borderRadius:16,backgroundColor:'#ECFDF5',gap:10}}>
    <Text style={{fontWeight:'700',color:'#064E3B'}}>Business call capture · Android</Text>
    <Text style={{color:'#334155'}}>{message}</Text>
    <Pressable disabled={busy} accessibilityRole="button" onPress={()=>Alert.alert('Enable business call capture?', 'BGOS reads call history for the SIM you choose and stores call numbers, dates, types and durations for your CRM. Personal SIMs are excluded. No audio is recorded. Stop capture at any time.',[{text:'Cancel',style:'cancel'},{text:'Choose business SIM',onPress:()=>void choose()}])}><Text style={{color:'#047857',fontWeight:'700'}}>{busy?'Loading…':'Choose business SIM'}</Text></Pressable>
    {accounts.map(a=><Pressable key={a.id} accessibilityRole="button" onPress={async()=>{try{await enableCapture(a.id);setAccounts([]);setMessage(`Capture enabled for ${a.label}. Calls sync online while your session is valid.`);}catch{setMessage('Could not enable capture. Please retry.');}}}><Text style={{paddingVertical:10}}>{a.label}</Text></Pressable>)}
    <Pressable accessibilityRole="button" onPress={()=>void sync()}><Text>Sync saved calls</Text></Pressable>
    <Pressable accessibilityRole="button" onPress={()=>Alert.alert('Stop capture?', 'This removes unsynced calls from this device. Calls already saved to your CRM are kept.',[{text:'Cancel',style:'cancel'},{text:'Stop and clear',style:'destructive',onPress:()=>{void disableCapture().then(()=>setMessage('Capture stopped.')).catch(()=>setMessage('Could not stop capture. Please retry.'));}}])}><Text>Stop capture</Text></Pressable>
  </View>;
}
