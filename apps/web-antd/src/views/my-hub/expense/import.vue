<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { DeleteOutlined } from '@ant-design/icons-vue';
import { Button, Card, message, Popconfirm } from 'ant-design-vue';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/common';
import { saveBatch } from '#/api/core/expense';

interface Transaction {
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
  expTypeId?: number; // 支出类型字段
  transactionAmt?: number; // 交易金额字段
  payTypeId: number; // 支付类型ID，1=支付宝，2=微信
}

// 表格行类型
type RowType = Transaction;

const uploadAreaRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();
const loading = ref(false);
const submitLoading = ref(false);
const resultsVisible = ref(false);
const transactions = ref<Transaction[]>([]);

// 添加选中的类型过滤
const selectedCategory = ref<null | string>(null);

// 图表引用
const monthlyChartRef = ref<EchartsUIType>();
const categoryChartRef = ref<EchartsUIType>();
const { renderEcharts: renderMonthlyChart } = useEcharts(monthlyChartRef);
const {
  renderEcharts: renderCategoryChart,
  getChartInstance: getCategoryChartInstance,
} = useEcharts(categoryChartRef);

// 统计信息
const stats = ref({
  startTime: '',
  endTime: '',
  expenseCount: 0,
  totalExpense: 0,
});

// 拖放事件处理
const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  uploadAreaRef.value?.classList.add('dragover');
};

const handleDragLeave = () => {
  uploadAreaRef.value?.classList.remove('dragover');
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  uploadAreaRef.value?.classList.remove('dragover');

  if (e.dataTransfer?.files.length && e.dataTransfer.files[0]) {
    handleFile(e.dataTransfer.files[0]);
  }
};

// 点击上传区域
const handleUploadAreaClick = () => {
  fileInputRef.value?.click();
};

// 浏览按钮点击
const handleBrowseClick = (e: Event) => {
  e.stopPropagation();
  fileInputRef.value?.click();
};

// 文件选择变化
const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files?.length && target.files[0]) {
    handleFile(target.files[0]);
  }
};

