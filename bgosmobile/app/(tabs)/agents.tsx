import React, { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Card, Action, ErrorNotice, Loading, Chip, Field, ui } from '../../src/components/ui';
import { useUnsavedWarning } from '../../src/hooks/use-unsaved-warning';
import { useResource } from '../../src/hooks/use-resource';
import { apiRequest } from '../../src/lib/api';
import { getBgosWebUrl } from '../../src/lib/bgos-urls';
import type { FormAgentData } from '../../../src/features/forms/types/agent-types';

type Tab = 'overview' | 'knowledge' | 'channels' | 'test';
export default function AgentsScreen() {
  const router = useRouter();
  const resource = useResource<{agents: FormAgentData[]}>('/api/forms/agents');
  const [tab,setTab] = useState<Tab>('overview');
  const [selectedId,setSelectedId] = useState('');
  const [draft,setDraft] = useState<FormAgentData | null>(null);
  const [dirty,setDirty] = useState(false);
  useUnsavedWarning(dirty);
  const dirtyRef = useRef(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const [notice,setNotice] = useState('');
  const [name,setName] = useState('');
  const [question,setQuestion] = useState('');
  const [answer,setAnswer] = useState('');
  const [editingFaq,setEditingFaq] = useState<string | null>(null);
  const [testInput,setTestInput] = useState('');
  const [messages,setMessages] = useState<{role:'user'|'assistant';content:string}[]>([]);
  const [testing,setTesting] = useState(false);
  useEffect(()=>{
    if(dirtyRef.current) return;
    const selected = resource.data?.agents.find(a=>a.id===selectedId) || resource.data?.agents[0];
    if(selected) {setDraft(selected);setSelectedId(selected.id);}
  },[resource.data,selectedId]);
  function edit(update: Partial<FormAgentData>) {
    if(!draft)return;
    dirtyRef.current=true;setDirty(true);setNotice('');setDraft({...draft,...update});
  }
  async function save() {
    if(!draft?.name.trim()) {setError('Enter an assistant name.');return;}
    setBusy(true);setError(null);
    try {
      // Re-read before saving: keep another device's newer configuration intact.
      const latest=await apiRequest<{agents:FormAgentData[]}>('/api/forms/agents');
      const current=latest.agents.find(a=>a.id===draft.id);
      if(current && current.updatedAt!==draft.updatedAt) throw new Error('This assistant changed on another device. Reload the saved version before editing again.');
      const result=await apiRequest<{agent:FormAgentData}>('/api/forms/agents',{method:'POST',body:draft});
      if(!result.agent?.id)throw new Error('The server did not confirm the save. Please retry.');
      dirtyRef.current=false;setDirty(false);setDraft(result.agent);setNotice('Assistant changes saved.');setMessages([]);await resource.refresh();
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function create() {
    if(!name.trim()) {setError('Enter a name for your assistant.');return;}
    setBusy(true);setError(null);
    try {
      const result=await apiRequest<{agent:FormAgentData}>('/api/forms/agents',{method:'POST',body:{name:name.trim(),roleTitle:'Business assistant',welcomeGreeting:'Hello! How can we help you today?',knowledge:{documents:[],faqPairs:[],guardrails:[]}}});
      if(!result.agent?.id)throw new Error('The server did not confirm assistant creation.');
      setSelectedId(result.agent.id);await resource.refresh();setNotice('Assistant created. Add business information, then test its answers.');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function addFaq() {
    if(!draft || !question.trim() || !answer.trim()) {setError('Enter both a question and an answer.');return;}
    const faq={id:editingFaq || `faq_${Date.now()}`,question:question.trim(),answer:answer.trim()};
    const existing=draft.knowledge?.faqPairs || [];
    edit({knowledge:{...draft.knowledge,faqPairs:editingFaq ? existing.map(f=>f.id===editingFaq?faq:f) : [...existing,faq]}});
    setQuestion('');setAnswer('');setEditingFaq(null);setError(null);
  }
  async function test(value = testInput) {
    if(!draft?.id || testing || !value.trim())return;
    if(dirty){setError('Save your changes before testing so the answer uses your latest information.');return;}
    setTesting(true);setError(null);
    const history=messages;
    setMessages(old=>[...old,{role:'user',content:value.trim()}]);setTestInput('');
    try {
      const result=await apiRequest<{reply?:string;response?:string;text?:string}>(`/api/forms/agents/${draft.id}/chat`,{method:'POST',body:{message:value.trim(),history}});
      const reply=result.reply||result.response||result.text;
      if(!reply)throw new Error('No answer received. Please retry.');
      setMessages(old=>[...old,{role:'assistant',content:reply}]);
    }catch(e){setMessages(history);setTestInput(value);setError((e as Error).message);}finally{setTesting(false);}
  }
  function reload() {
    Alert.alert('Reload saved version?', 'Unsaved edits will be discarded.',[{text:'Keep editing',style:'cancel'},{text:'Reload',style:'destructive',onPress:()=>{dirtyRef.current=false;setDirty(false);setError(null);void resource.refresh();}}]);
  }
  async function openWeb() {try{await Linking.openURL(getBgosWebUrl('agentStudio'));}catch{setError('Could not open the browser. Please try again.');}}
  const faqs=draft?.knowledge?.faqPairs || [];
  return <Screen title="Business assistant" subtitle="Teach it about your business, then test its answers." showBack onRefresh={()=>{if(dirty)reload();else void resource.refresh();}}>
    <ErrorNotice message={error||resource.error} retry={dirty ? reload : resource.refresh}/>
    {!!notice && <Text accessibilityLiveRegion="polite" style={ui.body}>{notice}</Text>}
    {resource.loading && !resource.data ? <Loading/> : !draft ? <Card><Text style={ui.heading}>Set up your business assistant</Text><Text style={ui.body}>Start with a name. You can add answers and connect customer channels next.</Text><Field label="Assistant name" value={name} onChangeText={setName} placeholder="Your business assistant"/><Action label={busy?'Creating…':'Create assistant'} disabled={busy||!name.trim()} onPress={()=>void create()}/></Card> : <>
      {(resource.data?.agents.length || 0)>1 && <View style={[ui.row,{flexWrap:'wrap',gap:8}]}>{resource.data?.agents.map(a=><Chip key={a.id} label={a.name} selected={selectedId===a.id} onPress={()=>{if(dirty||testing||busy){setError('Save or discard your current edits before switching assistants.');return;}setSelectedId(a.id);setMessages([]);}}/>)}</View>}
      <View style={[ui.row,{flexWrap:'wrap',gap:8}]}>{(['overview','knowledge','channels','test'] as const).map(t=><Chip key={t} label={{overview:'Overview',knowledge:'Knowledge',channels:'Channels',test:'Test'}[t]} selected={tab===t} onPress={()=>setTab(t)}/>)}</View>
      <Text style={ui.caption}>{draft.name} · {dirty?'Unsaved changes':'Saved configuration'}</Text>
      {tab==='overview' && <>
        <Card><Text style={ui.heading}>Get ready for customers</Text><Text style={ui.body}>{faqs.length} saved or draft answers · {draft.knowledge?.documents?.length || 0} source references</Text><Text style={ui.caption}>A saved configuration does not mean a channel is connected. Check Channels before going live.</Text><Action secondary label="1. Add business knowledge" onPress={()=>setTab('knowledge')}/><Action secondary label="2. Test customer questions" onPress={()=>setTab('test')}/><Action secondary label="3. Review connected channels" onPress={()=>setTab('channels')}/></Card>
        <Card><Field label="Assistant name" value={draft.name} editable={!busy} onChangeText={name=>edit({name})}/><Field label="What does your assistant help with?" value={draft.roleTitle || ''} editable={!busy} onChangeText={roleTitle=>edit({roleTitle})}/><Field label="Welcome message" multiline value={draft.welcomeGreeting || ''} editable={!busy} onChangeText={welcomeGreeting=>edit({welcomeGreeting})}/></Card>
      </>}
      {tab==='knowledge' && <>
        <Card><Text style={ui.heading}>Business information</Text><Text style={ui.body}>Keep services, hours, pricing and policies accurate. Add specific answers below.</Text><Action secondary label="Manage booking services" onPress={()=>router.push('/booking-page')}/><Text style={ui.caption}>Editing services here does not automatically add an FAQ. Include any pricing or booking policy the assistant needs in its answers.</Text></Card>
        <Card><Text style={ui.heading}>{editingFaq?'Edit answer':'Add an answer'}</Text><Field label="Customer question" value={question} onChangeText={setQuestion} editable={!busy}/><Field label="Your answer" multiline value={answer} onChangeText={setAnswer} editable={!busy}/><Action secondary label={editingFaq?'Update answer':'Add to draft'} disabled={busy} onPress={addFaq}/>{editingFaq && <Action secondary label="Cancel edit" onPress={()=>{setEditingFaq(null);setQuestion('');setAnswer('');}}/>}</Card>
        {faqs.map(f=><Card key={f.id}><Text style={ui.heading}>{f.question}</Text><Text style={ui.body}>{f.answer}</Text><View style={[ui.row,{gap:12}]}><Action secondary label="Edit" disabled={busy} onPress={()=>{setEditingFaq(f.id);setQuestion(f.question);setAnswer(f.answer);}}/><Action secondary danger label="Remove" disabled={busy} onPress={()=>Alert.alert('Remove answer?','Save changes to apply this removal.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>edit({knowledge:{...draft.knowledge,faqPairs:faqs.filter(x=>x.id!==f.id)}})}])}/></View></Card>)}
        <Card><Text style={ui.heading}>Website and documents</Text><Text style={ui.body}>Upload documents, import a website and review processing status in the web knowledge editor. Opens your browser; you may need to sign in.</Text><Action secondary label="Open advanced knowledge · Web" icon="open-in-new" onPress={()=>void openWeb()}/></Card>
      </>}
      {tab==='channels' && <Card><Text style={ui.heading}>Customer channels</Text><Text style={ui.body}>Review account connections in Integrations. Configure how this assistant uses each channel in the web Studio.</Text><Action label="View connected accounts" onPress={()=>router.push('/(tabs)/integrations')}/><Action secondary label="Configure assistant channels · Web" onPress={()=>void openWeb()}/><Action secondary label="View customer conversations" onPress={()=>router.push('/(tabs)/inbox')}/></Card>}
      {tab==='test' && <>
        <Card><Text style={ui.heading}>Test {draft.name}</Text><Text style={ui.body}>Check hours, services and pricing before sharing your assistant.</Text>{['What services do you offer?','How can I book an appointment?'].map(q=><Action key={q} secondary label={q} disabled={testing||dirty} onPress={()=>void test(q)}/>)}</Card>
        {messages.map((m,i)=><Card key={i}><Text style={ui.label}>{m.role==='user'?'You':draft.name}</Text><Text selectable style={ui.body}>{m.content}</Text></Card>)}
        <Card>{testing && <Text accessibilityLiveRegion="polite" style={ui.caption}>Preparing an answer…</Text>}<Field label="Ask a customer question" multiline value={testInput} onChangeText={setTestInput} editable={!testing}/><Action label={testing?'Responding…':'Test answer'} disabled={testing||dirty||!testInput.trim()} onPress={()=>void test()}/><Action secondary label="Clear conversation" disabled={testing} onPress={()=>setMessages([])}/></Card>
      </>}
      {dirty && <Card><Text style={ui.caption}>Your edits are not saved yet.</Text><Action label={busy?'Saving…':'Save changes'} disabled={busy} onPress={()=>void save()}/><Action secondary label="Discard edits" disabled={busy} onPress={reload}/></Card>}
    </>}
  </Screen>;
}
