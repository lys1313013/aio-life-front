import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { installFixture } from '../home-summary-visual-v2/fixture.mjs';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: {width:1440,height:1000} });
page.setDefaultTimeout(12000);
const errors=[]; page.on('pageerror', e=>errors.push(e.message));
const fixture = await installFixture(page);
const output = new URL('.', import.meta.url).pathname;
const id='9223372036854775806';
await page.route('**/api/menu/all',r=>r.fulfill({json:{code:0,data:[{name:'FixtureLayout',path:'/fixture',component:'BasicLayout',meta:{title:'生活'},children:[{name:'Home',path:'/',component:'/dashboard/home/index',meta:{title:'首页'}},{name:'Expense',path:'/finance/expense',component:'/my-hub/expense/index',meta:{title:'支出'}}]}]}}));
await page.route('**/api/expense/query*',r=>r.fulfill({json:{code:0,data:{items:[],total:0}}}));
await page.route('**/api/device/query*',r=>r.fulfill({json:{code:0,data:{items:[{id,name:'模拟耳机设备（带较长名称及配置）',spec:'无线降噪 / 深空灰',purchaseDate:'2026-11-12'}],total:1}}}));
await page.route('**/api/expense/statisticsBy*',r=>r.fulfill({json:{code:0,data:[]}}));
const dialog=()=>page.locator('[role=dialog]:visible').last();
const save=()=>dialog().getByRole('button',{name:/保\s*存|确\s*定/}).last().click();

await page.route('**/api/userDictType/getByDictType*',r=>r.fulfill({json:{code:0,data:{dictDetailList:new URL(r.request().url()).searchParams.get('dictType')==='exp_type' ? [
 {id:'9223372036854775806',dictLabel:'餐饮美食',dictValue:'1',icon:'mdi:food',color:'#F97316'},
 {id:'9223372036854775805',dictLabel:'交通出行',dictValue:'2',icon:'mdi:train',color:'#34A6FF'},
 {id:'9223372036854775804',dictLabel:'其他',dictValue:'3'}
] : [{id:'9223372036854775803',dictLabel:'支付宝',dictValue:'1'}]}}}));
try {
 await page.goto('http://127.0.0.1:5666/auth/login');
 await page.locator('input:not([type=password])').first().fill('fixture');
 await page.locator('input[type=password]').fill('fixture-password');
 await page.locator('button').filter({hasText:/^登录$/}).click();
 await page.getByText('支出',{exact:true}).first().click();
 await page.getByRole('button',{name:'新增',exact:true}).click();
 const form=dialog();
 const select=form.locator('.ant-select').first();
 for(const width of [390,820,1440]) for(const dark of [false,true]) {
  await page.setViewportSize({width,height:1000});
  await page.evaluate(async ({dark,root})=>{const {updatePreferences}=await import(`/@fs${root}/packages/@core/preferences/src/index.ts`); updatePreferences({theme:{mode:dark?'dark':'light'}});},{dark,root:process.cwd()});
  await select.click();
  const options=page.locator('.ant-select-dropdown:visible .ant-select-item-option');
  await expect(options).toHaveCount(3);
  await expect(options.filter({hasText:'餐饮美食'}).locator('svg')).toHaveCount(1);
  await expect(options.filter({hasText:'交通出行'}).locator('svg')).toHaveCount(1);
  await expect(options.filter({hasText:'其他'}).locator('svg')).toHaveCount(0);
  await options.filter({hasText:'餐饮美食'}).click();
  await expect(select.locator('.ant-select-selection-item svg')).toHaveCount(1);
  await expect(select.locator('.ant-select-selection-item svg')).toHaveCSS('color','rgb(249, 115, 22)');
  await form.screenshot({path:`${output}/icon-selected-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
  await select.click();
  await form.screenshot({path:`${output}/icon-options-${width}-${dark?'dark':'light'}.png`,animations:'disabled'});
  await select.locator('input').fill('交通');
  await expect(options).toHaveCount(1);
  await expect(options).toContainText('交通出行');
  await options.click();
  await expect(select.locator('.ant-select-selection-item svg')).toHaveCSS('color','rgb(52, 166, 255)');
 }
 await form.getByPlaceholder('交易金额',{exact:true}).fill('88.50');
 await form.locator('.ant-select').nth(1).click();
 await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({hasText:'支付宝'}).click();
 await save();
 await expect(page.locator('[role=dialog]:visible')).toHaveCount(0);
 assert.equal(fixture.writes.find(x=>x.path==='/expense').body.expTypeId,'9223372036854775805');
 assert.deepEqual(errors,[]);
 console.log('ICON_OK: options, selected value, colors, missing icon, search, string ID save; 6 viewport/theme combinations');
} catch(error) {
 await page.screenshot({path:`${output}/icon-failure.png`});
 await writeFile(`${output}/icon-failure.txt`,`${error.stack}\n${await page.locator('body').innerText()}\n${JSON.stringify(errors)}`);
 throw error;
} finally {await browser.close();}