// 处理上传的文件
const handleFile = async (file: File) => {
  // 检查文件类型
  if (
    !file.name.endsWith('.zip') &&
    !file.name.endsWith('.csv') &&
    !file.name.endsWith('.xlsx')
  ) {
    message.warning('请上传ZIP文件、CSV文件或Excel文件');
    return;
  }

  // 重置过滤状态，确保新导入的数据显示正常
  selectedCategory.value = null;

  loading.value = true;
  resultsVisible.value = false;

  try {
    let parsedTransactions: Transaction[] = [];
    let fileMinDate: Date | undefined;
    let fileMaxDate: Date | undefined;

    if (file.name.endsWith('.zip')) {
      // 处理ZIP文件
      const arrayBuffer = await readFileAsArrayBuffer(file);
      const zip = await JSZip.loadAsync(arrayBuffer);

      // 查找ZIP中的CSV文件
      const csvFilename = Object.keys(zip.files).find((name) =>
        name.endsWith('.csv'),
      );

      if (!csvFilename) {
        throw new Error('ZIP文件中未找到CSV文件');
      }

      // 读取CSV文件为ArrayBuffer
      const csvFile = zip.file(csvFilename);
      if (!csvFile) {
        throw new Error('ZIP文件中未找到CSV文件');
      }
      const csvArrayBuffer = await csvFile.async('arraybuffer');

      // 解决中文乱码问题 - 支付宝CSV通常使用GBK编码
      try {
        // 尝试使用GBK解码
        const decoder = new TextDecoder('gbk');
        const csvText = decoder.decode(csvArrayBuffer);
        // 检测文件类型并解析CSV内容
        const isMobileCSV = file.name.includes('支付宝交易明细');
        const result = isMobileCSV
          ? parseMobileCSV(csvText)
          : parseCSV(csvText);
        parsedTransactions = result.transactions;
        fileMinDate = result.minDate;
        fileMaxDate = result.maxDate;
      } catch {
        // 如果GBK解码失败，尝试使用UTF-8
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(csvArrayBuffer);
        // 检测文件类型并解析CSV内容
        const isMobileCSV = file.name.includes('支付宝交易明细');
        const result = isMobileCSV
          ? parseMobileCSV(csvText)
          : parseCSV(csvText);
        parsedTransactions = result.transactions;
        fileMinDate = result.minDate;
        fileMaxDate = result.maxDate;
      }
    } else if (file.name.endsWith('.csv')) {
      // 处理CSV文件
      const arrayBuffer = await readFileAsArrayBuffer(file);

      // 解决中文乱码问题
      try {
        // 尝试使用GBK解码
        const decoder = new TextDecoder('gbk');
        const csvText = decoder.decode(arrayBuffer);
        // 检测文件类型并解析CSV内容
        const isMobileCSV = file.name.includes('支付宝交易明细');
        const result = isMobileCSV
          ? parseMobileCSV(csvText)
          : parseCSV(csvText);
        parsedTransactions = result.transactions;
        fileMinDate = result.minDate;
        fileMaxDate = result.maxDate;
      } catch {
        // 如果GBK解码失败，尝试使用UTF-8
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(arrayBuffer);
        // 检测文件类型并解析CSV内容
        const isMobileCSV = file.name.includes('支付宝交易明细');
        const result = isMobileCSV
          ? parseMobileCSV(csvText)
          : parseCSV(csvText);
        parsedTransactions = result.transactions;
        fileMinDate = result.minDate;
        fileMaxDate = result.maxDate;
      }
    } else if (file.name.endsWith('.xlsx')) {
      // 处理Excel文件
      const arrayBuffer = await readFileAsArrayBuffer(file);
      // 检测是否为微信账单
      const isWechatBill = file.name.includes('微信支付账单');
      if (isWechatBill) {
        const result = parseWechatExcel(arrayBuffer);
        parsedTransactions = result.transactions;
        fileMinDate = result.minDate;
        fileMaxDate = result.maxDate;
      } else {
        throw new Error('暂不支持该Excel文件格式');
      }
    }

    transactions.value = parsedTransactions;

    let globalStartTime = '';
    let globalEndTime = '';
    if (fileMinDate && fileMaxDate) {
      globalStartTime = formatDate(fileMinDate);
      globalEndTime = formatDate(fileMaxDate);
    }
    updateStats(parsedTransactions, globalStartTime, globalEndTime);

    // 只在首次导入时匹配支出类型，后续导入不清除用户的选择
    if (dictOptions.value.length > 0) {
      // 检查是否有未设置支出类型的记录
      const hasUnmatchedRecords = transactions.value.some(
        (t) => !t.expTypeId || t.expTypeId === 119,
      );
      if (hasUnmatchedRecords) {
        matchExpenseTypes();
      }
    }

    // 更新表格数据
    gridApi.setState({
      gridOptions: {
        data: transactions.value,
      },
    });

    loading.value = false;
    resultsVisible.value = true;
    message.success('文件导入成功');
  } catch (error) {
    console.error('Error:', error);
    message.error(`处理文件时出错: ${(error as Error).message}`);
    loading.value = false;
  }
};

// 读取文件为ArrayBuffer
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', (e) =>
      resolve(e.target?.result as ArrayBuffer),
    );
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

interface ParseResult {
  transactions: Transaction[];
  minDate?: Date;
  maxDate?: Date;
}

