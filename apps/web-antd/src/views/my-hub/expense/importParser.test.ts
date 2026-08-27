import type { ParseContext } from './importParser';

import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import {
  parseCSV,
  parseMobileCSV,
  parseWechatExcel,
  splitCsvLine,
} from './importParser';

// 统一解析上下文：支付宝 payTypeId=p1，微信=p2，默认支出类型 d0
const ctx: ParseContext = {
  dictOptions: [
    { id: 'd0', label: '其他' },
    { id: 'd1', label: '餐饮美食' },
    { id: 'd2', label: '交通出行' },
  ],
  payTypeOptions: [
    { id: 'p1', dictValue: '1', label: '支付宝' },
    { id: 'p2', dictValue: '2', label: '微信' },
  ],
  defaultExpTypeId: 'd0',
};

// ==================== 支付宝手机端 CSV ====================

const MOBILE_HEADER =
  '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注,';

/** 构造手机端 CSV 文本，前置支付宝标准的元信息头 */
function buildMobileCsv(rows: string[]): string {
  return [
    '------------------------------------------------------------------------------------',
    '导出信息：',
    '姓名：张三',
    '支付宝账户：13800000000',
    '起始时间：[2026-07-01 00:00:00]    终止时间：[2026-07-31 23:59:59]',
    '导出交易类型：[全部]',
    '导出时间：[2026-08-26 21:20:10]',
    '特别提示：',
    '1.本回单内容可表明支付宝受理了相应支付交易申请；',
    '------------------------支付宝支付科技有限公司  电子客户回单------------------------',
    MOBILE_HEADER,
    ...rows,
  ].join('\n');
}

/**
 * 真实案例还原（2026-07 账单）：
 *  - 餐饮 15.00 交易成功（正常支出）
 *  - Kimi 会员 99.00 交易成功，之后部分退款 72.60（原交易状态不变，退款独立成行）
 *  - 滴滴 43.00 交易关闭 + 退款 43.00（全额退款，两边都不应计入）
 *  - 余额宝收益 0.01（不计收支）
 *  - 转账收入 14.00（收入）
 * 官方口径：总支出 = 所有支出求和(157.00) - 退款(115.60) = 41.40
 */
const REAL_CASE_CSV = buildMobileCsv([
  '2026-07-31 18:20:31,餐饮美食,某食堂,/,福州某餐饮公司,支出,15.00,某信用卡(2929),交易成功,2026073122001421021431983942\t,6612660000483300037895217368118022\t,,',
  '2026-07-28 16:02:36,退款,某科技公司,msa***@moonshot.cn,退款-Kimi-Vip,不计收支,72.60,某信用卡(2929),退款成功,2026072023001421021407153653_2082013841241534464\t,trade_no_2079081853146771457\t,,',
  '2026-07-20 13:52:08,文化休闲,某科技公司,msa***@moonshot.cn,Kimi-Vip,支出,99.00,某信用卡(2929),交易成功,2026072023001421021407153653\t,trade_no_2079081853146771457\t,,',
  '2026-07-24 16:34:49,退款,某出行,zhi***@unionpay.com,退款-费用,不计收支,43.00,某信用卡(9665)&红包,退款成功,2026072423001421021428316465_1316660000485958402026072416344912345564994269090\t,1316660000485958402026072410234312345564992257494\t,,',
  '2026-07-24 10:23:49,交通出行,某出行,zhi***@unionpay.com,费用,支出,43.00,某信用卡(9665)&红包,交易关闭,2026072423001421021428316465\t,1316660000485958402026072410234312345564992257494\t,,',
  '2026-07-31 05:03:45,投资理财,某基金,/,余额宝-收益发放,不计收支,0.01,余额宝,交易成功,20260731348193601021\t,\t,,',
  '2026-07-15 10:00:00,转账,某朋友,138****0000,转账,收入,14.00,余额宝,交易成功,2026071522001421021400000001\t,\t,,',
]);

