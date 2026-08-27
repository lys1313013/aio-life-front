import * as XLSX from 'xlsx';

/**
 * 账单导入解析模块（纯函数，不依赖 Vue 响应式，便于单元测试）
 *
 * 支持三种账单：
 *  - parseCSV：支付宝电脑端 ZIP 内的 CSV（含"成功退款"列）
 *  - parseMobileCSV：支付宝手机端导出的 CSV（退款是独立的"退款成功"行）
 *  - parseWechatExcel：微信支付账单 Excel
 */

export interface Transaction {
  transactionId: string;
  merchantOrderNo: string;
  createdTime: string;
  expTime: string;
  lastModifiedTime: string;
  source: string;
  type: string;
  transactionType?: string; // 交易类型字段
  counterparty: string;
  counterpartyAcct: string; // 对方账号字段
  expDesc: string;
  amt: number;
  flow: string;
  transactionStatus: string;
  serviceFee: number;
  successfulRefund: number;
  remark: string;
  fundStatus: string;
  expTypeId?: string; // 支出类型字段
  transactionAmt?: number; // 交易金额字段
  payTypeId: string; // 支付类型ID，关联字典表
}

export interface ParseResult {
  transactions: Transaction[];
  minDate?: Date;
  maxDate?: Date;
}

export interface DictOption {
  id: string;
  label?: string;
  dictValue?: string;
  value?: string;
}

export interface ParseContext {
  /** 支出类型字典（exp_type），用于按交易分类自动匹配 */
  dictOptions: DictOption[];
  /** 支付方式字典（pay_type），用于识别支付宝/微信 */
  payTypeOptions: DictOption[];
  /** 默认支出类型ID（未匹配到时使用） */
  defaultExpTypeId: string;
}

/** 分精度保留两位小数，避免浮点误差（如 99 - 72.6 = 26.400000000000006） */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function findPayTypeId(
  payTypeOptions: DictOption[],
  dictValue: string,
  label: string,
): string {
  const option = payTypeOptions.find(
    (o) => o.dictValue === dictValue || o.label === label,
  );
  return option ? option.id : '';
}

function matchExpTypeId(transactionType: string, ctx: ParseContext): string {
  if (transactionType && ctx.dictOptions.length > 0) {
    const matched = ctx.dictOptions.find(
      (option) => option.label === transactionType,
    );
    if (matched) {
      return matched.id;
    }
  }
  return ctx.defaultExpTypeId;
}

function computeDateRange(validTimes: Date[]): {
  maxDate?: Date;
  minDate?: Date;
} {
  if (validTimes.length === 0) {
    return {};
  }
  return {
    minDate: new Date(Math.min(...validTimes.map((d) => d.getTime()))),
    maxDate: new Date(Math.max(...validTimes.map((d) => d.getTime()))),
  };
}

function pushValidTime(timeStr: string, validTimes: Date[]): void {
  if (!timeStr) return;
  const d = new Date(timeStr);
  if (!Number.isNaN(d.getTime())) {
    validTimes.push(d);
  }
}

/**
 * 判断一条记录是否应计入支出（手机端口径：支出 且 非交易关闭）
 */
function isExpenseRow(flow: string, transactionStatus: string): boolean {
  return flow === '支出' && transactionStatus !== '交易关闭';
}

/** 备注是否为空（微信账单中空备注显示为 "/"） */
function isEmptyRemark(remark: string): boolean {
  return !remark || remark === '/';
}

/** 部分退款时给空备注补充退款金额说明 */
function refundRemark(successfulRefund: number): string {
  return `退款￥${successfulRefund.toFixed(2)}`;
}

/** 判断是否为自动生成的退款备注（用于多次退款时刷新金额） */
const AUTO_REFUND_REMARK_RE = /^退款￥[\d.]+$/;

/** 退款后刷新备注：空备注/自动生成的备注 → 写入累计退款金额；用户原有备注不动 */
function applyRefundRemark(t: Transaction): void {
  if (
    t.successfulRefund > 0 &&
    (isEmptyRemark(t.remark) || AUTO_REFUND_REMARK_RE.test(t.remark))
  ) {
    t.remark = refundRemark(t.successfulRefund);
  }
}

