import { encryptToken } from '@/lib/social/crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gbp/locations/create
 * Create a new Google Business Profile / page for the tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({error:'Send a JSON object'},{status:400});
    for (const key of ['businessName','primaryCategory','locality','postalCode','regionCode','administrativeArea','phone','websiteUri']) if (body[key] !== undefined && typeof body[key] !== 'string') return NextResponse.json({error:`Invalid ${key}`},{status:400});
    const {
      businessName,
      primaryCategory,
      addressLines,
      locality,
      administrativeArea,
      postalCode,
      regionCode = '',
      phone,
      websiteUri,
      openingHours,
    } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    if (!primaryCategory?.trim()) {
      return NextResponse.json({ error: 'Primary category is required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const googleAccount=await prepareGoogleAccount(user.tenantId);
    if(!googleAccount)return NextResponse.json({error:'Connect a Google Business account before creating a profile. No profile has been created.',verificationUrl:'https://business.google.com/create'},{status:409});
    const accountName=String(googleAccount.metadata?.accountName||'');
    if(!/^accounts\/[^/]+$/.test(accountName))return NextResponse.json({error:'Reconnect Google to select an account for the new profile'},{status:409});
    if(!Array.isArray(addressLines)||!addressLines.every((line:unknown)=>typeof line==='string'&&line.trim())||!addressLines.length||!locality?.trim()||!postalCode?.trim()||!/^[A-Z]{2}$/.test(regionCode))return NextResponse.json({error:'Provide the real business address, city, postal code and two-letter country code. Service-area-only setup is not yet supported by this form.'},{status:400});
    let categoryName=primaryCategory.trim();
    if(!categoryName.startsWith('categories/')){
      const url=new URL('https://mybusinessbusinessinformation.googleapis.com/v1/categories');
      url.searchParams.set('regionCode',regionCode);url.searchParams.set('languageCode','en');url.searchParams.set('view','BASIC');url.searchParams.set('filter',`displayName=${categoryName}`);
      const result=await fetch(url,{headers:{Authorization:`Bearer ${googleAccount.accessToken}`},signal:AbortSignal.timeout(20000)});
      if(!result.ok)return NextResponse.json({error:'Google category lookup failed. Please retry.'},{status:502});
      const categories=await result.json();
      const match=categories.categories?.find((c:{displayName:string})=>c.displayName.toLowerCase()===categoryName.toLowerCase());
      if(!match)return NextResponse.json({error:'Choose an exact Google Business category'},{status:400});categoryName=match.name;
    }
    const response=await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,{
      method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${googleAccount.accessToken}`},signal:AbortSignal.timeout(30000),
      body:JSON.stringify({title:businessName.trim(),languageCode:'en',storefrontAddress:{regionCode,locality:locality.trim(),administrativeArea:administrativeArea?.trim(),postalCode:postalCode.trim(),addressLines:addressLines.map((line:string)=>line.trim())},categories:{primaryCategory:{name:categoryName}},...(phone?{phoneNumbers:{primaryPhone:phone.trim()}}:{}),...(websiteUri?{websiteUri}:{})}),
    });
    const result=await response.json();
    if(!response.ok)return NextResponse.json({error:result.error?.message||'Google rejected profile creation. No local business details were overwritten.',publishedToGoogle:false},{status:502});
    if(!/^locations\/[^/]+$/.test(result.name||''))return NextResponse.json({error:'Google returned an unexpected profile response. Check Google before retrying.'},{status:502});
    const locationId=result.name.split('/').pop();
    await db.socialAccount.upsert({where:{tenantId_platform_accountId:{tenantId:user.tenantId,platform:'googlebusiness',accountId:locationId}},create:{tenantId:user.tenantId,platform:'googlebusiness',accountId:locationId,accountName:businessName.trim(),accessToken:encryptToken(googleAccount.accessToken),refreshToken:googleAccount.refreshToken?encryptToken(googleAccount.refreshToken):null,connectedById:user.id,scopes:"https://www.googleapis.com/auth/business.manage",isActive:true,metadata:JSON.stringify({accountName,locationId,locationTitle:businessName.trim()})},update:{metadata:JSON.stringify({accountName,locationId,locationTitle:businessName.trim()})}});
    return NextResponse.json({success:true,googleLocationId:result.name,publishedToGoogle:false,status:'created_verification_required',googleVerificationUrl:'https://business.google.com/locations',message:'Google created the profile. Complete verification in Google; public visibility is not yet confirmed.'},{status:201});
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Profile creation failed'},{status:500});}
}
