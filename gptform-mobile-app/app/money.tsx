import React,{useCallback,useRef,useState} from 'react';
import {View,Text,ScrollView,TextInput,TouchableOpacity,ActivityIndicator,StyleSheet,Alert} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {apiRequest} from '@/lib/api';
import {useBlueprintStore} from '@/stores/blueprint-store';
import {MONEY_KINDS,RequestTracker,moneyKindText,type MoneyKind,type MoneySnapshot} from '../../shared/money';

export default function MoneyScreen(){
  const params=useLocalSearchParams<{kind?:string}>();
  const language=useBlueprintStore(s=>s.blueprint.language||'en');
  const t=(en:string,hi:string)=>language==='hi'?hi:en;
  const [kind,setKind]=useState<MoneyKind>(MONEY_KINDS.includes(params.kind as MoneyKind)?params.kind as MoneyKind:'COLLECTION');
  const [data,setData]=useState<MoneySnapshot|null>(null);
  const [amount,setAmount]=useState('');const [person,setPerson]=useState('');const [reference,setReference]=useState('');
  const [account,setAccount]=useState('CASH');const [reviewed,setReviewed]=useState(false);const [saving,setSaving]=useState(false);
  const [error,setError]=useState(false);const [revision,setRevision]=useState(0);
  const tracker=useRef(new RequestTracker());const busy=useRef(false);
  useFocusEffect(useCallback(()=>{
    let active=true;setData(null);setError(false);
    apiRequest<MoneySnapshot>('/api/commerce/money').then(d=>{if(active){setData(d);if(d.initialized&&params.kind==='OPENING')setKind('MONEY_IN');}}).catch(()=>{if(active)setError(true);});
    return()=>{active=false;};
  },[revision]));
  const save=async()=>{
    if(busy.current||!data)return;
    busy.current=true;setSaving(true);
    const payload={kind,amount:kind==='SUPPLIER_REVIEW'?0:amount,account,customerPhone:kind==='COLLECTION'||kind==='CREDIT_SALE'?person:undefined,supplierId:['SUPPLIER_BILL','SUPPLIER_PAYMENT'].includes(kind)?person:undefined,invoiceId:kind==='INVOICE_PAYMENT'?person:undefined,orderId:kind==='RECONCILE_ORDER'?person:undefined,reference,supplierReviewComplete:reviewed};
    try{
      await apiRequest('/api/commerce/money',{method:'POST',body:payload,headers:{'Idempotency-Key':tracker.current.for(payload)}});
      tracker.current.clear();Alert.alert(t('Saved','सेव हो गया'));router.back();
    }catch{Alert.alert(t('Entry not saved. Check the amount and outstanding dues, then retry.','रकम और बाकी पैसे जाँचें, फिर कोशिश करें। एंट्री सेव नहीं हुई।'));}
    finally{busy.current=false;setSaving(false);}
  };
  const people=kind==='COLLECTION'?data?.customers.filter(c=>!c.needsReconciliation).map(c=>({id:c.phone,name:c.name||c.phone,balance:c.balance})):['SUPPLIER_BILL','SUPPLIER_PAYMENT'].includes(kind)?data?.suppliers.map(s=>({id:s.id,name:s.name,balance:s.balance})):kind==='INVOICE_PAYMENT'?data?.invoices?.map(i=>({id:i.id,name:i.number,balance:i.balance})):kind==='RECONCILE_ORDER'?data?.reviewOrders.map(o=>({id:o.id,name:o.name||o.id,balance:o.total})):null;
  return <SafeAreaView style={styles.safe} edges={['top']}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
    <TouchableOpacity accessibilityRole="button" onPress={()=>router.back()} style={styles.button}><Text>{t('Back','वापस')}</Text></TouchableOpacity>
    <Text style={styles.title}>{moneyKindText(kind,language)}</Text>
    {error?<TouchableOpacity style={styles.button} onPress={()=>setRevision(v=>v+1)}><Text>{t('Could not load accounts. Tap to retry.','खाता लोड नहीं हुआ। फिर कोशिश करें।')}</Text></TouchableOpacity>:!data?<ActivityIndicator/>:<>
      <Text>{t('What is this for?','किसलिए?')}</Text>
      <View style={styles.choices}>{MONEY_KINDS.filter(k=>k!=='ORDER_PAYMENT').map(k=><TouchableOpacity key={k} accessibilityRole="radio" accessibilityState={{checked:kind===k}} disabled={k==='OPENING'&&data.initialized} style={[styles.button,kind===k&&styles.active]} onPress={()=>{setKind(k);setPerson('');}}><Text>{moneyKindText(k,language)}</Text></TouchableOpacity>)}</View>
      {people&&<><Text>{t('Choose customer / supplier / bill','ग्राहक / सप्लायर / बिल चुनें')}</Text>{people.length===0?<Text>{t('No matching records. Add the customer sale or supplier first.','कोई रिकॉर्ड नहीं। पहले ग्राहक की बिक्री या सप्लायर जोड़ें।')}</Text>:people.map(p=><TouchableOpacity accessibilityRole="radio" accessibilityState={{checked:person===p.id}} key={p.id} style={[styles.button,person===p.id&&styles.active]} onPress={()=>setPerson(p.id)}><Text>{p.name} · {p.balance}</Text></TouchableOpacity>)}</>}
      {kind==='CREDIT_SALE'&&<><Text>{t('Customer phone','ग्राहक का फोन')}</Text><TextInput keyboardType="phone-pad" value={person} onChangeText={setPerson} style={styles.input}/></>}
      <Text>{kind==='RECONCILE_ORDER'?t('Amount already paid','पहले दिए पैसे'):t('Amount','रकम')}</Text>
      <TextInput accessibilityLabel={t('Amount','रकम')} keyboardType="decimal-pad" value={amount} onChangeText={setAmount} style={styles.input}/>
      <View style={styles.choices}>{['CASH','BANK'].map(a=><TouchableOpacity key={a} accessibilityRole="radio" accessibilityState={{checked:account===a}} onPress={()=>setAccount(a)} style={[styles.button,account===a&&styles.active]}><Text>{a==='CASH'?t('Cash','नकद'):t('Bank / UPI / Card','बैंक / UPI / कार्ड')}</Text></TouchableOpacity>)}</View>
      <Text>{kind==='SUPPLIER_BILL'?t('Bill number','बिल नंबर'):t('Note (optional)','नोट (ज़रूरी नहीं)')}</Text><TextInput value={reference} onChangeText={setReference} maxLength={200} style={styles.input}/>
      {(kind==='OPENING'||kind==='SUPPLIER_REVIEW')&&<TouchableOpacity accessibilityRole="checkbox" accessibilityState={{checked:reviewed}} onPress={()=>setReviewed(v=>!v)} style={styles.button}><Text>{reviewed?'☑':'☐'} {t('All outstanding supplier bills have been entered.','सप्लायर के सभी बाकी बिल दर्ज कर दिए हैं।')}</Text></TouchableOpacity>}
      {data.reviewOrders.length>0&&<Text>{t('Review old partial payments before collection.','पैसे लेने से पहले पुराने आंशिक भुगतान जाँचें।')}</Text>}
      <TouchableOpacity accessibilityRole="button" disabled={saving||(kind!=='SUPPLIER_REVIEW'&&!amount)||!!people&&!person} onPress={save} style={[styles.button,styles.active]}><Text>{saving?'…':t('Save','सेव करें')}</Text></TouchableOpacity>
    </>}
  </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#f8fafc'},content:{padding:20,gap:16,paddingBottom:48},title:{fontSize:24,fontWeight:'700'},button:{minHeight:48,padding:14,borderWidth:1,borderColor:'#cbd5e1',borderRadius:12,backgroundColor:'#fff',justifyContent:'center'},active:{borderColor:'#059669',backgroundColor:'#ecfdf5'},choices:{flexDirection:'row',flexWrap:'wrap',gap:8},input:{minHeight:48,padding:14,borderWidth:1,borderColor:'#cbd5e1',borderRadius:12,backgroundColor:'#fff'}});