/**
 * 应用退款到已解析的交易上（支付宝手机端）。
 *
 * 退款行的交易订单号格式为 `原交易号_退款批次号`，按原交易号匹配：
 *  - 原交易在本账单中且计入支出（部分退款）：从记账金额中扣减退款
 *  - 原交易在本账单中但已关闭（全额退款）：两边都已排除，无需处理
 *  - 原交易不在本账单中（跨月退款）：生成一条负数支出行，保证本月总额准确
 */
function applyMobileRefunds(
  transactions: Transaction[],
  refundRows: Transaction[],
  allRowsByOriginalId: Map<string, Transaction>,
): void {
  for (const refund of refundRows) {
    const originalId = (refund.transactionId.split('_')[0] || '').trim();
    const refundAmt = round2(refund.amt);
    if (!originalId || refundAmt <= 0) continue;

    const target = transactions.find((t) => t.transactionId === originalId);
    if (target) {
      // 部分退款：原交易仍计入支出，扣减退款金额
      target.successfulRefund = round2(target.successfulRefund + refundAmt);
      const gross = target.transactionAmt ?? target.amt;
      target.amt = round2(Math.max(0, gross - target.successfulRefund));
      continue;
    }

    if (allRowsByOriginalId.has(originalId)) {
      // 原交易在本账单中但已被过滤（全额退款→交易关闭），无需处理
      continue;
    }

    // 跨月退款：原交易不在本账单内，生成负数支出行
    transactions.push({
      ...refund,
      flow: '支出',
      type: refund.type || '退款',
      transactionType: refund.transactionType || '退款',
      amt: -refundAmt,
      transactionAmt: -refundAmt,
      remark: refund.remark || `退款（原交易 ${originalId} 不在本账单内）`,
    });
  }

  // 统一刷新部分退款记录的备注（空备注才写，多次退款显示累计金额）
  for (const t of transactions) {
    applyRefundRemark(t);
  }
}

/**
 * 解析支付宝电脑端 CSV（ZIP 内的账单文件）。
 * 列：交易号,商户订单号,交易创建时间,付款时间,最近修改时间,交易来源地,交易类型,
 *     交易对方,商品名称,金额（元）,收/支,交易状态,服务费（元）,成功退款（元）,备注,资金状态
 */
export function parseCSV(csvText: string, ctx: ParseContext): ParseResult {
  const lines = csvText.split('\n');
  const transactions: Transaction[] = [];
  const validTimes: Date[] = [];

  const alipayTypeId = findPayTypeId(ctx.payTypeOptions, '1', '支付宝');

  // 查找数据行开始位置（跳过标题和元数据）
  let dataStartIndex = 0;
  for (const [i, line] of lines.entries()) {
    if (line.includes('交易号')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  // 解析数据行
  for (let i = dataStartIndex; i < lines.length; i++) {
    const lineStr = lines[i];
    const line = lineStr ? lineStr.trim() : '';

    // 跳过空行和汇总行
    if (
      !line ||
      line.startsWith('共') ||
      line.includes('导出时间') ||
      line.includes('----')
    ) {
      continue;
    }

    // 简单的CSV解析
    const columns = line.split(',').map((col) => col.trim());

    if (columns.length >= 15) {
      // 收集所有记录的时间（包含收入和支出）
      const createdTime = columns[2] || '';
      const expTime = columns[3] || '';
      pushValidTime(expTime || createdTime, validTimes);

      const grossAmt = Number.parseFloat(columns[9] || '0') || 0;
      const successfulRefund = Number.parseFloat(columns[13] || '0') || 0;

      const transaction: Transaction = {
        transactionId: columns[0] || '', // 交易号
        merchantOrderNo: columns[1] || '', // 商户订单号
        createdTime,
        expTime,
        lastModifiedTime: columns[4] || '',
        source: columns[5] || '',
        type: columns[6] || '',
        counterparty: columns[7] || '',
        counterpartyAcct: '', // 电脑端CSV没有对方账号字段，设为空
        expDesc: columns[8] || '',
        transactionAmt: grossAmt, // 交易金额（原始金额）
        // 记账金额 = 原始金额 - 成功退款（部分退款时原交易仍是"交易成功"）
        amt: round2(Math.max(0, grossAmt - successfulRefund)),
        flow: columns[10] || '', // 收支方向
        transactionStatus: columns[11] || '',
        serviceFee: Number.parseFloat(columns[12] || '0') || 0,
        successfulRefund,
        remark: columns[14] || '',
        fundStatus: columns[15] ? columns[15] : '',
        expTypeId: ctx.defaultExpTypeId, // 初始化支出类型字段
        payTypeId: alipayTypeId, // 支付宝支付类型
      };

      // 只保留"支出"的数据，收入数据不处理（"不计收支"，"收入"不处理）
      // 过滤出状态为"成功"的支出记录
      if (
        transaction.flow === '支出' &&
        transaction.transactionStatus === '交易成功'
      ) {
        applyRefundRemark(transaction);
        transactions.push(transaction);
      }
    }
  }

  return { transactions, ...computeDateRange(validTimes) };
}

/**
 * 解析带引号的 CSV 行（引号内的逗号不算分隔符）。
 * 末列即使为空也会保留，保证列数稳定。
 */
export function splitCsvLine(line: string): string[] {
  const columns: string[] = [];
  let currentColumn = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      columns.push(currentColumn.trim());
      currentColumn = '';
    } else {
      currentColumn += char;
    }
  }
  columns.push(currentColumn.trim());
  return columns;
}

