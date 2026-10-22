import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const output = new URL('.', import.meta.url).pathname;
const origin = 'http://127.0.0.1:5666';
const pref = `/@fs${process.cwd()}/packages/@core/preferences/src/index.ts`;
const specs = [['memo','最近笔记','/my-hub/memo'],['finance','本月收支','/finance-management/dashboard'],['video','视频续看','/my-hub/bilibili'],['device','我的设备','/my-hub/device']];
const browser = await chromium.launch({channel:'chrome'});
const context = await browser.newContext({viewport:{width:1440,height:1000}});
const page = await context.newPage();page.setDefaultTimeout(10000);
const errors=[]; const calls=[]; const writes=[]; const results=[];
page.on('pageerror',e=>errors.push(e.message));
let income=12345.67,expense=2345.67;let count=3, fail=false, delay=false, release=()=>{};
let pending=Promise.resolve();
function hold(){delay=true;pending=new Promise(r=>release=()=>{delay=false;r()});}
const cards=specs.map(([kind,title],i)=>({cardKey:`section.${kind}`,title,group:'section',enabled:true,sortOrder:i,icon:'mdi:note'}));
function payload(kind){
if(kind==='finance')return {refreshInterval:300,month:'2026-10',income,expense,balance:Math.round((income-expense)*100)/100};
return {refreshInterval:300,items:Array.from({length:count},(_,i)=>({id:`900719925474099${i+3}`,title:`${i===0?'这是用于检验长文本和标题换行的最近笔记或视频标题LongTitleExample':''}测试内容 ${i+1}`,name:`测试设备 ${i+1} MacBook Pro超长设备名称`,hiddenContent:i===0,updateTime:'2026-10-22T14:30:00',currentEpisode:3,episodes:10,progressPercent:25,watchedDuration:200,duration:800,resumeUrl:'https://www.bilibili.com/video/BV1xx?p=3&t=200',usageDays:250,dailyCost:11.25}))};
}
const menu=specs.map(([kind,title,path],i)=>({name:`Summary${kind}`,path,component:'/dashboard/home/index',meta:{title,menuId:String(i+1)}}));
menu.push(...['income','expense'].map(kind=>({name:kind,path:`/finance-management/${kind}`,component:'/dashboard/home/index',meta:{title:kind,menuId:kind}})));
const fixtures={
'/auth/login':{accessToken:'home-summary-fixture'}, '/user/info':{userId:'9007199254740993',id:'9007199254740993',username:'fixture',realName:'测试用户',roles:['user'],homePath:'/'}, '/auth/codes':[],
'/menu/all':[{name:'FixtureLayout',path:'/fixture',component:'BasicLayout',meta:{title:'生活'},children:[{name:'Home',path:'/',component:'/dashboard/home/index',meta:{title:'首页',keepAlive:true}},{name:'Profile',path:'/profile',component:'/_core/profile/index',meta:{title:'个人中心',keepAlive:true}},...menu]}],
'/menu/visuals':{menus:[],cards:Object.fromEntries(specs.map(([kind],i)=>[`section.${kind}`,{menuId:String(i+1)}]))}, '/auth/secondary-lock/menus':[], '/message/unread-count':{count:0},'/message/page':{items:[],total:0},'/message/list':[], '/menu/preferences':{menus:[],hiddenMenuIds:[]}, '/auth/wechat/web/capabilities':{enabled:false},'/dashboard/tasks':[], '/userbinds/list':[], '/home/cards':cards,
};
await page.route('**/api/**',async route=>{
const url=new URL(route.request().url()); if(!url.pathname.startsWith('/api/'))return route.continue(); const path=url.pathname.replace(/^\/api/,''); calls.push(path);
if(path.startsWith('/home/cards/')&&route.request().method()==='PUT'){const body=route.request().postDataJSON();cards.find(c=>c.cardKey===decodeURIComponent(path.split('/').at(-1))).enabled=body.enabled;writes.push({path,body});return route.fulfill({json:{code:0,data:cards}});}
if(path.startsWith('/home/sections/')){if(delay)await pending; if(fail)return route.fulfill({json:{code:1,message:'模拟刷新失败'}});return route.fulfill({json:{code:0,data:payload(path.split('/').at(-1))}});}
if(path.startsWith('/memo/')&&route.request().method()==='GET')return route.fulfill({json:{code:0,data:{id:path.split('/').at(-1),title:'详情标题',content:'隐藏正文仅在详情加载后显示',hiddenContent:true,updateTime:'2026-10-22T14:30:00'}}});
if(path.includes('getByDictType')||path.startsWith('/userDict'))return route.fulfill({json:{code:0,data:{dictDetailList:[{id:'9007199254740993',dictLabel:'测试类别',dictValue:'fixture'}]}}});
if(['POST','PUT'].includes(route.request().method())&&path!='/auth/login'){writes.push({path,method:route.request().method(),body:route.request().postDataJSON()});if(path==='/expense')expense+=Number(route.request().postDataJSON().amt);if(path==='/income')income+=Number(route.request().postDataJSON().amt);return route.fulfill({json:{code:0,data:true}});}
return route.fulfill({json:{code:0,data:fixtures[path]??[]}});
});
async function geometry(){return page.locator('.summary-home-card').evaluateAll(els=>els.map(el=>({title:el.getAttribute('aria-label'),height:el.getBoundingClientRect().height,width:el.getBoundingClientRect().width,scrollWidth:el.scrollWidth,top:el.offsetTop})));}
async function settle(){await page.waitForFunction(()=>[...document.querySelectorAll('.summary-home-card')].length===4&&[...document.querySelectorAll('.summary-home-card')].every(e=>e.getAttribute('aria-busy')==='false'));await page.waitForTimeout(180);}
async function refresh(){for(const [,title]of specs)await page.getByRole('button',{name:`刷新${title}`,exact:true}).click();}
try{
hold();await page.goto(`${origin}/auth/login`);await page.locator('input:not([type=password])').first().fill('fixture');await page.locator('input[type=password]').fill('fixture-password');await page.locator('button').filter({hasText:/^登录$/}).click();
await page.locator('.summary-home-card').first().waitFor({timeout:30000});
for(const width of (process.env.FAST ? [1440] : [390,820,1440]))for(const dark of (process.env.FAST ? [true] : [false,true])){
count=3;fail=false;
await page.setViewportSize({width,height:1000});
if(results.length){hold();await page.reload();await page.locator('.summary-home-card').first().waitFor();}
await page.evaluate(async({pref,dark})=>{const{updatePreferences}=await import(pref);updatePreferences({theme:{mode:dark?'dark':'light'}})},{pref,dark});
await page.waitForFunction(d=>document.documentElement.classList.contains('dark')===d,dark);
await page.locator('.summary-home-card [role=status]').first().waitFor();await page.waitForTimeout(180);
const initial=await geometry();await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-loading.png`,fullPage:true});release();await settle();const multi=await geometry();
assert(multi.every(g=>g.scrollWidth<=g.width+1),'horizontal overflow');
await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-multi.png`,fullPage:true});
hold();await refresh();await page.waitForTimeout(100);assert.deepEqual(await geometry(),multi,'refresh changed geometry');release();await settle();
fail=true;await refresh();await settle();assert.deepEqual(await geometry(),multi,'failed refresh changed geometry');await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-error.png`,fullPage:true});
fail=false;count=1;await refresh();await settle();const single=await geometry();
count=0;await refresh();await settle();const empty=await geometry();
assert.equal(await page.getByText('暂无笔记',{exact:true}).count(),1);assert.equal(await page.getByText('暂无进行中的视频',{exact:true}).count(),1);assert.equal(await page.getByText('暂无在用设备',{exact:true}).count(),1);
hold();await refresh();await page.waitForTimeout(100);assert.deepEqual(await geometry(),empty,'empty refresh changed geometry');release();await settle();
await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-empty.png`,fullPage:true});
results.push({width,dark,initial,multi,single,empty});
}
count=3;await refresh();await settle();
await page.getByRole('button',{name:/编辑笔记：/}).first().click();await page.getByRole('textbox',{name:'笔记正文',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'笔记正文',exact:true}).inputValue(),'隐藏正文仅在详情加载后显示');
await page.getByRole('textbox',{name:'笔记标题',exact:true}).fill('保存后的笔记标题');await page.locator('.memo-modal').getByRole('button',{name:/确\s*定|保\s*存/}).click();await page.waitForTimeout(300);assert(writes.some(w=>w.method==='PUT'&&w.path==='/memo/9007199254740993'&&w.body.title==='保存后的笔记标题'));
await page.getByRole('button',{name:'记一笔',exact:true}).click();await page.waitForTimeout(700);await page.screenshot({path:`${output}/expense-form.png`,fullPage:true});
await writeFile(`${output}/finance-form-dom.txt`,await page.locator('body').innerText());
await page.getByPlaceholder('交易金额',{exact:true}).fill('88.50');
assert.equal(await page.getByPlaceholder('实际记账的钱',{exact:true}).inputValue(),'88.50');
for(let i=0;i<2;i++){await page.locator('[role=dialog]:visible .ant-select').nth(i).click();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.waitForTimeout(200);}
await page.locator('[role=dialog]:visible').getByRole('button',{name:/保\s*存/}).click();await page.waitForTimeout(300);
assert(writes.some(w=>w.path==='/expense'&&w.body.amt==='88.50'&&w.body.expTypeId==='9007199254740993'));
await page.getByRole('button',{name:'记一笔',exact:true}).click();await page.waitForTimeout(400);await page.locator('[role=dialog]:visible').getByText('收入',{exact:true}).click();await page.waitForTimeout(350);
await page.locator('[role=dialog]:visible').getByPlaceholder('请输入',{exact:true}).first().fill('123.45');
await page.locator('[role=dialog]:visible .ant-select').click();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.waitForTimeout(200);
await page.screenshot({path:`${output}/income-form.png`,fullPage:true});
await page.locator('[role=dialog]:visible').getByRole('button',{name:/保\s*存/}).click();await page.waitForTimeout(300);assert(writes.some(w=>w.path==='/income'&&w.body.amt==='123.45'&&w.body.incTypeId==='9007199254740993'));
await page.locator('.summary-home-card[aria-label=本月收支]').getByText('12,469.12',{exact:true}).waitFor();await page.locator('.summary-home-card[aria-label=本月收支]').getByText('2,434.17',{exact:true}).waitFor();await page.locator('.summary-home-card[aria-label=本月收支]').getByText('10,034.95',{exact:true}).waitFor();await page.screenshot({path:`${output}/finance-updated.png`,fullPage:true});
await page.goto(`${origin}/profile`);await page.getByText('首页卡片',{exact:true}).first().click();
for(const[,title]of specs){const toggle=page.getByRole('switch',{name:`显示${title}`,exact:true});await toggle.click();await page.waitForTimeout(100);assert.equal(await toggle.getAttribute('aria-checked'),'false');await toggle.click();await page.waitForTimeout(100);assert.equal(await toggle.getAttribute('aria-checked'),'true');}
await page.screenshot({path:`${output}/settings-four-cards.png`,fullPage:true});
const firstLoadTransitions=[];
for(const width of [390,820,1440])for(const dark of [false,true]){
 await page.setViewportSize({width,height:1000});
 for(const initialCount of [0,1]){
  count=initialCount;hold();await page.goto(`${origin}/`);await page.reload();await page.locator('.summary-home-card [role=status]').first().waitFor();
  await page.evaluate(async({pref,dark})=>{const{updatePreferences}=await import(pref);updatePreferences({theme:{mode:dark?'dark':'light'}})},{pref,dark});
  const before=await geometry();release();await settle();firstLoadTransitions.push({width,dark,count:initialCount,before,after:await geometry()});
 }
 fail=true;await page.reload();await settle();assert.equal(await page.getByRole('button',{name:'加载失败，点击重试',exact:true}).count(),4);
 await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-first-error.png`,fullPage:true});
 fail=false;count=3;for(let i=0;i<4;i++)await page.getByRole('button',{name:'加载失败，点击重试',exact:true}).first().click();await settle();assert.equal(await page.getByRole('button',{name:'加载失败，点击重试',exact:true}).count(),0);
}
await writeFile(`${output}/first-load-transitions.json`,JSON.stringify(firstLoadTransitions,null,2));


await writeFile(`${output}/geometry.json`,JSON.stringify({results,writes,errors,calls},null,2));
console.log('VISUAL_OK',JSON.stringify({cases:results.length,errors,writes}));
}catch(e){console.error('FAIL',e);await page.screenshot({path:`${output}/failure.png`,fullPage:true});await writeFile(`${output}/failure.txt`,JSON.stringify({error:String(e),errors,calls,body:await page.locator('body').innerText()},null,2));process.exitCode=1;}finally{await browser.close();}
