import { db } from '@/lib/db';
import { decryptKey } from '@/lib/ai-key-crypto';
export async function generateDesignImage(prompt:string,provider:'gemini'|'openrouter',signal:AbortSignal,isPoster?:boolean) {
  const key=await db.aiProviderKey.findFirst({where:{provider,isActive:true},orderBy:{priority:'asc'}});
  if(!key)throw new Error(`Configure an active ${provider} key in Superadmin`);
  const secret=decryptKey(key.encryptedKey);
  const model=provider==='gemini'?(process.env.BGOS_GEMINI_IMAGE_MODEL||'gemini-2.5-flash-image'):(process.env.BGOS_OPENROUTER_IMAGE_MODEL||'google/gemini-2.5-flash-image');
  const isPosterMode=isPoster||prompt.startsWith('[POSTER]');
  const cleanPrompt=prompt.replace(/^\[POSTER\]\s*/,'').trim();
  const text=isPosterMode
    ? `Create a premium, clean promotional poster graphic (1080x1350 portrait format) with professional visual typography, modern UI layout, and clear contrasting elements based on this brief: ${cleanPrompt}`
    : `Create a professional marketing background photograph or illustration. Do not include any lettering, logos, watermarks, prices or text: those will be separate editable layers. Brief: ${cleanPrompt}`;
  let response=await fetch(provider==='gemini'?`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`:'https://openrouter.ai/api/v1/chat/completions',{
    method:'POST',signal,headers:{'Content-Type':'application/json',...(provider==='gemini'?{'x-goog-api-key':secret}:{Authorization:`Bearer ${secret}`})},
    body:JSON.stringify(provider==='gemini'?{contents:[{parts:[{text}]}],generationConfig:{responseModalities:['TEXT','IMAGE']}}:{model,messages:[{role:'user',content:text}],modalities:['image','text']})
  });
  if(!response.ok && response.status === 429 && provider === 'gemini') {
    const fallbackKey = await db.aiProviderKey.findFirst({ where: { provider: 'openrouter', isActive: true }, orderBy: { priority: 'asc' } });
    if (fallbackKey) {
      const fallbackSecret = decryptKey(fallbackKey.encryptedKey);
      const fallbackModel = process.env.BGOS_OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
      const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fallbackSecret}` },
        body: JSON.stringify({ model: fallbackModel, messages: [{ role: 'user', content: text }], modalities: ['image', 'text'] })
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        const fallbackUri = fallbackData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const fallbackMatch = typeof fallbackUri === 'string' ? /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(fallbackUri) : null;
        const fallbackEncoded = fallbackMatch?.[2];
        if (typeof fallbackEncoded === 'string' && fallbackEncoded.length <= 11_000_000) {
          await db.aiProviderKey.update({ where: { id: fallbackKey.id }, data: { lastUsedAt: new Date(), requestCount: { increment: 1 } } });
          return { bytes: Buffer.from(fallbackEncoded, 'base64'), model: fallbackModel, cost: typeof fallbackData.usage?.cost === 'number' ? fallbackData.usage.cost : null };
        }
      }
    }
  }
  if(!response.ok)throw new Error(`${provider} image generation failed (${response.status}). Check model access and credit in Superadmin.`);
  const data=await response.json();
  const inline=data.candidates?.[0]?.content?.parts?.find((part:any)=>part.inlineData)?.inlineData;
  const uri=data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const match=typeof uri==='string'?/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(uri):null;
  const encoded=provider==='gemini'&&['image/png','image/jpeg','image/webp'].includes(inline?.mimeType)?inline.data:match?.[2];
  if(typeof encoded!=='string'||encoded.length>11_000_000)throw new Error('The provider did not return a supported image');
  await db.aiProviderKey.update({where:{id:key.id},data:{lastUsedAt:new Date(),requestCount:{increment:1}}});
  return {bytes:Buffer.from(encoded,'base64'),model,cost:typeof data.usage?.cost==='number'?data.usage.cost:null};
}