describe('parseMobileCSV（支付宝手机端）', () => {
  it('只计入"支出"且非"交易关闭"的记录', () => {
    const { transactions } = parseMobileCSV(REAL_CASE_CSV, ctx);
    // 餐饮 15.00 + Kimi 99.00（部分退款后 26.40），共 2 条
    expect(transactions).toHaveLength(2);
    expect(transactions.every((t) => t.flow === '支出')).toBe(true);
    expect(transactions.every((t) => t.transactionStatus !== '交易关闭')).toBe(
      true,
    );
  });

  it('部分退款：原交易仍交易成功时，记账金额 = 原金额 - 退款', () => {
    const { transactions } = parseMobileCSV(REAL_CASE_CSV, ctx);
    const kimi = transactions.find(
      (t) => t.transactionId === '2026072023001421021407153653',
    );
    expect(kimi).toBeDefined();
    expect(kimi!.transactionAmt).toBe(99); // 交易金额保持原始值
    expect(kimi!.successfulRefund).toBe(72.6);
    expect(kimi!.amt).toBe(26.4); // 99 - 72.6，且不能是 26.400000000000006
  });

  it('部分退款且备注为空时，备注自动补充退款金额', () => {
    const { transactions } = parseMobileCSV(REAL_CASE_CSV, ctx);
    const kimi = transactions.find(
      (t) => t.transactionId === '2026072023001421021407153653',
    );
    expect(kimi!.remark).toBe('退款￥72.60');
  });

  it('部分退款但原备注非空时，保留原备注', () => {
    const csv = buildMobileCsv([
      '2026-07-10 10:00:00,退款,某商家,a***@b.com,退款-部分,不计收支,20.00,余额宝,退款成功,2026071010001421021400000007_r1\t,m9\t,,',
      '2026-07-09 10:00:00,购物消费,某商家,a***@b.com,商品,支出,100.00,余额宝,交易成功,2026071010001421021400000007\t,m9\t,送朋友生日礼物\t,',
    ]);
    const { transactions } = parseMobileCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.amt).toBe(80);
    expect(transactions[0]!.remark).toBe('送朋友生日礼物');
  });

  it('全额退款：原交易已关闭，退款行不产生任何记录', () => {
    const { transactions } = parseMobileCSV(REAL_CASE_CSV, ctx);
    // 滴滴 43.00 交易关闭 + 43.00 退款，两边都不应出现
    expect(
      transactions.some((t) =>
        t.transactionId.includes('2026072423001421021428316465'),
      ),
    ).toBe(false);
  });

  it('总支出与支付宝官方口径一致（支出合计 - 退款合计）', () => {
    const { transactions } = parseMobileCSV(REAL_CASE_CSV, ctx);
    const total = transactions.reduce((sum, t) => sum + t.amt, 0);
    // 官方公式：(15 + 99 + 43) - (72.6 + 43) = 41.40
    expect(Math.round(total * 100) / 100).toBe(41.4);
  });

  it('字段映射正确（含订单号尾部 tab 的清理）', () => {
    const { transactions } = parseMobileCSV(REAL_CASE_CSV, ctx);
    const meal = transactions.find((t) => t.amt === 15);
    expect(meal).toMatchObject({
      transactionId: '2026073122001421021431983942',
      merchantOrderNo: '6612660000483300037895217368118022',
      createdTime: '2026-07-31 18:20:31',
      expTime: '2026-07-31 18:20:31',
      source: '支付宝手机端',
      type: '餐饮美食',
      transactionType: '餐饮美食',
      counterparty: '某食堂',
      counterpartyAcct: '/',
      expDesc: '福州某餐饮公司',
      amt: 15,
      transactionAmt: 15,
      flow: '支出',
      transactionStatus: '交易成功',
      serviceFee: 0,
      successfulRefund: 0,
      fundStatus: '某信用卡(2929)',
      payTypeId: 'p1',
    });
  });

  it('按交易分类自动匹配支出类型字典', () => {
    const { transactions } = parseMobileCSV(REAL_CASE_CSV, ctx);
    const meal = transactions.find((t) => t.amt === 15);
    const kimi = transactions.find((t) => t.transactionAmt === 99);
    expect(meal!.expTypeId).toBe('d1'); // 餐饮美食命中字典
    expect(kimi!.expTypeId).toBe('d0'); // 文化休闲未命中 → 默认
  });

  it('跨月退款：原交易不在本账单时生成负数支出行', () => {
    const csv = buildMobileCsv([
      '2026-07-28 16:02:36,退款,某科技公司,msa***@moonshot.cn,退款-上月会员,不计收支,50.00,某信用卡(2929),退款成功,2026062023001421021407153999_888888\t,trade_no_old\t,,',
      '2026-07-31 18:20:31,餐饮美食,某食堂,/,午餐,支出,15.00,某信用卡(2929),交易成功,2026073122001421021431983942\t,order1\t,,',
    ]);
    const { transactions } = parseMobileCSV(csv, ctx);
    expect(transactions).toHaveLength(2);
    const refund = transactions.find((t) => t.amt < 0);
    expect(refund).toBeDefined();
    expect(refund).toMatchObject({
      amt: -50,
      transactionAmt: -50,
      flow: '支出',
      transactionType: '退款',
      transactionStatus: '退款成功',
      payTypeId: 'p1',
    });
    expect(refund!.remark).toContain('2026062023001421021407153999');
    // 总额 = 15 - 50 = -35，本月净支出被正确拉低
    const total = transactions.reduce((sum, t) => sum + t.amt, 0);
    expect(total).toBe(-35);
  });

  it('同一原交易发生多次部分退款时累计扣减', () => {
    const csv = buildMobileCsv([
      '2026-07-01 10:00:00,退款,某商家,a***@b.com,退款-第一批,不计收支,10.00,余额宝,退款成功,2026070110001421021400000002_r1\t,m1\t,,',
      '2026-07-05 10:00:00,退款,某商家,a***@b.com,退款-第二批,不计收支,20.00,余额宝,退款成功,2026070110001421021400000002_r2\t,m1\t,,',
      '2026-07-01 09:00:00,购物消费,某商家,a***@b.com,大家电,支出,100.00,余额宝,交易成功,2026070110001421021400000002\t,m1\t,,',
    ]);
    const { transactions } = parseMobileCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.amt).toBe(70);
    expect(transactions[0]!.transactionAmt).toBe(100);
    expect(transactions[0]!.successfulRefund).toBe(30);
  });

  it('多次部分退款时，备注显示累计退款总额', () => {
    const csv = buildMobileCsv([
      '2026-07-01 10:00:00,退款,某商家,a***@b.com,退款-第一批,不计收支,10.00,余额宝,退款成功,2026070110001421021400000002_r1\t,m1\t,,',
      '2026-07-05 10:00:00,退款,某商家,a***@b.com,退款-第二批,不计收支,20.00,余额宝,退款成功,2026070110001421021400000002_r2\t,m1\t,,',
      '2026-07-01 09:00:00,购物消费,某商家,a***@b.com,大家电,支出,100.00,余额宝,交易成功,2026070110001421021400000002\t,m1\t,,',
    ]);
    const { transactions } = parseMobileCSV(csv, ctx);
    expect(transactions[0]!.remark).toBe('退款￥30.00');
  });

  it('部分退款金额等于原金额时记账金额归零（不出现负数）', () => {
    const csv = buildMobileCsv([
      '2026-07-02 10:00:00,退款,某商家,a***@b.com,退款-全部,不计收支,50.00,余额宝,退款成功,2026070210001421021400000003_r1\t,m2\t,,',
      '2026-07-02 09:00:00,购物消费,某商家,a***@b.com,商品,支出,50.00,余额宝,交易成功,2026070210001421021400000003\t,m2\t,,',
    ]);
    const { transactions } = parseMobileCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.amt).toBe(0);
  });

  it('商品说明中含英文逗号（引号包裹）时不拆错列', () => {
    // 防御性兼容：真实账单虽不带引号，但保留对引号包裹逗号字段的容错
    const csv = buildMobileCsv([
      '2026-07-10 12:00:00,餐饮美食,某咖啡店,/,"咖啡,甜点",支出,30.50,余额宝,交易成功,2026071012001421021400000004\t,m3\t,,',
    ]);
    const { transactions } = parseMobileCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.expDesc).toBe('咖啡,甜点');
    expect(transactions[0]!.amt).toBe(30.5);
  });

  it('行尾只有单个逗号（备注为空）时也能解析', () => {
    // 备注列直接为空且没有第二个逗号收尾 → 12 列
    const csv = buildMobileCsv([
      '2026-07-10 12:00:00,餐饮美食,某咖啡店,/,咖啡,支出,30.50,余额宝,交易成功,2026071012001421021400000005\t,m4,',
    ]);
    const { transactions } = parseMobileCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.remark).toBe('');
    expect(transactions[0]!.amt).toBe(30.5);
  });

  it('支持非标准表头（模糊匹配）', () => {
    const csv = [
      '一些前置说明',
      '交易时间 交易分类 交易对方（其他列）',
      '2026-07-10 12:00:00,餐饮美食,某咖啡店,/,咖啡,支出,30.50,余额宝,交易成功,2026071012001421021400000006,m5,,',
    ].join('\n');
    const { transactions } = parseMobileCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
  });

  it('统计日期范围覆盖所有行（含收入与不计收支）', () => {
    const { minDate, maxDate } = parseMobileCSV(REAL_CASE_CSV, ctx);
    expect(minDate).toEqual(new Date('2026-07-15 10:00:00'));
    expect(maxDate).toEqual(new Date('2026-07-31 18:20:31'));
  });

  it('空文件/只有表头时返回空结果', () => {
    const { transactions, minDate, maxDate } = parseMobileCSV(
      buildMobileCsv([]),
      ctx,
    );
    expect(transactions).toEqual([]);
    expect(minDate).toBeUndefined();
    expect(maxDate).toBeUndefined();
  });
});

