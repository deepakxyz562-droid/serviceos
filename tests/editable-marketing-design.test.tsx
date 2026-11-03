import React, {useState} from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {createDesign} from '../shared/marketing-design';
import {EditableMarketingDesign} from '@/components/bgos/editable-marketing-design';
vi.mock('@/lib/api',()=>({authFetch:vi.fn()}));
afterEach(cleanup);
function Editor(){const [design,setDesign]=useState(createDesign({brand:'Acme',headline:'Original',subtitle:'Hello',badge:'New',cta:'Explore',photo:''}));return <><output data-testid="document">{JSON.stringify(design)}</output><EditableMarketingDesign design={design} onChange={setDesign}/></>;}
const document=()=>JSON.parse(screen.getByTestId('document').textContent!);
it('restores actual text edits with Undo and Redo',()=>{
 render(<Editor/>);
 const headline=screen.getByRole('textbox',{name:'Edit headline'});headline.textContent='Changed';fireEvent.blur(headline);
 expect(document().layers.find((l:any)=>l.id==='headline').text).toBe('Changed');
 fireEvent.click(screen.getByRole('button',{name:'Undo'}));expect(document().layers.find((l:any)=>l.id==='headline').text).toBe('Original');
 fireEvent.click(screen.getByRole('button',{name:'Redo'}));expect(document().layers.find((l:any)=>l.id==='headline').text).toBe('Changed');
});
it('locks manipulation and hides a layer without deleting it',()=>{
 render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'Lock'}));
 expect(screen.queryByRole('button',{name:'move layer'})).toBeNull();
 expect(screen.getByRole('textbox',{name:'Edit headline'}).getAttribute('contenteditable')).toBe('false');
 fireEvent.click(screen.getByRole('button',{name:'Hide'}));expect(screen.queryByRole('textbox',{name:'Edit headline'})).toBeNull();
 expect(document().layers.find((l:any)=>l.id==='headline').hidden).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Show'}));expect(screen.getByRole('textbox',{name:'Edit headline'})).toBeTruthy();
});
