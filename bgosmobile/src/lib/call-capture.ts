import { API_BASE_URL } from './constants';
import { NativeModules, Platform, PermissionsAndroid } from 'react-native';
import { apiRequest } from './api';
import { getSavedUser, getToken, sessionRevision } from './auth';
const native = NativeModules.BgosCallTracking;
export const captureSupported = Platform.OS === 'android' && Boolean(native);
export type PhoneAccount = {id:string;label:string};
async function owner() {
  const user = await getSavedUser();
  if (!user?.tenantId || !user.id) throw new Error('Sign in to a business workspace first.');
  return `${user.tenantId}:${user.workspaceId || ''}:${user.id}`;
}
export async function captureAccounts(): Promise<PhoneAccount[]> {
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE, PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  ]);
  if (Object.values(granted).some(v=>v!==PermissionsAndroid.RESULTS.GRANTED)) throw new Error('Phone and call history access are required. You can still log calls manually.');
  return native.getPhoneAccounts();
}
export async function enableCapture(account: string) { await native.configureCapture(await owner(),account,true); await syncCapturedCalls(); }
export async function disableCapture() { if (native) await native.clearCapture(); }
let syncing: Promise<number> | null = null;
export function syncCapturedCalls(): Promise<number> {
  if (!captureSupported) return Promise.resolve(0);
  if (syncing) return syncing;
  syncing = (async()=>{
    const revision = sessionRevision();
    const identity = await owner();
    const token = await getToken();
    if (token && API_BASE_URL.startsWith("https://")) await native.updateCaptureSession(identity,token,API_BASE_URL);
    const records = JSON.parse(await native.pendingCalls(identity)) as Array<{sourceEventId:string;customerPhone:string;timestamp:number;durationSec:number;callType:string}>;
    let count=0;
    for (const item of records) {
      if (revision!==sessionRevision() || identity!==await owner()) break;
      await apiRequest('/api/calls',{method:'POST',body:{
        ...item,captureSource:'android_sim',createLead:false,
        startedAt:new Date(item.timestamp).toISOString(),

        outcomeType:item.callType==='missed'?'missed':item.callType==='rejected'?'rejected':item.durationSec>0?'connected':'not_connected',
      }});
      if (revision!==sessionRevision() || identity!==await owner()) break;
      await native.acknowledgeCall(identity,item.sourceEventId);
      count++;
    }
    return count;
  })().finally(()=>{syncing=null;});
  return syncing;
}
