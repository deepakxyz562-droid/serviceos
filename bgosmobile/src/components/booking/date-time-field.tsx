import React, { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Action, Card, Field, Screen, ui, colors } from '../ui';
import { localDay } from '../../lib/dates';
/** Local-device timezone, with explicit labels; no UTC day conversion. */
export function DateTimeField({day,time,onDay,onTime}: {day:string;time:string;onDay:(v:string)=>void;onTime:(v:string)=>void}) {
  const [mode,setMode]=useState<'date'|'time'|null>(null);
  const [month,setMonth]=useState(()=>new Date(new Date().getFullYear(),new Date().getMonth(),1));
  const today=localDay(new Date());
  const first=new Date(month.getFullYear(),month.getMonth(),1).getDay();
  const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <View style={{gap:10}}>
    <Text style={ui.label}>Appointment date &amp; time</Text>
    <View style={[ui.row,{gap:10}]}><View style={{flex:1}}><Action secondary icon="calendar-today" label={day||'Choose date'} onPress={()=>{if(day){const [y,m]=day.split('-').map(Number);setMonth(new Date(y,m-1,1));}setMode('date');}}/></View><View style={{flex:1}}><Action secondary icon="schedule" label={time||'Choose time'} onPress={()=>setMode('time')}/></View></View>
    <Text style={ui.caption}>Times use {zone}. These are time choices, not confirmed availability.</Text>
    <Modal visible={!!mode} animationType="slide" onRequestClose={()=>setMode(null)}><Screen title={mode==='date'?'Choose date':'Choose time'} showBack onBack={()=>setMode(null)}>
      {mode==='date'?<Card><View style={[ui.row,{justifyContent:'space-between'}]}><Action secondary label="Previous" onPress={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}/><Text style={ui.label}>{month.toLocaleDateString(undefined,{month:'short',year:'numeric'})}</Text><Action secondary label="Next" onPress={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}/></View>
        <View style={{flexDirection:'row',flexWrap:'wrap'}}>{['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><Text key={d} style={[ui.caption,{width:'14.28%',textAlign:'center',paddingVertical:8}]}>{d}</Text>)}{Array.from({length:first+count},(_,i)=>{const date=i-first+1;const value=localDay(new Date(month.getFullYear(),month.getMonth(),date));return i<first?<View key={i} style={{width:'14.28%'}}/>:<Pressable key={i} accessibilityRole="button" accessibilityLabel={value} accessibilityState={{selected:value===day,disabled:value<today}} disabled={value<today} onPress={()=>{onDay(value);setMode(null);}} style={{width:'14.28%',minHeight:48,justifyContent:'center',alignItems:'center',borderRadius:8,backgroundColor:value===day?colors.brand:'transparent',opacity:value<today?0.3:1}}><Text style={{color:value===day?'white':colors.ink}}>{date}</Text></Pressable>;})}</View></Card>:<Card><Field label="Exact time (24-hour HH:MM)" value={time} onChangeText={onTime} placeholder="09:30" keyboardType="numbers-and-punctuation"/><Action label="Use time" onPress={()=>setMode(null)}/><Text style={ui.caption}>Or choose a time below</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{Array.from({length:96},(_,i)=>`${String(Math.floor(i/4)).padStart(2,'0')}:${String((i%4)*15).padStart(2,'0')}`).map(t=><Pressable key={t} accessibilityRole="button" accessibilityState={{selected:t===time}} onPress={()=>{onTime(t);setMode(null);}} style={{width:'22%',minHeight:44,borderRadius:8,alignItems:'center',justifyContent:'center',backgroundColor:t===time?colors.brand:colors.surface}}><Text style={{color:t===time?'white':colors.ink}}>{t}</Text></Pressable>)}</View></Card>}
    </Screen></Modal>
  </View>;
}
