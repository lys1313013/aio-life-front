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
 const form=dialog();
 const rects=async()=>Promise.all([
  form.getByPlaceholder('交易金额',{exact:true}),
  form.getByPlaceholder('实际记账的钱',{exact:true}),
  form.locator('.ant-select').nth(0),
  form.locator('.ant-select').nth(1),
  form.locator('.ant-picker'),
  form.getByPlaceholder('请输入',{exact:true}),
 ].map(x=>x.boundingBox()));
 for(const width of [390,820,1440]) for(const dark of [false,true]) {
  await page.setViewportSize({width,height:1000});
  await page.evaluate(async ({dark,root})=>{const {updatePreferences}=await import(`/@fs${root}/packages/@core/preferences/src/index.ts`); updatePreferences({theme:{mode:dark?'dark':'light'}});},{dark,root:process.cwd()});
  await expect.poll(()=>form.locator('.app-form-fields').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(width<480?1:2);
  const boxes=await rects();
  for(let i=0;i<boxes.length;i+=2) {
   const [a,b]=[boxes[i],boxes[i+1]];
   assert(a && b);
   if(width>=480) {assert(Math.abs(a.y-b.y)<2);assert(b.x>a.x+a.width);assert(Math.abs(a.width-b.width)<2);}
   else assert(b.y>=a.y+a.height);
  }
  await page.screenshot({path:`${output}/layout-${width}-${dark?'dark':'light'}.png`});
 }
 await form.getByPlaceholder('交易金额',{exact:true}).fill('88.50');
 await expect(form.getByPlaceholder('实际记账的钱',{exact:true})).toHaveValue('88.50');
 await save();
 await expect(form).toContainText('请选择支出类型');
 await expect(form).toContainText('请选择支付方式');
 await page.screenshot({path:`${output}/layout-validation.png`});
 assert.deepEqual(errors,[]);
 console.log('LAYOUT_OK: 6 viewport/theme combinations; amount linkage and validation intact');
} finally {await browser.close();}
