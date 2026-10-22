import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {installFixture} from './fixture.mjs';
const output=new URL('.',import.meta.url).pathname;
const origin='http://127.0.0.1:5666';
const pref=`/@fs${process.cwd()}/packages/@core/preferences/src/index.ts`;
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);
const f=await installFixture(page);const errors=[];const results=[];page.on('pageerror',error=>errors.push(error.message));
async function measure(){return page.locator('.summary-home-card').evaluateAll(els=>els.filter(e=>['视频续看','我的设备'].includes(e.getAttribute('aria-label'))).map(e=>{const rect=e.getBoundingClientRect();const body=e.querySelector('.summary-body');const area=body.getBoundingClientRect();return {title:e.getAttribute('aria-label'),height:rect.height,width:rect.width,bodyHeight:area.height,rows:[...e.querySelectorAll('.summary-row')].map(row=>{const r=row.getBoundingClientRect();return{height:r.height,top:r.top-area.top,bottom:r.bottom-area.top,fullyVisible:r.top>=area.top&&r.bottom<=area.bottom};}),thumbs:[...e.querySelectorAll('.summary-row > div[style]')].map(t=>{const r=t.getBoundingClientRect();return {width:r.width,height:r.height};})};}));}
async function settle(){await page.waitForFunction(()=>document.querySelectorAll('.summary-home-card').length===6&&[...document.querySelectorAll('.summary-home-card')].every(e=>e.getAttribute('aria-busy')==='false'));await page.waitForTimeout(100);}
try{
 let release=f.hold('sections');let imageRelease=f.hold('images');
 await page.goto(`${origin}/auth/login`);await page.locator('input:not([type=password])').first().fill('fixture');await page.locator('input[type=password]').fill('fixture-password');await page.locator('button').filter({hasText:/^登录$/}).click();await page.locator('.summary-home-card').first().waitFor();
 for(const width of (process.env.FAST?[1440]:[390,820,1440]))for(const dark of (process.env.FAST?[true]:[false,true])){
  await page.setViewportSize({width,height:1000});
  if(results.length){release=f.hold('sections');imageRelease=f.hold('images');await page.reload();await page.locator('.summary-home-card').first().waitFor();}
  await page.evaluate(async({pref,dark})=>{const{updatePreferences}=await import(pref);updatePreferences({theme:{mode:dark?'dark':'light'}})},{pref,dark});await page.waitForTimeout(150);
  const loading=await measure();await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-media-initial.png`,fullPage:true});release();await settle();const data=await measure();
  for(let i=0;i<data.length;i++){assert.equal(data[i].height,loading[i].height,`${width}/${dark} ${data[i].title}:initial layout`);assert.equal(data[i].rows.length,3);assert(data[i].rows.every(r=>r.height===64&&r.fullyVisible),`${width}/${dark} ${data[i].title}:three rows visible ${JSON.stringify(data[i])}`);assert.equal(loading[i].rows.length,3);assert.deepEqual(loading[i].rows.map(r=>r.height),data[i].rows.map(r=>r.height));}
  imageRelease();await page.waitForTimeout(350);assert.deepEqual(await measure(),data,`${width}/${dark}:image response geometry`);await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-media-loaded.png`,fullPage:true});results.push({width,dark,loading,data});
 }
 assert.equal(f.events.filter(e=>e.path?.includes('getByDictType')).length,0,'homepage eagerly loads finance dictionaries');
 await page.locator('.summary-home-card[aria-label="收入"]').getByRole('button',{name:'新增收入',exact:true}).click();await page.locator('[role=dialog]:visible').waitFor();await page.waitForTimeout(300);assert(f.events.some(e=>e.path?.includes('getByDictType')),'first add did not load dictionaries');
 await page.locator('[role=dialog]:visible').getByPlaceholder('请输入',{exact:true}).first().waitFor();
 assert.deepEqual(f.events.filter(e=>e.path?.includes('getByDictType')).map(e=>e.query.dictType),['income_type']);
 await page.locator('[role=dialog]:visible').getByRole('button',{name:/取\s*消/}).click();await page.waitForTimeout(350);await page.locator('.summary-home-card[aria-label="支出"]').getByRole('button',{name:'新增支出',exact:true}).click();await page.locator('[role=dialog]:visible').getByPlaceholder('交易金额',{exact:true}).waitFor();await page.waitForTimeout(300);assert.deepEqual(f.events.filter(e=>e.path?.includes('getByDictType')).map(e=>e.query.dictType),['income_type','exp_type','pay_type']);
 assert.deepEqual(errors,[]);await writeFile(`${output}/media-initial-results.json`,JSON.stringify({results,errors,events:f.events},null,2));console.log('MEDIA_INITIAL_OK',JSON.stringify({cases:results.length,errors}));
}catch(error){console.error(error);await page.screenshot({path:`${output}/media-failure.png`,fullPage:true});await writeFile(`${output}/media-failure.json`,JSON.stringify({error:String(error),errors,results,events:f.events,measurement:await measure()},null,2));process.exitCode=1;}finally{await browser.close();}