// 解析CSV内容
const parseCSV = (csvText: string): ParseResult => {
  const lines = csvText.split('\n');
  const transactions: Transaction[] = [];
  const validTimes: Date[] = [];

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
      line.includes('共') ||
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
      const timeStr = expTime || createdTime;
      if (timeStr) {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          validTimes.push(d);
        }
      }

      const transaction = {
        transactionId: columns[0] || '', // 交易号
        merchantOrderNo: columns[1] || '', // 商户订单号
        createdTime: columns[2] || '',
        expTime: columns[3] || '',
        lastModifiedTime: columns[4] || '',
        source: columns[5] || '',
        type: columns[6] || '',
        counterparty: columns[7] || '',
        counterpartyAcct: '', // 电脑端CSV没有对方账号字段，设为空
        expDesc: columns[8] || '',
        amt: Number.parseFloat(columns[9] || '0') || 0,
        flow: columns[10] || '', // 收支方向
        transactionStatus: columns[11] || '',
        serviceFee: Number.parseFloat(columns[12] || '0') || 0,
        successfulRefund: Number.parseFloat(columns[13] || '0') || 0,
        remark: columns[14] || '',
        fundStatus: columns[15] ? columns[15] : '',
        expTypeId: 119, // 初始化支出类型字段
        payTypeId: 1, // 支付宝支付类型
      };

      // 只保留"支出"的数据，收入数据不处理（"不计收支"，"收入"不处理）
      // 过滤出状态为"成功"的支出记录
      if (
        transaction.flow === '支出' &&
        transaction.transactionStatus === '交易成功'
      ) {
        transactions.push(transaction);
      }
    }
  }

  let maxDate, minDate;
  if (validTimes.length > 0) {
    minDate = new Date(Math.min(...validTimes.map((d) => d.getTime())));
    maxDate = new Date(Math.max(...validTimes.map((d) => d.getTime())));
  }

  return { transactions, minDate, maxDate };
};

// 将Excel日期序列号转换为日期字符串
const excelDateToString = (excelDate: any): string => {
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
};

// 解析微信账单Excel内容
const parseWechatExcel = (arrayBuffer: ArrayBuffer): ParseResult => {
  const transactions: Transaction[] = [];
  const validTimes: Date[] = [];

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

    if (transactionTime) {
      const d = new Date(transactionTime);
      if (!isNaN(d.getTime())) {
        validTimes.push(d);
      }
    }

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
        amt: amount,
        transactionAmt: amount,
        flow: flow || '',
        transactionStatus: transactionStatus || '',
        serviceFee: 0,
        successfulRefund: 0,
        remark: remark || '',
        fundStatus: paymentMethod || '',
        expTypeId: 119, // 默认支出类型
        payTypeId: 2, // 微信支付类型
      };

      transactions.push(transaction);
    }
  }

  let maxDate, minDate;
  if (validTimes.length > 0) {
    minDate = new Date(Math.min(...validTimes.map((d) => d.getTime())));
    maxDate = new Date(Math.max(...validTimes.map((d) => d.getTime())));
  }

  return { transactions, minDate, maxDate };
};

