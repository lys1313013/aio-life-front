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
try {
 await page.goto('http://127.0.0.1:5666/auth/login');
 await page.locator('input:not([type=password])').first().fill('fixture');
 await page.locator('input[type=password]').fill('fixture-password');
 await page.locator('button').filter({hasText:/^登录$/}).click();
 await page.getByText('支出',{exact:true}).first().click();
 await page.getByRole('button',{name:'新增',exact:true}).click();
 await dialog().getByPlaceholder('交易金额',{exact:true}).fill('88.50');
 await dialog().getByPlaceholder('请输入',{exact:true}).fill('模拟耳机');
 for(let i=0;i<2;i++){
  await dialog().locator('.ant-select').nth(i).click();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
 }
 for(const width of [390,820,1440]) for(const dark of [false,true]) {
  await page.setViewportSize({width,height:1000});
  await page.evaluate(async ({dark,root})=>{const {updatePreferences}=await import(`/@fs${root}/packages/@core/preferences/src/index.ts`); updatePreferences({theme:{mode:dark?'dark':'light'}});},{dark,root:process.cwd()});
  await dialog().getByRole('button',{name:'关联设备',exact:true}).click();
  await expect(dialog().locator('.ant-select').last()).toBeVisible();
  await dialog().locator('.ant-select').last().click();
  await page.getByTitle('模拟耳机设备（带较长名称及配置） · 无线降噪 / 深空灰 · 2026-11-12').click();
  await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-existing.png`,fullPage:true});
  await save();
  await expect(dialog()).toContainText('模拟耳机设备');
  assert(!fixture.writes.some(x=>x.path==='/expense'));
  await dialog().getByRole('button',{name:'关联设备',exact:true}).click();
  await dialog().getByText('新建设备',{exact:true}).click();
  await expect(dialog().getByRole('textbox',{name:'设备名称',exact:true})).toHaveValue('模拟耳机');
  await page.screenshot({path:`${output}/${width}-${dark?'dark':'light'}-new.png`,fullPage:true});
  await save();
  await dialog().getByRole('button',{name:'取消设备关联',exact:true}).click();
 }
 await dialog().getByRole('button',{name:'关联设备',exact:true}).click();
 await dialog().getByText('新建设备',{exact:true}).click();
 await save();
 await save();
 await expect(page.locator('[role=dialog]:visible')).toHaveCount(0);
 assert.equal(fixture.writes.filter(x=>x.path==='/expense').length,1);
 assert.equal(fixture.writes.find(x=>x.path==='/expense').body.newDevice.name,'模拟耳机');
 assert.equal(fixture.writes.find(x=>x.path==='/expense').body.newDevice.purchasePrice,88.5);
 assert.deepEqual(errors,[]);
 console.log('WEB_OK',JSON.stringify(fixture.writes));
} catch(error) {
 await page.screenshot({path:`${output}/failure.png`,fullPage:true});
 await writeFile(`${output}/failure.txt`,`${error.stack}\n${await page.locator('body').innerText()}\n${JSON.stringify(errors)}`);
 throw error;
} finally { await browser.close(); }