/**
 * 解析支付宝手机端 CSV。
 * 列：交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,
 *     交易状态,交易订单号,商家订单号,备注
 *
 * 退款是独立行（收/支=不计收支，交易状态=退款成功），由 applyMobileRefunds 处理。
 */
export function parseMobileCSV(
  csvText: string,
  ctx: ParseContext,
): ParseResult {
  const lines = csvText.split('\n');
  const transactions: Transaction[] = [];
  const refundRows: Transaction[] = [];
  const allRowsByOriginalId = new Map<string, Transaction>();
  const validTimes: Date[] = [];

  const alipayTypeId = findPayTypeId(ctx.payTypeOptions, '1', '支付宝');

  // 查找数据行开始位置（跳过标题和元数据）
  let dataStartIndex = 0;
  let headerFound = false;

  for (const [i, line] of lines.entries()) {
    // 查找数据表头行
    if (
      line.includes(
        '交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注',
      )
    ) {
      dataStartIndex = i + 1;
      headerFound = true;
      break;
    }
  }

  // 如果没有找到标准表头，尝试查找其他可能的表头格式
  if (!headerFound) {
    for (const [i, line] of lines.entries()) {
      if (
        line.includes('交易时间') &&
        line.includes('交易分类') &&
        line.includes('交易对方')
      ) {
        dataStartIndex = i + 1;
        break;
      }
    }
  }

  // 解析数据行
  for (let i = dataStartIndex; i < lines.length; i++) {
    const lineStr = lines[i];
    const line = lineStr ? lineStr.trim() : '';

    // 跳过空行和汇总行
    if (
      !line ||
      line.startsWith('共') ||
      line.includes('导出时间') ||
      line.includes('----') ||
      line.includes('支付宝支付科技有限公司') ||
      line.includes('特别提示')
    ) {
      continue;
    }

    const columns = splitCsvLine(line);

    // 手机端CSV格式：交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注
    if (columns.length >= 12) {
      // 收集所有记录的时间（包含收入和支出）
      pushValidTime(columns[0] || '', validTimes);

      // 获取交易分类
      const transactionType = columns[1] || '';
      const amount = Number.parseFloat(columns[6] || '0') || 0;

      const transaction: Transaction = {
        transactionId: columns[9] || '', // 交易订单号
        merchantOrderNo: columns[10] || '', // 商家订单号
        createdTime: columns[0] || '', // 交易时间
        expTime: columns[0] || '', // 交易时间作为支出时间
        lastModifiedTime: columns[0] || '', // 交易时间作为最后修改时间
        source: '支付宝手机端',
        type: transactionType, // 交易分类
        transactionType, // 交易分类
        counterparty: columns[2] || '', // 交易对方
        counterpartyAcct: columns[3] || '', // 对方账号
        expDesc: columns[4] || '', // 商品说明
        transactionAmt: amount, // 交易金额（原始金额）
        amt: amount, // 记账金额（退款扣减在 applyMobileRefunds 中处理）
        flow: columns[5] || '', // 收/支
        transactionStatus: columns[8] || '', // 交易状态
        serviceFee: 0, // 手机端没有服务费字段
        successfulRefund: 0,
        remark: columns[11] || '', // 备注
        fundStatus: columns[7] || '', // 收/付款方式作为资金状态
        expTypeId: matchExpTypeId(transactionType, ctx), // 根据交易分类匹配的支出类型ID
        payTypeId: alipayTypeId, // 支付宝支付类型
      };

      // 所有行都登记到原始交易索引，供退款行匹配
      // （包括会被过滤掉的"交易关闭"行——全额退款的原交易）
      if (transaction.transactionId) {
        allRowsByOriginalId.set(transaction.transactionId, transaction);
      }

      if (transaction.transactionStatus === '退款成功') {
        refundRows.push(transaction);
        continue;
      }

      // 只保留"支出"且交易成功的数据，排除"交易关闭"等无效记录
      if (isExpenseRow(transaction.flow, transaction.transactionStatus)) {
        transactions.push(transaction);
      }
    }
  }

  applyMobileRefunds(transactions, refundRows, allRowsByOriginalId);

  return { transactions, ...computeDateRange(validTimes) };
}

