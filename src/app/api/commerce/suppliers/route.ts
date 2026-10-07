import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';
import { commerceError } from '@/lib/commerce/atomic';
export async function POST(req: Request) {
  try {
    const business=await ownerBusiness(req);
    const body=await req.json().catch(()=>null);
    if(!body||typeof body.name!=='string'||!body.name.trim()||body.name.length>200) return NextResponse.json({error:'Supplier name is required'},{status:400});
    const supplier=await db.supplier.create({data:{tenantId:business.tenantId||business.id,name:body.name.trim()}});
    return NextResponse.json({supplier},{status:201});
  }catch(error){
    if(error instanceof Error&&['UNAUTHORIZED','FORBIDDEN'].includes(error.message))return NextResponse.json({error:'Access denied'},{status:error.message==='UNAUTHORIZED'?401:403});
    const failure=commerceError(error);return NextResponse.json({error:failure.message},{status:failure.status});
  }
}