describe('splitCsvLine', () => {
  it('引号内的逗号不分列', () => {
    expect(splitCsvLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd']);
  });

  it('末尾空列保留', () => {
    expect(splitCsvLine('a,b,')).toEqual(['a', 'b', '']);
    expect(splitCsvLine('a,b,,')).toEqual(['a', 'b', '', '']);
  });
});

// ==================== 支付宝电脑端 CSV ====================

// 列：交易号,商户订单号,交易创建时间,付款时间,最近修改时间,交易来源地,交易类型,
//     交易对方,商品名称,金额(元),收/支,交易状态,服务费(元),成功退款(元),备注,资金状态
const PC_HEADER =
  '交易号,商户订单号,交易创建时间,付款时间,最近修改时间,交易来源地,交易类型,交易对方,商品名称,金额（元）,收/支,交易状态,服务费（元）,成功退款（元）,备注,资金状态';

function buildPcCsv(rows: string[]): string {
  return ['支付宝账单导出', PC_HEADER, ...rows].join('\n');
}

describe('parseCSV（支付宝电脑端）', () => {
  it('正常支出：金额与字段映射正确', () => {
    const csv = buildPcCsv([
      'T001,M001,2026-07-01 10:00:00,2026-07-01 10:00:01,2026-07-01 10:00:01,网站,餐饮美食,某食堂,午餐,15.00,支出,交易成功,0.00,0.00,,已支出',
    ]);
    const { transactions } = parseCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      transactionId: 'T001',
      merchantOrderNo: 'M001',
      createdTime: '2026-07-01 10:00:00',
      expTime: '2026-07-01 10:00:01',
      type: '餐饮美食',
      counterparty: '某食堂',
      expDesc: '午餐',
      transactionAmt: 15,
      amt: 15,
      flow: '支出',
      transactionStatus: '交易成功',
      serviceFee: 0,
      successfulRefund: 0,
      fundStatus: '已支出',
      expTypeId: 'd0',
      payTypeId: 'p1',
    });
  });

  it('部分退款：记账金额 = 金额 - 成功退款', () => {
    const csv = buildPcCsv([
      'T002,M002,2026-07-28 16:02:34,2026-07-28 16:02:35,2026-07-28 16:02:35,网站,教育培训,某科技公司,Kimi-Vip,199.00,支出,交易成功,0.00,72.60,,已支出',
    ]);
    const { transactions } = parseCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.transactionAmt).toBe(199);
    expect(transactions[0]!.successfulRefund).toBe(72.6);
    expect(transactions[0]!.amt).toBe(126.4);
    // 备注为空时自动补充退款金额
    expect(transactions[0]!.remark).toBe('退款￥72.60');
  });

  it('成功退款等于全额时记账金额归零（记录保留，不出现负数）', () => {
    const csv = buildPcCsv([
      'T003,M003,2026-07-18 18:20:35,2026-07-18 18:20:36,2026-07-18 20:30:54,网站,餐饮美食,某餐厅,铁板烧,100.00,支出,交易成功,0.00,100.00,,已支出',
    ]);
    const { transactions } = parseCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.amt).toBe(0);
  });

  it('只保留"交易成功"的支出：收入/不计收支/交易关闭均排除', () => {
    const csv = buildPcCsv([
      'T004,M004,2026-07-01 10:00:00,2026-07-01 10:00:01,2026-07-01 10:00:01,网站,餐饮美食,某食堂,午餐,15.00,支出,交易成功,0.00,0.00,,已支出',
      'T005,M005,2026-07-02 10:00:00,2026-07-02 10:00:01,2026-07-02 10:00:01,网站,交通出行,某出行,车费,43.00,支出,交易关闭,0.00,43.00,,',
      'T006,M006,2026-07-03 10:00:00,2026-07-03 10:00:01,2026-07-03 10:00:01,网站,转账,某朋友,转账,14.00,收入,交易成功,0.00,0.00,,',
      'T007,M007,2026-07-04 10:00:00,2026-07-04 10:00:01,2026-07-04 10:00:01,网站,投资理财,某基金,余额宝收益,0.01,不计收支,交易成功,0.00,0.00,,',
    ]);
    const { transactions } = parseCSV(csv, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.transactionId).toBe('T004');
  });

  it('统计日期范围使用付款时间，无付款时间时回退到创建时间', () => {
    const csv = buildPcCsv([
      'T008,M008,2026-07-01 10:00:00,2026-07-02 11:00:00,2026-07-02 11:00:01,网站,餐饮美食,某食堂,午餐,15.00,支出,交易成功,0.00,0.00,,',
      'T009,M009,2026-07-20 10:00:00,,2026-07-20 10:00:01,网站,转账,某朋友,转账,14.00,收入,交易成功,0.00,0.00,,',
    ]);
    const { minDate, maxDate } = parseCSV(csv, ctx);
    expect(minDate).toEqual(new Date('2026-07-02 11:00:00'));
    expect(maxDate).toEqual(new Date('2026-07-20 10:00:00'));
  });
});

