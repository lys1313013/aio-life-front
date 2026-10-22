// Browser HTTP fixture: no real account/data writes and no Vue state injection.
export const specs = [
 ['memo','最近笔记','/my-hub/memo'],
 ['finance','收支概览','/finance-management/dashboard'],
 ['income','收入','/finance-management/income'],
 ['expense','支出','/finance-management/expense'],
 ['video','视频续看','/my-hub/bilibili'],
 ['device','我的设备','/my-hub/device'],
];
export async function installFixture(page) {
 const events=[];const writes=[];const fail=new Set();const held=new Map();
 let count=3;let addedIncome=0;let addedExpense=0;
 const cards=specs.map(([kind,title],i)=>({cardKey:`section.${kind}`,title,group:'section',enabled:true,sortOrder:i,icon:'mdi:note'}));
 const menus=specs.map(([kind,title,path],i)=>({name:`Summary${kind}`,path,component:'/dashboard/home/index',meta:{title,menuId:String(i+1)}}));
 const fixtures={
 '/auth/login':{accessToken:'home-summary-v2-fixture'},'/user/info':{userId:'9007199254740993',id:'9007199254740993',username:'fixture',realName:'测试用户',roles:['user'],homePath:'/'},'/auth/codes':[],
 '/menu/all':[{name:'FixtureLayout',path:'/fixture',component:'BasicLayout',meta:{title:'生活'},children:[{name:'Home',path:'/',component:'/dashboard/home/index',meta:{title:'首页',keepAlive:true}},{name:'Profile',path:'/profile',component:'/_core/profile/index',meta:{title:'个人中心',keepAlive:true}},...menus]}],
 '/menu/visuals':{menus:[],cards:Object.fromEntries(specs.map(([kind],i)=>[`section.${kind}`,{menuId:String(i+1)}]))},'/auth/secondary-lock/menus':[],'/message/unread-count':{count:0},'/message/page':{items:[],total:0},'/message/list':[],'/menu/preferences':{menus:[],hiddenMenuIds:[]},'/auth/wechat/web/capabilities':{enabled:false},'/dashboard/tasks':[],'/userbinds/list':[],'/home/cards':cards,
 };
 function hold(key) {let release;const promise=new Promise(r=>release=r);held.set(key,{promise,release});return ()=>{held.delete(key);release();};}
 function totals(period) {const factor={month:1,year:10,all:100}[period];const income=1000*factor+addedIncome;const expense=200*factor+addedExpense;return {income,expense,balance:income-expense};}
 function payload(kind,period='month') {
  if(['finance','income','expense'].includes(kind)){const data={refreshInterval:300,period,label:{month:'2026年10月',year:'2026年',all:'全部'}[period],startDate:period==='all'?null:period==='year'?'2026-01-01':'2026-10-01',endDate:period==='all'?null:period==='year'?'2026-12-31':'2026-10-31',month:period==='month'?'2026-10':null};return kind==='finance'?{...data,...totals(period)}:{...data,amount:totals(period)[kind]};}
  return {refreshInterval:300,items:Array.from({length:count},(_,i)=>({id:`900719925474099${i+3}`,title:`${i===0?'用于验证卡片长标题换行与封面缩略图占位的标题 ':''}测试内容 ${i+1}`,name:`测试设备 ${i+1} MacBook Pro 超长设备名称`,hiddenContent:i===0,updateTime:'2026-10-22T14:30:00',currentEpisode:3,episodes:10,progressPercent:25,watchedDuration:200,duration:800,resumeUrl:'https://www.bilibili.com/video/BV1xx?p=3&t=200',usageDays:250,dailyCost:11.25,
   coverFileId:i===0?'9007199254741993':i===1?'9007199254741994':null,coverState:i===0?'READY':i===1?'FAILED':'NONE',fileId:i===0?'9007199254741995':i===1?'9007199254741994':null,
  }))};
 }
 await page.route('https://fixture.invalid/**',async route=>{
  const url=route.request().url();events.push({type:'image',url});const key='images';if(held.has(key))await held.get(key).promise;
  if(url.includes('broken'))return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect width="160" height="100" fill="#234f72"/><rect x="30" y="15" width="100" height="60" rx="4" fill="#72c5ef"/><path d="M20 80h120" stroke="#c3e7ff" stroke-width="8"/></svg>'});
 });
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());if(!url.pathname.startsWith('/api/'))return route.continue();const path=url.pathname.slice(4);const method=route.request().method();
  const event={path,method,query:Object.fromEntries(url.searchParams),at:Date.now()};events.push(event);
  if(path.startsWith('/file/preview/')){if(held.has('images'))await held.get('images').promise;if(path.endsWith('1994'))return route.fulfill({status:404,body:''});return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#234f72"/><rect x="30" y="15" width="100" height="60" rx="4" fill="#72c5ef"/><path d="M20 80h120" stroke="#c3e7ff" stroke-width="8"/></svg>'});}
  if(path.startsWith('/home/sections/')){
   const kind=path.split('/').at(-1),period=url.searchParams.get('period')||'month';const key=`${kind}:${period}`;const result=payload(kind,period);
   for(const match of ['sections',key])if(held.has(match))await held.get(match).promise;
   if(fail.has(key)||fail.has('sections'))return route.fulfill({json:{code:1,message:'模拟范围查询失败'}});
   event.response=result;return route.fulfill({json:{code:0,data:result}});
  }
  if(path.startsWith('/home/cards/')&&method==='PUT'){const body=route.request().postDataJSON();cards.find(c=>c.cardKey===decodeURIComponent(path.split('/').at(-1))).enabled=body.enabled;writes.push({path,body});return route.fulfill({json:{code:0,data:cards}});}
  if(path.startsWith('/memo/')&&method==='GET')return route.fulfill({json:{code:0,data:{id:path.split('/').at(-1),title:'详情标题',content:'隐藏正文仅在详情加载后显示',hiddenContent:true,updateTime:'2026-10-22T14:30:00'}}});
  if(path.includes('getByDictType')||path.startsWith('/userDict'))return route.fulfill({json:{code:0,data:{dictDetailList:[{id:'9007199254740993',dictLabel:'测试类别',dictValue:'fixture'}]}}});
  if(['POST','PUT'].includes(method)&&path!='/auth/login'){const body=route.request().postDataJSON();writes.push({path,method,body});if(path==='/income')addedIncome+=Number(body.amt);if(path==='/expense')addedExpense+=Number(body.amt);return route.fulfill({json:{code:0,data:true}});}
  return route.fulfill({json:{code:0,data:fixtures[path]??[]}});
 });
 return {specs,events,writes,hold,fail,totals,setCount(value){count=value;},payload};
}
