import { NextResponse } from 'next/server';
import { POST as saveMoney } from '@/app/api/commerce/money/route';

/** A merchant receipt uses the same atomic ledger as POS and Khata. */
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const body=await req.json().catch(()=>null);
 if(!body||typeof body.amount!=='number'||(body.method!==undefined&&typeof body.method!=='string'))return NextResponse.json({error:'Invalid payment'},{status:400});
 const response=await saveMoney(new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify({kind:'INVOICE_PAYMENT',invoiceId:id,amount:body.amount,account:body.method==='CASH'?'CASH':'BANK',requestKey:body.requestKey})}));
 if(!response.ok)return response;
 return NextResponse.json({ok:true});
}
