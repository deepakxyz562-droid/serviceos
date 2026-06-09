module.exports=[66178,e=>{"use strict";var t=e.i(43793),o=e.i(63890);let i={job_assigned:{getSubject:e=>`New Job Assigned: #${e.jobNumber||"N/A"}`,getWhatsAppMessage:e=>`🔔 New Job Assigned

Job #${e.jobNumber||"N/A"}
Customer: ${e.customerName||"N/A"}
Address: ${e.address||"N/A"}
Service: ${e.serviceTitle||e.jobTitle||"N/A"}
Date: ${e.scheduledDate||"TBD"}
Time: ${e.scheduledTime||"TBD"}
Phone: ${e.customerPhone||"N/A"}

Please confirm arrival.`,getEmailBody:e=>`<h2>🔔 New Job Assigned</h2>
<p><strong>Job #${e.jobNumber||"N/A"}</strong></p>
<ul>
<li><strong>Customer:</strong> ${e.customerName||"N/A"}</li>
<li><strong>Address:</strong> ${e.address||"N/A"}</li>
<li><strong>Service:</strong> ${e.serviceTitle||e.jobTitle||"N/A"}</li>
<li><strong>Date:</strong> ${e.scheduledDate||"TBD"}</li>
<li><strong>Time:</strong> ${e.scheduledTime||"TBD"}</li>
<li><strong>Phone:</strong> ${e.customerPhone||"N/A"}</li>
</ul>
<p>Please confirm your arrival.</p>`,getSmsMessage:e=>`New job assigned: #${e.jobNumber||"N/A"} - ${e.serviceTitle||e.jobTitle||"Service"} at ${e.address||"N/A"}, ${e.scheduledDate||"TBD"} ${e.scheduledTime||""}. Please confirm.`,getInAppPayload:e=>({title:"New Job Assigned",message:`Job #${e.jobNumber||"N/A"} - ${e.serviceTitle||e.jobTitle||"Service"} at ${e.address||"N/A"}`,type:"job",actionUrl:e.jobId?`/jobs/${e.jobId}`:void 0})},job_started:{getSubject:e=>`Job Started: #${e.jobNumber||"N/A"}`,getWhatsAppMessage:e=>`🚀 Technician On The Way

${e.employeeName||"Your technician"} is on the way!
Service: ${e.serviceTitle||e.jobTitle||"N/A"}
Address: ${e.address||"N/A"}
ETA: ${e.scheduledTime||"TBD"}`,getEmailBody:e=>`<h2>🚀 Technician On The Way</h2>
<p>${e.employeeName||"Your technician"} is on the way!</p>
<ul>
<li><strong>Service:</strong> ${e.serviceTitle||e.jobTitle||"N/A"}</li>
<li><strong>Address:</strong> ${e.address||"N/A"}</li>
<li><strong>ETA:</strong> ${e.scheduledTime||"TBD"}</li>
</ul>`,getSmsMessage:e=>`Your technician ${e.employeeName||""} is on the way for ${e.serviceTitle||e.jobTitle||"service"} at ${e.address||"N/A"}.`,getInAppPayload:e=>({title:"Job Started",message:`${e.employeeName||"Technician"} is on the way for ${e.serviceTitle||e.jobTitle||"service"}`,type:"job",actionUrl:e.jobId?`/jobs/${e.jobId}`:void 0})},job_completed:{getSubject:e=>`Service Completed: #${e.jobNumber||"N/A"}`,getWhatsAppMessage:e=>`✅ Service Completed

Your service has been completed.
Service: ${e.serviceTitle||e.jobTitle||"N/A"}
Technician: ${e.employeeName||"N/A"}

Thank you for choosing ${e.tenantName||"ServiceOS"}!

Please rate your experience:
⭐⭐⭐⭐⭐`,getEmailBody:e=>`<h2>✅ Service Completed</h2>
<p>Your service has been completed.</p>
<ul>
<li><strong>Service:</strong> ${e.serviceTitle||e.jobTitle||"N/A"}</li>
<li><strong>Technician:</strong> ${e.employeeName||"N/A"}</li>
</ul>
<p>Thank you for choosing ${e.tenantName||"ServiceOS"}!</p>
<p>Please rate your experience.</p>`,getSmsMessage:e=>`Service completed: ${e.serviceTitle||e.jobTitle||"Service"} by ${e.employeeName||"technician"}. Thank you from ${e.tenantName||"ServiceOS"}!`,getInAppPayload:e=>({title:"Service Completed",message:`${e.serviceTitle||e.jobTitle||"Service"} completed by ${e.employeeName||"technician"}`,type:"job",actionUrl:e.jobId?`/jobs/${e.jobId}`:void 0})},review_request:{getSubject:e=>`Rate Your Experience - ${e.tenantName||"ServiceOS"}`,getWhatsAppMessage:e=>`⭐ How Was Your Experience?

We hope you enjoyed your ${e.serviceTitle||e.jobTitle||"service"}.
Technician: ${e.employeeName||"N/A"}

Please take a moment to rate us:
5️⃣ Excellent
4️⃣ Good
3️⃣ Average
2️⃣ Below Average
1️⃣ Poor

Thank you! - ${e.tenantName||"ServiceOS"}`,getEmailBody:e=>`<h2>⭐ How Was Your Experience?</h2>
<p>We hope you enjoyed your ${e.serviceTitle||e.jobTitle||"service"}.</p>
<p>Technician: <strong>${e.employeeName||"N/A"}</strong></p>
<p>Please take a moment to rate your experience.</p>
<p>Thank you! - ${e.tenantName||"ServiceOS"}</p>`,getSmsMessage:e=>`Rate your experience with ${e.tenantName||"ServiceOS"}: ${e.serviceTitle||e.jobTitle||"service"}. Thank you!`,getInAppPayload:e=>({title:"Rate Your Experience",message:`How was your ${e.serviceTitle||e.jobTitle||"service"}?`,type:"review",actionUrl:e.jobId?`/jobs/${e.jobId}/review`:void 0})},booking_confirmed:{getSubject:e=>`Booking Confirmed: #${e.jobNumber||"N/A"}`,getWhatsAppMessage:e=>`📋 Booking Confirmed

Thank you for your booking.
Booking ID: ${e.jobNumber||"N/A"}
Service: ${e.serviceTitle||e.jobTitle||"N/A"}
Date: ${e.scheduledDate||"TBD"}

We will assign a technician shortly.`,getEmailBody:e=>`<h2>📋 Booking Confirmed</h2>
<p>Thank you for your booking.</p>
<ul>
<li><strong>Booking ID:</strong> ${e.jobNumber||"N/A"}</li>
<li><strong>Service:</strong> ${e.serviceTitle||e.jobTitle||"N/A"}</li>
<li><strong>Date:</strong> ${e.scheduledDate||"TBD"}</li>
</ul>
<p>We will assign a technician shortly.</p>`,getSmsMessage:e=>`Booking confirmed: #${e.jobNumber||"N/A"} - ${e.serviceTitle||e.jobTitle||"Service"} on ${e.scheduledDate||"TBD"}. We'll assign a technician soon.`,getInAppPayload:e=>({title:"Booking Confirmed",message:`Booking #${e.jobNumber||"N/A"} for ${e.serviceTitle||e.jobTitle||"service"}`,type:"job",actionUrl:e.jobId?`/jobs/${e.jobId}`:void 0})},job_cancelled:{getSubject:e=>`Job Cancelled: #${e.jobNumber||"N/A"}`,getWhatsAppMessage:e=>`❌ Job Cancelled

Job #${e.jobNumber||"N/A"} has been cancelled.
Service: ${e.serviceTitle||e.jobTitle||"N/A"}
${e.reason?`Reason: ${e.reason}`:""}

If you have questions, please contact us.`,getEmailBody:e=>`<h2>❌ Job Cancelled</h2>
<p>Job #${e.jobNumber||"N/A"} has been cancelled.</p>
<ul>
<li><strong>Service:</strong> ${e.serviceTitle||e.jobTitle||"N/A"}</li>
${e.reason?`<li><strong>Reason:</strong> ${e.reason}</li>`:""}
</ul>
<p>If you have questions, please contact us.</p>`,getSmsMessage:e=>`Job #${e.jobNumber||"N/A"} (${e.serviceTitle||e.jobTitle||"Service"}) has been cancelled.${e.reason?` Reason: ${e.reason}`:""}`,getInAppPayload:e=>({title:"Job Cancelled",message:`Job #${e.jobNumber||"N/A"} has been cancelled`,type:"job",actionUrl:e.jobId?`/jobs/${e.jobId}`:void 0})},payment_received:{getSubject:e=>`Payment Received - ${e.amount||"N/A"}`,getWhatsAppMessage:e=>`💰 Payment Received

Amount: ${e.currency||"$"}${e.amount||"N/A"}
Invoice: #${e.invoiceNumber||"N/A"}
${e.jobNumber?`Job: #${e.jobNumber}`:""}

Thank you for your payment!`,getEmailBody:e=>`<h2>💰 Payment Received</h2>
<ul>
<li><strong>Amount:</strong> ${e.currency||"$"}${e.amount||"N/A"}</li>
<li><strong>Invoice:</strong> #${e.invoiceNumber||"N/A"}</li>
${e.jobNumber?`<li><strong>Job:</strong> #${e.jobNumber}</li>`:""}
</ul>
<p>Thank you for your payment!</p>`,getSmsMessage:e=>`Payment received: ${e.currency||"$"}${e.amount||"N/A"} for invoice #${e.invoiceNumber||"N/A"}. Thank you!`,getInAppPayload:e=>({title:"Payment Received",message:`${e.currency||"$"}${e.amount||"N/A"} received for invoice #${e.invoiceNumber||"N/A"}`,type:"payment"})},payment_failed:{getSubject:e=>`Payment Failed - ${e.amount||"N/A"}`,getWhatsAppMessage:e=>`⚠️ Payment Failed

Amount: ${e.currency||"$"}${e.amount||"N/A"}
Invoice: #${e.invoiceNumber||"N/A"}
${e.reason?`Reason: ${e.reason}`:""}

Please update your payment method or contact us.`,getEmailBody:e=>`<h2>⚠️ Payment Failed</h2>
<ul>
<li><strong>Amount:</strong> ${e.currency||"$"}${e.amount||"N/A"}</li>
<li><strong>Invoice:</strong> #${e.invoiceNumber||"N/A"}</li>
${e.reason?`<li><strong>Reason:</strong> ${e.reason}</li>`:""}
</ul>
<p>Please update your payment method or contact us.</p>`,getSmsMessage:e=>`Payment failed: ${e.currency||"$"}${e.amount||"N/A"} for invoice #${e.invoiceNumber||"N/A"}. Please update your payment method.`,getInAppPayload:e=>({title:"Payment Failed",message:`Payment of ${e.currency||"$"}${e.amount||"N/A"} failed for invoice #${e.invoiceNumber||"N/A"}`,type:"payment"})},lead_created:{getSubject:e=>`New Lead: ${e.leadName||"N/A"}`,getWhatsAppMessage:e=>`🎯 New Lead

Name: ${e.leadName||"N/A"}
Phone: ${e.leadPhone||"N/A"}
Source: ${e.source||"Manual"}
Service: ${e.serviceType||"N/A"}
${e.value?`Estimated Value: $${e.value}`:""}

Follow up promptly!`,getEmailBody:e=>`<h2>🎯 New Lead</h2>
<ul>
<li><strong>Name:</strong> ${e.leadName||"N/A"}</li>
<li><strong>Phone:</strong> ${e.leadPhone||"N/A"}</li>
<li><strong>Source:</strong> ${e.source||"Manual"}</li>
<li><strong>Service:</strong> ${e.serviceType||"N/A"}</li>
${e.value?`<li><strong>Estimated Value:</strong> $${e.value}</li>`:""}
</ul>
<p>Follow up promptly!</p>`,getSmsMessage:e=>`New lead: ${e.leadName||"N/A"} (${e.leadPhone||"N/A"}) - ${e.serviceType||"Service"}${e.value?` ($${e.value})`:""}`,getInAppPayload:e=>({title:"New Lead",message:`${e.leadName||"Lead"} - ${e.serviceType||"Service inquiry"}`,type:"lead"})},custom:{getSubject:e=>e.subject||"Notification",getWhatsAppMessage:e=>e.message||e.body||"You have a new notification.",getEmailBody:e=>e.htmlBody||`<p>${e.message||e.body||"You have a new notification."}</p>`,getSmsMessage:e=>e.message||e.body||"You have a new notification.",getInAppPayload:e=>({title:e.subject||"Notification",message:e.message||e.body||"You have a new notification.",type:e.notificationType||"info",actionUrl:e.actionUrl})}};async function s(e,t,i,s){let r=e.whatsappId||e.phone;if(!r)return{success:!1,error:"No WhatsApp phone number provided"};try{let a=await (0,o.sendJobNotification)({to:r,message:t,recipientName:e.name,recipientRole:"manager"===e.role?"employee":e.role,subject:i,jobId:s?.jobId,employeeId:s?.employeeId,customerId:s?.customerId,tenantId:s?.tenantId});return{success:a.success,error:a.error}}catch(e){return{success:!1,error:String(e)}}}async function r(e,t,o){if(!e)return{success:!1,error:"No email address provided"};let i=process.env.RESEND_API_KEY;if(i)try{let s=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${i}`,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.EMAIL_FROM||"ServiceOS <notifications@serviceos.app>",to:[e],subject:t,html:o})}),r=await s.json();if(s.ok)return{success:!0,externalId:r.id};return{success:!1,error:r.message||`Resend API error: ${s.status}`}}catch(e){return{success:!1,error:String(e)}}return console.log(`[NotificationOrchestrator] Email (simulated): to=${e}, subject="${t}"`),{success:!0,externalId:`sim_email_${Date.now()}`,simulated:!0}}async function a(e,t){if(!e)return{success:!1,error:"No phone number provided for SMS"};let o=process.env.TWILIO_ACCOUNT_SID,i=process.env.TWILIO_AUTH_TOKEN,s=process.env.TWILIO_PHONE_NUMBER;if(o&&i&&s)try{let r=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${o}/Messages.json`,{method:"POST",headers:{Authorization:`Basic ${Buffer.from(`${o}:${i}`).toString("base64")}`,"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({From:s,To:e,Body:t}).toString()}),a=await r.json();if(r.ok)return{success:!0,externalId:a.sid};return{success:!1,error:a.message||`Twilio API error: ${r.status}`}}catch(e){return{success:!1,error:String(e)}}return console.log(`[NotificationOrchestrator] SMS (simulated): to=${e}, message="${t.substring(0,50)}..."`),{success:!0,externalId:`sim_sms_${Date.now()}`,simulated:!0}}async function n(e,o,i){if(!e)return{success:!1,error:"No userId provided for in-app notification"};try{let s=await t.db.notification.create({data:{title:o.title,message:o.message,type:o.type,userId:e,tenantId:i?.tenantId||null}});return{success:!0,externalId:s.id}}catch(e){return{success:!1,error:String(e)}}}async function c(e,o,i,s,r,a){try{await t.db.notificationLog.create({data:{type:e,recipient:o.phone||o.email||o.userId||"unknown",recipientName:o.name,recipientRole:o.role,subject:s,message:i.substring(0,2e3),status:r.success?"sent":"failed",externalId:r.externalId,jobId:a?.jobId||null,employeeId:a?.employeeId||null,customerId:a?.customerId||null,tenantId:a?.tenantId||null,metadataJson:JSON.stringify({channel:e,simulated:r.simulated??!1,error:r.error})}})}catch(e){console.error("[NotificationOrchestrator] Failed to log notification attempt:",e)}}async function l(e,t=2,o=1e3){let i,s=0;for(let r=0;r<=t;r++){if(s++,(i=await e()).success||i.simulated)return{result:i,retried:r>0,attempts:s};if(i.error?.includes("No ")&&i.error?.includes("provided"))return{result:i,retried:!1,attempts:s};if(r<t){let e=o*Math.pow(2,r);console.log(`[NotificationOrchestrator] Retry ${r+1}/${t} after ${e}ms...`),await new Promise(t=>setTimeout(t,e))}}return{result:i,retried:s>1,attempts:s}}async function u(e){let t,o,u=Date.now(),d=[],m=e.maxRetries??2,p=i[e.template];for(let o of(console.log(`[NotificationOrchestrator] Starting: template=${e.template}, channels=[${e.channels.join(", ")}], recipient=${e.recipient.name||e.recipient.phone||e.recipient.email}`),e.channels)){let i,u,g;if(t)break;let $=Date.now();if(e.customMessage)i=e.customMessage,u=e.subject||p.getSubject(e.templateData);else{switch(o){case"whatsapp":default:i=p.getWhatsAppMessage(e.templateData);break;case"email":i=p.getEmailBody(e.templateData);break;case"sms":i=p.getSmsMessage(e.templateData)}u=e.subject||p.getSubject(e.templateData)}let b=!1,N=0;switch(o){case"whatsapp":{let t=await l(()=>s(e.recipient,i,u||"",e.context),m);g=t.result,b=t.retried,N=t.attempts;break}case"email":{let t=e.recipient.email;if(t){let e=await l(()=>r(t,u||"Notification",i),m);g=e.result,b=e.retried,N=e.attempts}else g={success:!1,error:"No email address provided"},N=1;break}case"sms":{let t=e.recipient.phone;if(t){let e=await l(()=>a(t,i),m);g=e.result,b=e.retried,N=e.attempts}else g={success:!1,error:"No phone number provided for SMS"},N=1;break}case"push":console.log("[NotificationOrchestrator] Push notifications not yet implemented"),g={success:!1,error:"Push notifications not yet implemented"},N=1;break;case"in_app":{let t=e.recipient.userId;if(t){let o=p.getInAppPayload(e.templateData),i=await l(()=>n(t,o,e.context),0);g=i.result,b=i.retried,N=i.attempts}else g={success:!1,error:"No userId provided for in-app notification"},N=1;break}default:g={success:!1,error:`Unknown channel: ${o}`},N=1}let h=Date.now()-$;d.push({channel:o,success:g.success,externalId:g.externalId,error:g.error,simulated:g.simulated,retried:b,attemptNumber:N,durationMs:h}),await c(o,e.recipient,i,u,g,e.context),g.success?(t=o,console.log(`[NotificationOrchestrator] Channel "${o}" succeeded${g.simulated?" (simulated)":""}`)):console.log(`[NotificationOrchestrator] Channel "${o}" failed: ${g.error}`)}if(!1!==e.alwaysInApp&&e.recipient.userId)if(d.some(e=>"in_app"===e.channel&&e.success)){let e=d.find(e=>"in_app"===e.channel&&e.success);o=e?.externalId}else{let t=p.getInAppPayload(e.templateData),i=await n(e.recipient.userId,t,e.context);i.success&&(o=i.externalId),await c("in_app",e.recipient,t.message,t.title,i,e.context)}let g=Date.now()-u,$=!!t||!!o;return console.log(`[NotificationOrchestrator] Completed: success=${$}, channel=${t||"none"}, duration=${g}ms, attempts=${d.length}`),{success:$,successfulChannel:t||(o?"in_app":void 0),attempts:d,totalDurationMs:g,inAppNotificationId:o}}e.s(["orchestrateNotification",()=>u])}];

//# sourceMappingURL=src_lib_notification-orchestrator_ts_087a27ca._.js.map