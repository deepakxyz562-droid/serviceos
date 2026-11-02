export function googleReplyState(state?:string){
 if(state==='PENDING')return {status:'pending',publishedToGoogle:false};
 if(state==='REJECTED')return {status:'hidden',publishedToGoogle:false};
 // Legacy/unspecified responses must not be presented as approved.
 return {status:'published',publishedToGoogle:state==='APPROVED'};
}
