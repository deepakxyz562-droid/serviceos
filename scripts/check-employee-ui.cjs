// Start mobile-employee Expo web on port 8083, then run: node scripts/check-employee-ui.cjs
// Uses an isolated browser and mocked API responses; never writes to the live backend.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[];page.on('pageerror', e=>errors.push(e.message));
const user={id:'preview-user',employeeId:'preview-employee',name:'Alex Morgan',email:'alex@example.test',role:'employee'};
const date=new Date().toISOString();
const jobs=[{id:'dispatch-job',title:'Air conditioner service',status:'accepted',lifecycleState:'accepted',scheduledAt:date,customer:{name:'Taylor',phone:'123456789'},address:'24 Park Street',isAssignedToMe:true,isCreatedByMe:false},{id:'created-job',title:'Kitchen tap repair',status:'assigned',lifecycleState:'assigned',scheduledAt:date,customer:{name:'Jordan'},address:'8 Lake Road',isAssignedToMe:true,isCreatedByMe:true}];
let commands=0;
await page.route('**/api/**', async route=>{const p=new URL(route.request().url()).pathname;let body={};
 if(p==='/api/auth/me') body={user,tenant:{id:'preview',name:'Preview Services',currency:'USD'}};
 else if(p==='/api/employee/jobs') body=jobs;
 else if(p==='/api/employee/shift/today') body={activeShift:null};
 else if(p==='/api/employee/shift/week') body={shifts:[],totalHours:0};
 else if(p==='/api/notifications/unread-count') body={count:2};
 else if(p==='/api/ai/voice-command'){commands++;body={success:true,data:{job:{id:'new',title:'Preview job'}}};}
 else if(p==='/api/employee/profile') body={...user,employee:user};
 await route.fulfill({json:body});});
await page.addInitScript(({user})=>{localStorage.setItem('fieseros_pro_auth_token','local-preview-only');localStorage.setItem('fieseros_pro_user_data',JSON.stringify(user));localStorage.setItem('fieseros_pro_active_role','employee');const d=new Date();const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;localStorage.setItem(`fieseros_prestart_${key}`,'completed');},{user});
await page.goto('http://localhost:8083',{waitUntil:'domcontentloaded',timeout:120000});
await page.getByRole('button',{name:'Open Voice AI assistant'}).waitFor({timeout:120000});
await page.screenshot({path:'/tmp/employee-today.png'});
const url=page.url();await page.getByRole('button',{name:'Open Voice AI assistant'}).click();
await page.getByLabel('Job command').fill('Create a tap repair job tomorrow for Jordan');
await page.getByText('Review command',{exact:true}).click();
await page.getByText('Ready to submit?',{exact:true}).waitFor();assert.equal(commands,0);assert.equal(page.url(),url);
await page.screenshot({path:'/tmp/employee-voice.png'});
await page.getByText('Confirm & submit',{exact:true}).click();
await page.getByText('Preview job',{exact:true}).waitFor();assert.equal(commands,1);
await page.getByRole('button',{name:'Close voice assistant'}).click();
await page.waitForTimeout(400);
await page.getByRole('tab',{name:'Jobs'}).click();await page.waitForTimeout(400);
await page.getByRole('button',{name:'Open job for Jordan',exact:true}).waitFor();
await page.getByText('Filters',{exact:true}).click();
await page.getByText('Created (1)',{exact:true}).click();
await page.getByText('Show 1 jobs',{exact:true}).click();
await page.getByRole('button',{name:'Open job for Jordan',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Open job for Taylor',exact:true}).count(),0);
await page.waitForTimeout(400);await page.screenshot({path:'/tmp/employee-jobs.png'});
await page.setViewportSize({width:320,height:740});await page.waitForTimeout(400);const bounds=await page.getByRole('button',{name:'Open Voice AI assistant'}).boundingBox();assert.ok(Math.abs(bounds.x+bounds.width/2-160)<2);await page.screenshot({path:'/tmp/employee-small.png'});
await page.getByRole('tab',{name:'Profile'}).click();await page.waitForTimeout(400);await page.getByRole('button',{name:'Shift & attendance Manage your shift and view logged hours'}).click();await page.waitForURL('**/shift');assert.deepEqual(errors,[]);console.log('PASS: centered voice action preserves route; command confirmation makes no premature request; assignment filter updates results; no runtime errors.');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
