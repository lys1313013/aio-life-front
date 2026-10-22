import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {installFixture,specs} from './fixture.mjs';
const output=new URL('.',import.meta.url).pathname;
const origin='http://127.0.0.1:5666';
const pref=`/@fs${process.cwd()}/packages/@core/preferences/src/index.ts`;
const browser=await chromium.launch({channel:'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);
const f=await installFixture(page);const errors=[];const results=[];page.on('pageerror',error=>errors.push(error.message));
const titles=Object.fromEntries(specs.map(([key,title])=>[key,title]));
const card=kind=>page.locator(`.summary-home-card[aria-label="${titles[kind]}"]`);
const range=(kind,period)=>card(kind).getByRole('button',{name:`${titles[kind]}范围：${{month:'本月',year:'本年',all:'全部'}[period]}`,exact:true});
const value=n=>n.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
const label=period=>({month:'2026年10月',year:'2026年',all:'全部'}[period]);
async function geo(){return page.locator('.summary-home-card').evaluateAll(els=>els.map(e=>({title:e.getAttribute('aria-label'),height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width,scrollWidth:e.scrollWidth,top:(()=>{let top=e.getBoundingClientRect().top+window.scrollY;for(let p=e.parentElement;p&&p!==document.documentElement;p=p.parentElement)top+=p.scrollTop;return top;})()})));}
async function thumbs(){return page.locator('.summary-home-card .summary-row > div[style]').evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));}
async function shot(path){await page.evaluate(()=>{window.scrollTo(0,0);for(const el of document.querySelectorAll('*'))if(el.scrollTop)el.scrollTop=0;});await page.waitForTimeout(100);await page.screenshot({path,fullPage:true});}
async function settle(){await page.waitForFunction(()=>document.querySelectorAll('.summary-home-card').length===6&&[...document.querySelectorAll('.summary-home-card')].every(e=>e.getAttribute('aria-busy')==='false'));await page.waitForTimeout(100);}
async function assertPeriod(kind,period){assert.equal(await range(kind,period).getAttribute('aria-pressed'),'true',`${kind}:selected ${period}`);const text=await card(kind).innerText();assert(text.includes(label(period)),`${kind}:label ${period}`);const amounts=f.totals(period);for(const metric of kind==='finance'?['income','expense','balance']:[kind])assert(text.includes(value(amounts[metric])),`${kind}:${period}:${metric} ${text}`);}
async function theme(dark){await page.evaluate(async({pref,dark})=>{const{updatePreferences}=await import(pref);updatePreferences({theme:{mode:dark?'dark':'light'}})},{pref,dark});await page.waitForFunction(dark=>document.documentElement.classList.contains('dark')===dark,dark);}
async function waitRequest(kind,period,before){await page.waitForTimeout(40);assert(f.events.slice(before).some(e=>e.path===`/home/sections/${kind}`&&e.query.period===period),`request ${kind}:${period}`);}
try{
 await page.goto(`${origin}/auth/login`);await page.locator('input:not([type=password])').first().fill('fixture');await page.locator('input[type=password]').fill('fixture-password');await page.locator('button').filter({hasText:/^登录$/}).click();await settle();
 for(const width of (process.env.FAST?[1440]:[390,820,1440]))for(const dark of (process.env.FAST?[true]:[false,true])){
  await page.setViewportSize({width,height:1000});let release=f.hold('sections');let imagesRelease=f.hold('images');await page.reload();await page.locator('.summary-home-card').first().waitFor();await theme(dark);await page.waitForTimeout(120);const loading=await geo();await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-loading.png`,fullPage:true});release();await settle();const imagesPending=await geo();const thumbnailPending=await thumbs();imagesRelease();await page.waitForTimeout(350);const loaded=await geo();assert.deepEqual(loaded,imagesPending,'image response changes card geometry');assert.deepEqual(await thumbs(),thumbnailPending,'thumbnail response changes image geometry');assert.equal(await card('video').locator('img').count(),1);assert.equal(await card('device').locator('img').count(),1);assert.equal(await card('video').getByRole('button',{name:'重试封面',exact:true}).count(),1);assert.equal(await card('device').getByRole('button',{name:'重试设备图片',exact:true}).count(),1);assert(loaded.every(g=>g.scrollWidth<=g.width+1),'horizontal overflow');
  for(const kind of ['finance','income','expense'])await assertPeriod(kind,'month');
  await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-month-images.png`,fullPage:true});
  let before=f.events.length;release=f.hold('finance:year');await range('finance','year').click();await waitRequest('finance','year',before);await assertPeriod('finance','month');assert.equal(await range('finance','year').getAttribute('aria-busy'),'true');assert.deepEqual(await geo(),loaded,'pending period geometry');release();await settle();await assertPeriod('finance','year');await assertPeriod('income','month');await assertPeriod('expense','month');
  f.fail.add('income:year');await range('income','year').click();await settle();await assertPeriod('income','month');f.fail.delete('income:year');await range('income','all').click();await settle();await assertPeriod('income','all');
  before=f.events.length;release=f.hold('expense:year');await range('expense','year').click();await waitRequest('expense','year',before);await range('expense','all').click();await settle();await assertPeriod('expense','all');release();await page.waitForTimeout(250);await assertPeriod('expense','all');await assertPeriod('finance','year');await assertPeriod('income','all');
  await shot(`${output}/${width}-${dark?'dark':'light'}-independent-ranges.png`);
  results.push({width,dark,loading,imagesPending,loaded,rangeLoaded:await geo()});
 }
 // Both independent entry buttons must open the matching real form and update totals.
 for(const kind of ['income','expense']){
  await card(kind).getByRole('button',{name:`新增${titles[kind]}`,exact:true}).click();await page.waitForTimeout(450);
  const dialog=page.locator('[role=dialog]:visible');
  if(kind==='income')await dialog.getByPlaceholder('请输入',{exact:true}).first().fill('123.45');
  else {await dialog.getByPlaceholder('交易金额',{exact:true}).fill('88.50');assert.equal(await dialog.getByPlaceholder('实际记账的钱',{exact:true}).inputValue(),'88.50');}
  for(let i=0;i<(kind==='income'?1:2);i++){await dialog.locator('.ant-select').nth(i).click();await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');await page.waitForTimeout(150);}
  await page.screenshot({path:`${output}/${kind}-entry.png`,fullPage:true});await dialog.getByRole('button',{name:/保\s*存/}).click();await page.waitForTimeout(350);await settle();assert(f.writes.some(w=>w.path===`/${kind}`&&w.body.amt===(kind==='income'?'123.45':'88.50')));await assertPeriod(kind,'all');await assertPeriod('finance','year');
 }
 await page.screenshot({path:`${output}/updated-totals.png`,fullPage:true});
 assert.deepEqual(errors,[]);await writeFile(`${output}/results.json`,JSON.stringify({results,errors,events:f.events,writes:f.writes},null,2));console.log('V2_OK',JSON.stringify({combinations:results.length,writes:f.writes}));
}catch(error){console.error(error);await page.screenshot({path:`${output}/failure.png`,fullPage:true});await writeFile(`${output}/failure.json`,JSON.stringify({error:String(error),errors,results,events:f.events,writes:f.writes,body:await page.locator('body').innerText()},null,2));process.exitCode=1;}finally{await browser.close();}