// 解析手机端CSV内容
const parseMobileCSV = (csvText: string): ParseResult => {
  const lines = csvText.split('\n');
  const transactions: Transaction[] = [];
  const validTimes: Date[] = [];

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
        headerFound = true;
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
      line.includes('共') ||
      line.includes('导出时间') ||
      line.includes('----') ||
      line.includes('支付宝支付科技有限公司') ||
      line.includes('特别提示')
    ) {
      continue;
    }

    // 手机端CSV解析 - 处理可能的引号包含逗号的情况
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

    // 添加最后一个列
    if (currentColumn.trim()) {
      columns.push(currentColumn.trim());
    }

    // 手机端CSV格式：交易时间,交易分类,交易对方,对方账号,商品说明,收/支,金额,收/付款方式,交易状态,交易订单号,商家订单号,备注
    if (columns.length >= 12) {
      // 收集所有记录的时间（包含收入和支出）
      const timeStr = columns[0] || '';
      if (timeStr) {
        const d = new Date(timeStr);
        if (!isNaN(d.getTime())) {
          validTimes.push(d);
        }
      }

      // 获取交易分类
      const transactionType = columns[1] || '';

      // 根据交易分类匹配dictOptions的label，获取对应的id
      let matchedExpTypeId = 119; // 默认值
      if (transactionType && dictOptions.value.length > 0) {
        const matchedOption = dictOptions.value.find(
          (option) => option.label === transactionType,
        );
        if (matchedOption) {
          matchedExpTypeId = matchedOption.id;
        }
      }

      const transaction = {
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
        transactionAmt: Number.parseFloat(columns[6] || '0') || 0, // 交易金额
        amt: Number.parseFloat(columns[6] || '0') || 0, // 金额
        flow: columns[5] || '', // 收/支
        transactionStatus: columns[8] || '', // 交易状态
        serviceFee: 0, // 手机端没有服务费字段
        successfulRefund: 0, // 手机端没有退款字段
        remark: columns[11] || '', // 备注
        fundStatus: columns[7] || '', // 收/付款方式作为资金状态
        expTypeId: matchedExpTypeId, // 根据交易分类匹配的支出类型ID
        payTypeId: 1, // 支付宝支付类型
      };

      // 只保留"支出"的数据，收入数据不处理（"不计收支"，"收入"不处理）
      if (transaction.flow === '支出') {
        transactions.push(transaction);
      }
    }
  }

  let maxDate, minDate;
  if (validTimes.length > 0) {
    minDate = new Date(Math.min(...validTimes.map((d) => d.getTime())));
    maxDate = new Date(Math.max(...validTimes.map((d) => d.getTime())));
  }

  return { transactions, minDate, maxDate };
};

// 计算类型统计数据
const getCategoryStats = (transactions: Transaction[]) => {
  const categoryData: Record<string, number> = {};

  transactions.forEach((transaction) => {
    if (transaction.flow === '支出') {
      const category =
        transaction.transactionType || transaction.type || '其他';
      if (category) {
        categoryData[category] =
          (categoryData[category] || 0) + transaction.amt;
      }
    }
  });

  return categoryData;
};

// 更新统计信息
const updateStats = (
  transactions: Transaction[],
  globalStartTime?: string,
  globalEndTime?: string,
) => {
  let totalExpense = 0;
  let expenseCount = 0;

  // 计算开始时间和结束时间
  let startTime = globalStartTime || '';
  let endTime = globalEndTime || '';

  if ((!startTime || !endTime) && transactions.length > 0) {
    // 提取所有有效的时间
    const validTimes = transactions
      .map((t) => t.expTime || t.createdTime)
      .filter((time) => time && time.trim() !== '')
      .map((time) => new Date(time))
      .filter((date) => !isNaN(date.getTime()));

    if (validTimes.length > 0) {
      // 找到最早和最晚的时间
      const earliest = new Date(
        Math.min(...validTimes.map((d) => d.getTime())),
      );
      const latest = new Date(Math.max(...validTimes.map((d) => d.getTime())));

      // 格式化时间显示
      startTime = formatDate(earliest);
      endTime = formatDate(latest);
    }
  }

  transactions.forEach((transaction) => {
    if (transaction.flow === '支出') {
      totalExpense += transaction.amt;
      expenseCount++;
    }
  });

  stats.value = {
    startTime,
    endTime,
    expenseCount,
    totalExpense,
  };

  // 更新图表
  updateCharts(transactions);
};

