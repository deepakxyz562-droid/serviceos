import { createHmac, timingSafeEqual } from 'crypto';

function secret() {
  const value=process.env.PUBLIC_ORDER_TOKEN_SECRET||process.env.JWT_SECRET;
  if(!value||value.length<32)throw new Error('COMMERCE_UNAVAILABLE');
  return value;
}
export function orderAccessToken(orderId:string,businessId:string,now=Date.now()) {
  const payload=Buffer.from(JSON.stringify({orderId,businessId,expires:now+30*86400000})).toString('base64url');
  return payload+'.'+createHmac('sha256',secret()).update(payload).digest('base64url');
}
export function verifyOrderAccess(token:unknown,orderId:string,now=Date.now()):{businessId:string}|null {
  if(typeof token!=='string'||token.length>1000)return null;
  try {
    const parts=token.split('.');if(parts.length!==2)return null;
    const expected=createHmac('sha256',secret()).update(parts[0]).digest();const supplied=Buffer.from(parts[1],'base64url');
    if(expected.length!==supplied.length||!timingSafeEqual(expected,supplied))return null;
    const data=JSON.parse(Buffer.from(parts[0],'base64url').toString());
    if(data.orderId!==orderId||typeof data.businessId!=='string'||typeof data.expires!=='number'||data.expires<now)return null;
    return{businessId:data.businessId};
  }catch{return null;}
}