// ==================== 微信支付账单 Excel ====================

/** 将 workbook 序列化为 ArrayBuffer（Node/浏览器环境通用） */
function workbookToArrayBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  const base64: string = XLSX.write(workbook, {
    type: 'base64',
    bookType: 'xlsx',
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

function buildWechatExcel(rows: any[][]): ArrayBuffer {
  const header = [
    '交易时间',
    '交易类型',
    '交易对方',
    '商品',
    '收/支',
    '金额（元）',
    '支付方式',
    '当前状态',
    '交易单号',
    '商户单号',
    '备注',
  ];
  const sheet = XLSX.utils.aoa_to_sheet([
    ['微信支付账单明细'],
    ['微信昵称：张三'],
    header,
    ...rows,
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return workbookToArrayBuffer(workbook);
}

describe('parseWechatExcel（微信支付账单）', () => {
  it('解析支出记录并去除金额中的 ¥ 符号', () => {
    const buffer = buildWechatExcel([
      [
        '2026-07-01 12:00:00',
        '商户消费',
        '某商店',
        '早餐',
        '支出',
        '¥15.50',
        '零钱',
        '支付成功',
        '4200000000001',
        'M1001',
        '',
      ],
      [
        '2026-07-02 12:00:00',
        '转账',
        '某朋友',
        '转账',
        '收入',
        '¥100.00',
        '零钱',
        '已收钱',
        '4200000000002',
        'M1002',
        '',
      ],
    ]);
    const { transactions } = parseWechatExcel(buffer, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      transactionId: '4200000000001',
      merchantOrderNo: 'M1001',
      source: '微信支付',
      transactionType: '商户消费',
      counterparty: '某商店',
      expDesc: '早餐',
      amt: 15.5,
      transactionAmt: 15.5,
      flow: '支出',
      transactionStatus: '支付成功',
      fundStatus: '零钱',
      payTypeId: 'p2',
      expTypeId: 'd0',
    });
  });

  it('统计日期范围正确', () => {
    const buffer = buildWechatExcel([
      [
        '2026-07-01 12:00:00',
        '商户消费',
        '某商店',
        '早餐',
        '支出',
        '¥15.50',
        '零钱',
        '支付成功',
        '4200000000001',
        'M1001',
        '',
      ],
      [
        '2026-07-20 12:00:00',
        '商户消费',
        '某商店',
        '晚餐',
        '支出',
        '¥25.00',
        '零钱',
        '支付成功',
        '4200000000003',
        'M1003',
        '',
      ],
    ]);
    const { minDate, maxDate } = parseWechatExcel(buffer, ctx);
    expect(minDate).toEqual(new Date('2026-07-01 12:00:00'));
    expect(maxDate).toEqual(new Date('2026-07-20 12:00:00'));
  });

  it('找不到表头时抛出明确错误', () => {
    const sheet = XLSX.utils.aoa_to_sheet([['无关内容']]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = workbookToArrayBuffer(workbook);
    expect(() => parseWechatExcel(buffer, ctx)).toThrow('未找到微信账单数据行');
  });

  it('全额退款（已全额退款/对方已退还）的支出不计入', () => {
    const buffer = buildWechatExcel([
      [
        '2026-05-30 12:48:12',
        '商户消费',
        '美团',
        '某餐厅',
        '支出',
        '126',
        '某信用卡(2929)',
        '已全额退款',
        '4500000215202605304868491008',
        'M2001',
        '/',
      ],
      [
        '2024-03-12 14:11:12',
        '转账',
        '某同事',
        '转账备注:微信转账',
        '支出',
        '¥50.00',
        '零钱',
        '对方已退还',
        '53010000414162202403121029144144',
        'M2002',
        '/',
      ],
      [
        '2026-05-30 13:00:00',
        '商户消费',
        '某商店',
        '午餐',
        '支出',
        '15',
        '零钱',
        '支付成功',
        '4500000215202605304868491009',
        'M2003',
        '/',
      ],
    ]);
    const { transactions } = parseWechatExcel(buffer, ctx);
    // 只剩正常支付的一笔，全额退款/退还的两笔都排除
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.amt).toBe(15);
  });

  it('部分退款：已退款(￥X) 与 已退款￥X 两种格式都从金额中扣减', () => {
    const buffer = buildWechatExcel([
      [
        '2024-12-17 20:45:37',
        '商户消费',
        '某餐厅',
        '桌边付',
        '支出',
        '¥241.50',
        '零钱',
        '已退款(￥18.00)',
        '4200002497202412176441972172',
        'M3001',
        '/',
      ],
      [
        '2024-12-17 21:39:51',
        '微信红包（群红包）',
        '发出群红包',
        '/',
        '支出',
        '¥25.00',
        '零钱',
        '已退款￥11.73',
        '100003990124121700057311666412258117',
        'M3002',
        '/',
      ],
    ]);
    const { transactions } = parseWechatExcel(buffer, ctx);
    expect(transactions).toHaveLength(2);

    const meal = transactions.find((t) => t.counterparty === '某餐厅');
    expect(meal!.transactionAmt).toBe(241.5); // 交易金额保持原始值
    expect(meal!.successfulRefund).toBe(18);
    expect(meal!.amt).toBe(223.5); // 241.5 - 18
    // 微信空备注为 "/"，视为空并补充退款金额
    expect(meal!.remark).toBe('退款￥18.00');

    const redpack = transactions.find((t) => t.counterparty === '发出群红包');
    expect(redpack!.successfulRefund).toBe(11.73);
    expect(redpack!.amt).toBe(13.27); // 25 - 11.73
  });

  it('兼容 Excel 数字序列号日期与纯数字金额（2026 年起的新导出格式）', () => {
    const buffer = buildWechatExcel([
      [
        46_117.830_659_722_225, // 2026-04-05 19:56:09 的 Excel 序列号
        '商户消费',
        '某商店',
        '饮料',
        '支出',
        10.8, // 纯数字金额，无 ¥ 前缀
        '零钱',
        '支付成功',
        '4200000000000000000000000001',
        'M4001',
        '/',
      ],
    ]);
    const { transactions, minDate, maxDate } = parseWechatExcel(buffer, ctx);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]!.amt).toBe(10.8);
    expect(transactions[0]!.expTime).toBe('2026-04-05 19:56:09');
    expect(minDate).toEqual(new Date('2026-04-05 19:56:09'));
    expect(maxDate).toEqual(new Date('2026-04-05 19:56:09'));
  });

  it('转账类支出的常见成功状态（对方已收钱/已转账）正常计入', () => {
    const buffer = buildWechatExcel([
      [
        '2026-01-05 10:00:00',
        '转账',
        '某朋友',
        '转账备注:新年快乐',
        '支出',
        '¥2000.00',
        '零钱',
        '对方已收钱',
        '53010001283021202501283798724561',
        'M5001',
        '/',
      ],
      [
        '2026-01-06 10:00:00',
        '扫二维码付款',
        '某商户',
        '收款方备注:二维码收款',
        '支出',
        '¥198.00',
        '零钱',
        '已转账',
        '53010001283021202501283798724562',
        'M5002',
        '/',
      ],
    ]);
    const { transactions } = parseWechatExcel(buffer, ctx);
    expect(transactions).toHaveLength(2);
    const total = transactions.reduce((sum, t) => sum + t.amt, 0);
    expect(total).toBe(2198);
  });
});