// 格式化日期函数
const formatDate = (date: Date): string => {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

// 更新图表
const updateCharts = (transactions: Transaction[]) => {
  const categoryData = getCategoryStats(transactions);
  const totalCategory = Object.values(categoryData).reduce(
    (sum, val) => sum + val,
    0,
  );

  // 获取按月份和分类的统计数据
  const monthlyCategoryData: Record<string, Record<string, number>> = {};
  const allMonthsSet = new Set<string>();
  const allCategoriesSet = new Set<string>();

  transactions.forEach((transaction) => {
    if (transaction.flow === '支出') {
      const dateStr = transaction.expTime || transaction.createdTime;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          const category =
            transaction.transactionType || transaction.type || '其他';

          allMonthsSet.add(monthKey);
          allCategoriesSet.add(category);

          if (!monthlyCategoryData[monthKey]) {
            monthlyCategoryData[monthKey] = {};
          }
          monthlyCategoryData[monthKey][category] =
            (monthlyCategoryData[monthKey][category] || 0) + transaction.amt;
        }
      }
    }
  });

  const months = [...allMonthsSet].sort();
  const categories = [...allCategoriesSet];

  // 计算每个月的总计用于显示在柱子顶部
  const monthlyTotals = months.map((month) => {
    return categories.reduce(
      (sum, category) => sum + (monthlyCategoryData[month]?.[category] || 0),
      0,
    );
  });

  const series: any[] = [];

  categories.forEach((category) => {
    const data = months.map(
      (month) => monthlyCategoryData[month]?.[category] || 0,
    );
    series.push({
      name: category,
      type: 'bar',
      stack: 'expense',
      barMaxWidth: 120,
      emphasis: {
        focus: 'series',
      },
      data,
    });
  });

  // 添加一个透明系列用于显示每个月的总计
  series.push({
    name: '月度合计',
    type: 'bar',
    stack: '',
    data: monthlyTotals,
    barMaxWidth: 120,
    barGap: '-100%',
    z: 10,
    label: {
      show: true,
      position: 'top',
      formatter: (params: any) => {
        return params.value > 0 ? `¥${params.value.toFixed(2)}` : '';
      },
      fontSize: 12,
      color: '#333',
      fontWeight: 'bold',
    },
    itemStyle: {
      color: 'rgba(0,0,0,0)',
    },
    emphasis: {
      disabled: true,
    },
  });

  // 渲染月度柱状图
  renderMonthlyChart({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        let tooltip = `${params[0].name}<br/>`;
        let total = 0;

        // 计算总数
        params.forEach((item: any) => {
          if (item.seriesName !== '月度合计') {
            total += item.value || 0;
          }
        });

        // 显示各分类
        params.forEach((item: any) => {
          if (item.seriesName !== '月度合计' && item.value > 0) {
            const percentage =
              total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            tooltip += `${item.marker} ${item.seriesName}: ¥${item.value.toFixed(2)} (${percentage}%)<br/>`;
          }
        });

        tooltip += `<div style="border-top:1px solid #eee;margin-top:5px;padding-top:5px;font-weight:bold;">
          月度合计: ¥${total.toFixed(2)}
        </div>`;
        return tooltip;
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      formatter: (name: string) => {
        if (name === '月度合计') return '';
        return name;
      },
    },
    grid: {
      top: '15%',
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: months,
      axisLabel: {
        rotate: 45,
      },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}',
      },
    },
    series,
  });

  // 渲染类型饼图
  const pieData = Object.entries(categoryData)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  renderCategoryChart({
    title: {
      text: `总计\n¥${totalCategory.toFixed(2)}`,
      left: '40%',
      top: '50%',
      textAlign: 'center',
      textVerticalAlign: 'middle',
      textStyle: {
        fontSize: 14,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: ¥{c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        fontSize: 12,
      },
    },
    series: [
      {
        name: '支出类型分布',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {d}%',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: true,
        },
        data: pieData,
      },
    ],
  });

  // 添加饼图点击事件
  setTimeout(() => {
    const chartInstance = getCategoryChartInstance();
    if (chartInstance) {
      chartInstance.off('click'); // 移除之前的事件监听器
      chartInstance.on('click', (params: any) => {
        if (params.componentType === 'series' && params.data) {
          // 点击饼图扇区时过滤数据
          selectedCategory.value = params.data.name;

          // 更新表格数据
          gridApi.setState({
            gridOptions: {
              data: filteredTransactions.value,
            },
          });
        }
      });
    }
  }, 100);
};

