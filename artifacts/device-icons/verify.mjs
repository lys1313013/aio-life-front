import { chromium, expect } from '../../../aio-life-mobile/node_modules/@playwright/test/index.mjs';
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { setup } = require('../../../aio-life-mobile/tests/e2e/qa-records-fixtures.js');
const catalog = require('../../../aio-life-mobile/src/services/icons/catalog.generated.json');
const out = 'artifacts/device-icons';
const typeId = '9223372036854775807';
const types = [
  {id:typeId,dictLabel:'手机',icon:'solar:smartphone-line-duotone',color:'#1890ff'},
  {id:'81',dictLabel:'电脑',icon:'solar:laptop-2-line-duotone',color:'#52c41a'},
  {id:'82',dictLabel:'其他',icon:'',color:null},
];
const rows = [
  {name:'随身手机',type:typeId}, {name:'工作笔记本电脑，包含较长的设备名称',type:'81'},
  {name:'未设置分类图标',type:'82'}, {name:'分类已移除',type:'missing'},
  {name:'手动上传图片',type:typeId,fileId:'photo'}, {name:'图片损坏后的分类回退',type:'81',fileId:'broken'},
].map((r,i)=>({id:String(100+i),purchasePrice:1000,purchaseDate:'2026-09-01',status:'1',spec:'模拟配置',...r}));
const picture='<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150"><rect width="200" height="150" rx="20" fill="#dbeafe"/><rect x="75" y="15" width="50" height="120" rx="8" fill="#2563eb"/></svg>';
const browser=await chromium.launch({channel:'chrome'});
const results=[];
try {
 for (const app of (process.env.VERIFY_APP ? [process.env.VERIFY_APP] : ['web','mobile'])) {
  const origin=app==='web'?'http://127.0.0.1:5666':'http://127.0.0.1:5180';
  console.log('start',app);
  const page=await browser.newPage({baseURL:origin,viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(20000);
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  let release; let hold = new Promise(resolve=>release=resolve); let fixed=false;
  if(app==='mobile') await setup(page,origin);
  const fixtures={
   '/auth/login':{accessToken:'synthetic-device-token'},
   '/user/info':{id:'7',userId:'7',username:'fixture',realName:'模拟用户',roles:['admin'],homePath:'/my-hub/device'},
   '/auth/codes':['admin'], '/auth/secondary-lock/menus':[],
   '/message/unread-count':{count:0}, '/menu/visuals':{menus:[],cards:{}},
   '/menu/preferences':{menus:[],hiddenMenuIds:[]}, '/auth/wechat/web/capabilities':{enabled:false},
   '/menu/all':[{name:'MyHub',path:'/my-hub',component:'BasicLayout',meta:{title:'生活'},children:[{name:'Device',path:'/my-hub/device',component:'my-hub/device/index',meta:{title:'设备',menuId:'1'}}]}],
  };
  await page.route('**/api/**',async route=>{
   const u=new URL(route.request().url()); if (!u.pathname.startsWith('/api/')) return route.fallback(); const path=u.pathname.replace(/^\/api/,'');
   if(path.startsWith('/file/preview/')) {
    if(hold) await Promise.race([hold, new Promise(resolve=>setTimeout(resolve,10000))]);
    return route.fulfill({contentType:'image/svg+xml',body:path.endsWith('/broken')&&!fixed?'broken-image':picture});
   }
   let data;
   if(path==='/device/query') data={items:rows,total:rows.length};
   else if(path.endsWith('/getByDictType')) data={dictDetailList:u.searchParams.get('dictType')==='device_type'?types:[{id:'1',dictValue:'1',value:'1',dictLabel:'使用中',label:'使用中'}]};
   else if(app==='mobile') return route.fallback();
   else data=fixtures[path]??[];
   return route.fulfill({json:{code:0,message:null,data}});
  });
  if(app==='web') {
   console.log('login nav'); await page.goto(origin+'/auth/login'); console.log('login form');
   await page.locator('input:not([type="password"])').first().fill('fixture');
   await page.locator('input[type="password"]').fill('fixture-password');
   await page.locator('button').filter({hasText:/^登录$/}).click(); console.log('clicked login',page.url());
   await page.waitForURL('**/my-hub/device', {waitUntil:'domcontentloaded'});
  } else await page.goto(origin+'/#/pages/goods/devices', {waitUntil:'domcontentloaded'});
  const cards=page.locator(app==='web'?'.electronics-card':'.goods-card');
  const media=app==='web'?'.card-image':'.goods-media';
  const fallback=app==='web'?'.device-type-icon':'.category-icon-image';
  const photo=app==='web'?'.device-img':'.goods-photo';
  console.log('loaded route',app,page.url());
  await expect(cards).toHaveCount(6);
  await expect(cards.nth(4).locator(app==='web'?'.image-skeleton':'.goods-image-skeleton')).toBeVisible();
  const before=await cards.nth(4).locator(media).boundingBox();
  release();hold=null;
  await expect(cards.nth(4).locator(photo)).toBeVisible();
  await expect(cards.nth(4).locator(fallback)).toHaveCount(0);
  await expect(cards.nth(5).locator(fallback)).toBeVisible();
  for(const [i,icon] of ['solar:smartphone-line-duotone','solar:laptop-2-line-duotone','solar:devices-line-duotone','solar:devices-line-duotone','', 'solar:laptop-2-line-duotone'].entries()) {
   if(!icon) continue;
   const el=cards.nth(i).locator(fallback);
   await expect(el).toBeVisible();
   if(app==='web') {
    await expect(el).toHaveClass(new RegExp('iconify--solar'));
    expect(await el.locator('path').first().getAttribute('d')).toBe(catalog.icons[icon].body.match(/<path[^>]*\bd="([^"]+)"/)[1]);
   } else {
    const source=await el.locator('img').getAttribute('src');
    expect(Buffer.from(source.split(',')[1], 'base64').toString()).toContain(catalog.icons[icon].body.match(/<path[^>]*\bd="([^"]+)"/)[1]);
   }
  }
  const after=await cards.nth(4).locator(media).boundingBox();
  expect(Math.abs(before.height-after.height)).toBeLessThan(1);
  expect(Math.abs(before.y-after.y)).toBeLessThan(1);
  if(app==='web') expect(await cards.first().locator(fallback).evaluate(el=>getComputedStyle(el).color)).toBe('rgb(24, 144, 255)');
  else expect(Buffer.from((await cards.first().locator(fallback).locator('img').getAttribute('src')).split(',')[1], 'base64').toString()).toContain('#1890ff');
  for(const width of [390,820,1440]) for(const theme of ['light','dark']) {
   await page.setViewportSize({width,height:1000});
   if(app==='web') await page.evaluate(async theme=>{
    const prefs=await import('/@fs/Users/hurry/Documents/GitHub/lys1313013/aio-life/aio-life-front/packages/@core/preferences/src/index.ts');
    prefs.updatePreferences({theme:{mode:theme},sidebar:{collapsed:true}});
   },theme);
   else await page.evaluate(async theme=>{const m=await import('/src/services/theme.ts');m.theme.mode=theme;},theme);
   await expect(cards.first().locator(fallback)).toBeVisible();
   await page.waitForTimeout(400);
   await page.screenshot({path:`${out}/${app}-${width}-${theme}.png`,fullPage:true});
   results.push({app,width,theme,cards:await cards.count()});
  }
  if(app==='mobile') {
   fixed=true;
   await page.getByRole('button',{name:'重试设备图片'}).click();
   await expect(cards.nth(5).locator(photo)).toBeVisible();
   await expect(cards.nth(5).locator(fallback)).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  await page.close();
 }
 await writeFile(`${out}/results-${process.env.VERIFY_APP || 'all'}.json`,JSON.stringify(results,null,2));
 console.log(JSON.stringify({passed:results.length,checks:'category matching including string ID, category color, missing icon/category fallback, uploaded photo priority, delayed image layout, image failure and mobile retry',screenshots:out}));
} catch(e) { console.error(e); process.exitCode=1; } finally {await browser.close();}