// 将Excel日期序列号转换为日期字符串
export function excelDateToString(excelDate: any): string {
  if (typeof excelDate === 'number' && excelDate > 0) {
    const date = XLSX.SSF.parse_date_code(excelDate);
    if (date) {
      const year = date.y;
      const month = String(date.m).padStart(2, '0');
      const day = String(date.d).padStart(2, '0');
      const hours = String(date.H).padStart(2, '0');
      const minutes = String(date.M).padStart(2, '0');
      const seconds = String(date.S).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }
  return String(excelDate || '');
}

/**
 * 解析微信支付账单 Excel。
 * 微信账单的退款体现在"当前状态"列，没有独立的退款行：
 *  - "已全额退款" / "对方已退还"：钱已全部退回，支出不计入
 *  - "已退款(￥18.00)" / "已退款￥11.73"（两种格式）：部分退款，从金额中扣减
 */

/** 微信部分退款状态中的金额提取，兼容 已退款(￥X) 与 已退款￥X 两种格式 */
const WECHAT_PARTIAL_REFUND_RE = /已退款[（(]?￥?([\d.]+)/;

/** 微信全额退款/退回状态（支出不应计入） */
const WECHAT_FULL_REFUND_STATUSES = new Set(['对方已退还', '已全额退款']);
export function parseWechatExcel(
  arrayBuffer: ArrayBuffer,
  ctx: ParseContext,
): ParseResult {
  const transactions: Transaction[] = [];
  const validTimes: Date[] = [];

  const wechatTypeId = findPayTypeId(ctx.payTypeOptions, '2', '微信');

  // 解析Excel文件
  const workbook = XLSX.read(arrayBuffer);
  if (workbook.SheetNames.length === 0) {
    throw new Error('Excel文件中未找到工作表');
  }
  const firstSheetName = workbook.SheetNames[0] as string;
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('Excel文件中未找到工作表数据');
  }

  // 将工作表转换为JSON数据
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // 查找数据行开始位置
  let dataStartIndex = -1;
  let headerRow: string[] = [];
  for (const [i, jsonDatum] of jsonData.entries()) {
    const row = jsonDatum as any[];
    if (row.length > 0 && String(row[0]).includes('交易时间')) {
      dataStartIndex = i + 1;
      headerRow = row.map((cell) => String(cell || ''));
      break;
    }
  }

  if (dataStartIndex === -1) {
    throw new Error('未找到微信账单数据行');
  }

  // 建立列索引映射，增强健壮性
  const columnIndex = {
    transactionTime: headerRow.findIndex((h) => h.includes('交易时间')),
    transactionType: headerRow.findIndex((h) => h.includes('交易类型')),
    counterparty: headerRow.findIndex((h) => h.includes('交易对方')),
    goods: headerRow.findIndex((h) => h.includes('商品')),
    flow: headerRow.findIndex((h) => h.includes('收/支')),
    amount: headerRow.findIndex((h) => h.includes('金额')),
    paymentMethod: headerRow.findIndex((h) => h.includes('支付方式')),
    transactionStatus: headerRow.findIndex((h) => h.includes('当前状态')),
    transactionId: headerRow.findIndex((h) => h.includes('交易单号')),
    merchantOrderNo: headerRow.findIndex((h) => h.includes('商户单号')),
    remark: headerRow.findIndex((h) => h.includes('备注')),
  };

  // 辅助函数：安全获取行值
  const getRowValue = (row: any[], index: number): any => {
    return index >= 0 && index < row.length ? row[index] : undefined;
  };

  // 解析数据行
  for (let i = dataStartIndex; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];

    // 跳过空行
    if (!row || row.length === 0) {
      continue;
    }

    // 跳过汇总行和说明行
    const firstCell = String(row[0] || '');
    if (
      firstCell.includes('收入') ||
      firstCell.includes('支出') ||
      firstCell.includes('中性') ||
      firstCell.includes('注：') ||
      firstCell.includes('共') ||
      firstCell.includes('----------------------') ||
      firstCell.includes('导出时间') ||
      firstCell.includes('微信昵称') ||
      firstCell.includes('起始时间') ||
      firstCell.includes('导出类型')
    ) {
      continue;
    }

    // 获取各字段值
    const transactionTimeRaw = getRowValue(row, columnIndex.transactionTime);
    const transactionTime = excelDateToString(transactionTimeRaw);

    pushValidTime(transactionTime, validTimes);

    const transactionType = String(
      getRowValue(row, columnIndex.transactionType) || '',
    );
    const counterparty = String(
      getRowValue(row, columnIndex.counterparty) || '',
    );
    const goods = String(getRowValue(row, columnIndex.goods) || '');
    const flow = String(getRowValue(row, columnIndex.flow) || '');
    const amountStr = String(getRowValue(row, columnIndex.amount) || '');
    const paymentMethod = String(
      getRowValue(row, columnIndex.paymentMethod) || '',
    );
    const transactionStatus = String(
      getRowValue(row, columnIndex.transactionStatus) || '',
    );
    const transactionId = String(
      getRowValue(row, columnIndex.transactionId) || '',
    );
    const merchantOrderNo = String(
      getRowValue(row, columnIndex.merchantOrderNo) || '',
    );
    const remark = String(getRowValue(row, columnIndex.remark) || '');

    // 处理金额，去除¥符号和其他非数字字符
    const amount =
      Number.parseFloat(amountStr.replaceAll(/[^0-9.-]/g, '')) || 0;

    // 只处理支出记录
    if (flow === '支出') {
      // 全额退款/转账退回：钱已全部退回，不计入支出
      if (WECHAT_FULL_REFUND_STATUSES.has(transactionStatus)) {
        continue;
      }

      // 部分退款：状态形如 已退款(￥18.00) / 已退款￥11.73，从金额中扣减
      const refundMatch = WECHAT_PARTIAL_REFUND_RE.exec(transactionStatus);
      const successfulRefund = refundMatch
        ? Number.parseFloat(refundMatch[1] || '0') || 0
        : 0;

      const transaction: Transaction = {
        transactionId: transactionId || '',
        merchantOrderNo: merchantOrderNo || '',
        createdTime: transactionTime || '',
        expTime: transactionTime || '',
        lastModifiedTime: transactionTime || '',
        source: '微信支付',
        type: transactionType || '',
        transactionType: transactionType || '',
        counterparty: counterparty || '',
        counterpartyAcct: '',
        expDesc: goods || '',
        transactionAmt: amount,
        amt: round2(Math.max(0, amount - successfulRefund)),
        flow: flow || '',
        transactionStatus: transactionStatus || '',
        serviceFee: 0,
        successfulRefund,
        remark: remark || '',
        fundStatus: paymentMethod || '',
        expTypeId: ctx.defaultExpTypeId, // 默认支出类型
        payTypeId: wechatTypeId, // 微信支付类型
      };

      applyRefundRemark(transaction);
      transactions.push(transaction);
    }
  }

  return { transactions, ...computeDateRange(validTimes) };
}