// 添加重置过滤的方法
const resetFilter = () => {
  selectedCategory.value = null;
  gridApi.setState({
    gridOptions: {
      data: transactions.value,
    },
  });
};

// 计算过滤后的交易数据
const filteredTransactions = computed(() => {
  if (!selectedCategory.value) {
    return transactions.value;
  }
  return transactions.value.filter(
    (transaction) => transaction.transactionType === selectedCategory.value,
  );
});

// 支出类型
const dictOptions = ref<Array<{ id: number; label: string; value: string }>>(
  [],
);

// 添加一个计算属性来确保数据格式正确
const selectOptions = computed(() => {
  return dictOptions.value.map((item) => ({
    value: item.id,
    label: item.label,
  }));
});

const loadExpTypes = async () => {
  try {
    const res = await getByDictType('exp_type');
    dictOptions.value = res.dictDetailList;

    // 更新表格列的支出类型选项
    if (gridOptions.columns) {
      const columns = gridOptions.columns;
      const expTypeColumn = columns.find((col) => col.field === 'expTypeId');
      if (expTypeColumn && expTypeColumn.editRender) {
        expTypeColumn.editRender.options = selectOptions.value;
      }
    }

    // 自动匹配支出类型
    matchExpenseTypes();
  } catch (error) {
    console.error('加载支出类型失败:', error);
  }
};

// 根据原交易分类自动匹配支出类型
const matchExpenseTypes = () => {
  if (dictOptions.value.length === 0) return;

  transactions.value.forEach((transaction) => {
    // 如果支出类型还没有设置，或者设置为默认值119，则尝试匹配
    if (!transaction.expTypeId || transaction.expTypeId === 119) {
      const transactionType = transaction.transactionType || transaction.type;
      if (transactionType) {
        // 查找匹配的支出类型
        const matchedOption = dictOptions.value.find(
          (option) => option.label === transactionType,
        );
        if (matchedOption) {
          transaction.expTypeId = matchedOption.id;
        }
      }
    }
  });

  // 更新表格数据
  if (transactions.value.length > 0) {
    gridApi.setState({
      gridOptions: {
        data: transactions.value,
      },
    });
  }
};

// 在组件挂载时加载值集数据
onMounted(() => {
  loadExpTypes();
});

const gridOptions: VxeGridProps<RowType> = {
  border: true, // 表格是否显示边框
  stripe: true, // 是否显示斑马纹
  showFooter: true, // 显示底部合计行
  pagerConfig: { enabled: false }, // 关闭分页
  maxHeight: 700,
  minHeight: 700,
  showOverflow: true,
  editConfig: {
    // 启用单元格编辑
    mode: 'cell',
    trigger: 'click',
  },
  checkboxConfig: {
    isShiftKey: true,
  },
  columns: [
    { type: 'checkbox', title: '', width: 60 },
    { title: '序号', type: 'seq', width: 50 },
    { title: '主键', visible: false },
    {
      field: 'transactionAmt',
      title: '交易金额',
      sortable: true,
      headerAlign: 'center',
      align: 'right',
      formatter: ({ cellValue }) => {
        const value = Number(cellValue);
        return isNaN(value) ? '' : value.toFixed(2);
      },
    },
    {
      field: 'amt',
      title: '记账金额',
      sortable: true,
      headerAlign: 'center',
      align: 'right',
      formatter: ({ cellValue }) => {
        const value = Number(cellValue);
        return isNaN(value) ? '' : value.toFixed(2);
      },
      editRender: {
        name: 'input',
        props: {
          type: 'number',
          placeholder: '请输入金额',
        },
      },
    },
    {
      field: 'counterparty',
      title: '交易对方',
      sortable: true,
    },
    {
      field: 'expDesc',
      title: '商品描述',
      sortable: true,
    },
    {
      field: 'expTime',
      title: '交易时间',
      sortable: true,
    },
    {
      field: 'remark',
      title: '备注',
      sortable: true,
      editRender: {
        name: 'input',
      },
    },
    {
      field: 'transactionType',
      title: '原交易分类',
      sortable: true,
    },
    {
      field: 'expTypeId',
      title: '支出类型',
      sortable: true,
      editRender: {
        name: 'select',
        options: dictOptions.value.map((item) => ({
          value: item.id,
          label: item.label,
        })),
      },
    },
    {
      field: 'transactionStatus',
      title: '交易状态',
      sortable: true,
    },
    {
      field: 'counterpartyAcct',
      title: '对方账号',
      sortable: true,
    },
    { title: '交易号', field: 'transactionId' },
    { title: '商家订单号', field: 'merchantOrderNo' },
    {
      field: 'action',
      slots: { default: 'action' },
      fixed: 'right',
      title: '操作',
      width: 80,
    },
  ],
  footerMethod: ({ columns, data }) => {
    const footerData = [];
    const sums: Record<string, string> = {};
    columns.forEach((column) => {
      const field = column.field;
      if (field === 'amt' || field === 'transactionAmt') {
        const total = data.reduce((prev, row) => {
          const value = row[field];
          return prev + (Number(value) || 0);
        }, 0);
        sums[field] = `${total.toFixed(2)}`;
      } else {
        sums[field] = '';
      }
    });
    footerData.push(sums);
    return footerData;
  },
  keepSource: true,
};

function submitData() {
  // 直接使用 transactions.value，这是用户修改后的最新数据
  if (!transactions.value || transactions.value.length === 0) {
    message.warning('没有数据可提交');
    return;
  }

  // 同步表格中的编辑数据到 transactions.value
  const tableData = gridApi.grid.getTableData();
  if (tableData && tableData.fullData) {
    // 将表格中的修改同步回 transactions
    tableData.fullData.forEach((row: any) => {
      const transaction = transactions.value.find(
        (t) => t.transactionId === row.transactionId,
      );
      if (transaction) {
        Object.assign(transaction, row);
      }
    });
  }

  console.log('提交数据:', transactions.value);
  submitLoading.value = true;
  saveBatch(transactions.value)
    .then(() => {
      message.success('数据提交成功');
    })
    .catch((error) => {
      console.error('提交失败:', error);
    })
    .finally(() => {
      submitLoading.value = false;
    });
}

// 添加删除选中的行函数
const deleteSelectedRows = () => {
  const selectedRows = gridApi.grid.getCheckboxRecords();
  if (selectedRows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }

  // 从transactions中移除选中的行
  const selectedIds = new Set(selectedRows.map((row) => row.transactionId));
  transactions.value = transactions.value.filter(
    (transaction) => !selectedIds.has(transaction.transactionId),
  );

  // 更新表格数据
  gridApi.setState({
    gridOptions: {
      data: transactions.value,
    },
  });

  // 更新统计信息
  updateStats(transactions.value);

  message.success(`成功删除 ${selectedRows.length} 条记录`);
};

// 添加删除单行函数
const deleteRow = (row: RowType) => {
  // 从transactions中移除该行
  transactions.value = transactions.value.filter(
    (transaction) => transaction.transactionId !== row.transactionId,
  );

  // 更新表格数据
  gridApi.setState({
    gridOptions: {
      data: transactions.value,
    },
  });

  // 更新统计信息
  updateStats(transactions.value);

  message.success('删除成功');
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });
</script>

<template>
  <div class="page-container">
    <div
      ref="uploadAreaRef"
      class="upload-area"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="handleUploadAreaClick"
    >
      <p class="upload-text">拖放ZIP、CSV或Excel文件到此处，或点击上传</p>
      <p class="upload-hint">
        支持支付宝电脑端ZIP文件、手机端CSV文件或微信账单Excel文件
      </p>
      <div class="browse-btn" @click="handleBrowseClick">选择文件</div>
      <input
        ref="fileInputRef"
        type="file"
        accept=".zip,.csv,.xlsx"
        @change="handleFileChange"
      />
    </div>

    <div v-if="loading" class="loading">正在处理文件，请稍候...</div>

    <div v-show="resultsVisible" class="results">
      <h2>交易记录概览</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-label">开始时间</div>
          <div class="stat-value">{{ stats.startTime || '暂无数据' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">结束时间</div>
          <div class="stat-value">{{ stats.endTime || '暂无数据' }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">支出笔数</div>
          <div class="stat-value expense">{{ stats.expenseCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总支出</div>
          <div class="stat-value expense">
            {{ stats.totalExpense.toFixed(2) }}
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-container">
        <Card class="chart-card" title="月度支出统计">
          <EchartsUI ref="monthlyChartRef" style="height: 300px" />
        </Card>
        <Card class="chart-card" title="支出类型分布">
          <EchartsUI ref="categoryChartRef" style="height: 300px" />
        </Card>
      </div>
    </div>

    <div class="w-full">
      <Grid>
        <template #toolbar-tools>
          <div class="toolbar-buttons">
            <Button type="primary" @click="submitData" :loading="submitLoading">
              提交
            </Button>
            <Popconfirm
              title="确定要删除选中的记录吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="deleteSelectedRows"
            >
              <Button type="primary" danger>删除</Button>
            </Popconfirm>
            <Button type="default" @click="resetFilter" v-if="selectedCategory">
              重置过滤
            </Button>
          </div>
        </template>
        <template #action="{ row }">
          <Popconfirm
            title="是否确认删除?"
            ok-text="是"
            cancel-text="否"
            @confirm="deleteRow(row)"
          >
            <Button type="link" size="small" danger>
              <template #icon><DeleteOutlined /></template>
            </Button>
          </Popconfirm>
        </template>
      </Grid>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  @apply w-full rounded-xl bg-white p-4 shadow-sm md:p-6 dark:bg-[#141414];
}

h1 {
  @apply mb-5 text-center font-semibold text-blue-600 dark:text-blue-500;
}

.upload-area {
  @apply mb-6 cursor-pointer rounded-lg border-2 border-dashed border-blue-500 bg-blue-50 p-4 text-center transition-all duration-300 md:p-6 dark:border-blue-700 dark:bg-blue-900/20;
}

.upload-area:hover,
.upload-area.dragover {
  @apply -translate-y-0.5 bg-blue-100 dark:bg-blue-900/40;
}

.upload-text {
  @apply mb-1 font-medium text-gray-800 dark:text-gray-200;
}

.upload-hint {
  @apply mb-2 text-xs text-gray-500 dark:text-gray-400;
}

.browse-btn {
  @apply inline-block cursor-pointer rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-300 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500;
}

input[type='file'] {
  display: none;
}

.results {
  @apply mt-6;
}

.results h2 {
  @apply mb-4 text-lg font-semibold text-gray-800 dark:text-gray-200;
}

.stats {
  @apply mb-5 flex flex-wrap justify-around gap-3;
}

.stat-card {
  @apply min-w-[140px] flex-1 rounded-lg border border-gray-100 bg-white p-4 text-center shadow-sm md:min-w-[160px] dark:border-[#303030] dark:bg-[#1f1f1f];
}

.stat-value {
  @apply my-2 text-xl font-bold text-blue-600 md:text-2xl dark:text-blue-400;
}

.stat-label {
  @apply text-sm text-gray-500 dark:text-gray-400;
}

.expense {
  @apply text-red-500 dark:text-red-400;
}

.loading {
  @apply p-5 text-center text-blue-600 dark:text-blue-400;
}

.charts-container {
  @apply mb-6 mt-6 grid grid-cols-1 gap-4 md:grid-cols-2;
}

.chart-card {
  @apply h-[400px];
}

.toolbar-buttons {
  @apply flex items-center gap-2;
}

.toolbar-buttons :deep(.ant-btn) {
  @apply h-8 px-3 text-sm;
}
</style>
