<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { VxeGridProps } from '#/adapter/vxe-table';

import { computed, onMounted, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { Button, Card, message, Popconfirm } from "ant-design-vue";
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/common';
import { saveBatch } from '#/api/core/expense';

import FormDrawerDemo from './form-drawer.vue';

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

// 定义RowType接口，用于表格数据
interface RowType extends Transaction {
  // 可以添加额外的表格字段
}

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
const {
  renderEcharts: renderMonthlyChart,
  getChartInstance: getMonthlyChartInstance,
} = useEcharts(monthlyChartRef);
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
    alert('请上传ZIP文件、CSV文件或Excel文件');
    return;
  }

  loading.value = true;
  resultsVisible.value = false;

  try {
    let parsedTransactions: Transaction[] = [];

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
        parsedTransactions = isMobileCSV
          ? parseMobileCSV(csvText)
          : parseCSV(csvText);
      } catch {
        // 如果GBK解码失败，尝试使用UTF-8
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(csvArrayBuffer);
        // 检测文件类型并解析CSV内容
        const isMobileCSV = file.name.includes('支付宝交易明细');
        parsedTransactions = isMobileCSV
          ? parseMobileCSV(csvText)
          : parseCSV(csvText);
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
        parsedTransactions = isMobileCSV
          ? parseMobileCSV(csvText)
          : parseCSV(csvText);
      } catch {
        // 如果GBK解码失败，尝试使用UTF-8
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(arrayBuffer);
        // 检测文件类型并解析CSV内容
        const isMobileCSV = file.name.includes('支付宝交易明细');
        parsedTransactions = isMobileCSV
          ? parseMobileCSV(csvText)
          : parseCSV(csvText);
      }
    } else if (file.name.endsWith('.xlsx')) {
      // 处理Excel文件
      const arrayBuffer = await readFileAsArrayBuffer(file);
      // 检测是否为微信账单
      const isWechatBill = file.name.includes('微信支付账单');
      if (isWechatBill) {
        parsedTransactions = parseWechatExcel(arrayBuffer);
      } else {
        throw new Error('暂不支持该Excel文件格式');
      }
    }

    transactions.value = parsedTransactions;
    updateStats(parsedTransactions);

    // 更新表格数据
    gridApi.setState({
      gridOptions: {
        data: parsedTransactions,
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

// 解析CSV内容
const parseCSV = (csvText: string): Transaction[] => {
  const lines = csvText.split('\n');
  const transactions: Transaction[] = [];

  // 查找数据行开始位置（跳过标题和元数据）
  let dataStartIndex = 0;
  for (const [i, line] of lines.entries()) {
    if (line.includes('交易号') || line.includes('交易号')) {
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
      if (transaction.flow === '支出' && transaction.transactionStatus === '交易成功') {
        transactions.push(transaction);
      }
    }
  }

  return transactions;
};

// 解析微信账单Excel内容
const parseWechatExcel = (arrayBuffer: ArrayBuffer): Transaction[] => {
  const transactions: Transaction[] = [];

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
  for (const [i, jsonDatum] of jsonData.entries()) {
    const row = jsonDatum as string[];
    if (row.length > 0 && row[0]?.includes('交易时间')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  if (dataStartIndex === -1) {
    throw new Error('未找到微信账单数据行');
  }

  // 解析数据行
  for (let i = dataStartIndex; i < jsonData.length; i++) {
    const row = jsonData[i] as string[];

    // 跳过空行
    if (!row || row.length === 0 || !row[0]) {
      continue;
    }

    // 微信账单格式：交易时间,交易类型,交易对方,商品,收/支,金额(元),支付方式,当前状态,交易单号,商户单号,备注
    if (row.length >= 11) {
      const transactionTime = row[0] || '';
      const transactionType = row[1] || '';
      const counterparty = row[2] || '';
      const goods = row[3] || '';
      const flow = row[4] || '';
      const amountStr = row[5] || '';
      const paymentMethod = row[6] || '';
      const transactionStatus = row[7] || '';
      const transactionId = row[8] || '';
      const merchantOrderNo = row[9] || '';
      const remark = row[10] || '';

      // 处理金额，去除¥符号并转换为数字
      const amount = Number.parseFloat(amountStr.replaceAll('¥', '')) || 0;

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
  }

  return transactions;
};

// 解析手机端CSV内容
const parseMobileCSV = (csvText: string): Transaction[] => {
  const lines = csvText.split('\n');
  const transactions: Transaction[] = [];

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

  return transactions;
};

// 计算月度统计数据
const getMonthlyStats = (transactions: Transaction[]) => {
  const monthlyData: Record<string, number> = {};

  transactions.forEach((transaction) => {
    if (transaction.flow === '支出') {
      // 解析日期，提取年月
      const dateStr = transaction.expTime || transaction.createdTime;
      if (dateStr) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          monthlyData[monthKey] =
            (monthlyData[monthKey] || 0) + transaction.amt;
        }
      }
    }
  });

  return monthlyData;
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
const updateStats = (transactions: Transaction[]) => {
  let totalExpense = 0;
  let expenseCount = 0;

  // 计算开始时间和结束时间
  let startTime = '';
  let endTime = '';

  if (transactions.length > 0) {
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
  const monthlyData = getMonthlyStats(transactions);
  const categoryData = getCategoryStats(transactions);

  // 渲染月度柱状图
  renderMonthlyChart({
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
      formatter: (params: any) => {
        const data = params[0];
        return `${data.name}<br/>支出金额: ¥${data.value.toFixed(2)}`;
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: Object.keys(monthlyData).sort(),
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
    series: [
      {
        name: '月度支出',
        type: 'bar',
        data: Object.keys(monthlyData)
          .sort()
          .map((month) => monthlyData[month]),
        itemStyle: {
          color: '#ff4d4f',
        },
      },
    ],
  });

  // 渲染类型饼图
  const pieData = Object.entries(categoryData)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  renderCategoryChart({
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
  } catch (error) {
    console.error('加载支出类型失败:', error);
  }
};

// 添加一个计算属性或方法来查找标签
const getIncomeTypeLabel = (value: number) => {
  // 将 value 转换为字符串以匹配 dictOptions 中的值
  const option = dictOptions.value.find((item) => item.id === value);
  return option ? option.label : String(value);
};

// 在组件挂载时加载值集数据
onMounted(() => {
  loadExpTypes();
});

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: FormDrawerDemo,
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
      width: 120,
    },
  ],
  footerMethod: ({ columns, data }) => {
    const footerData = [];
    const sums: Record<string, string> = {};
    columns.forEach((column) => {
      const field = column.field;
      if (field === 'amt') {
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
  toolbarConfig: {
    // 是否显示搜索表单控制按钮
  },
};

function submitData() {
  // 获取所有表格数据（包括懒加载的数据）
  const tableData = gridApi.grid.getFullData();
  if (!tableData || tableData.length === 0) {
    alert('没有数据可提交');
    return;
  }
  console.log('提交数据:', tableData);
  submitLoading.value = true;
  saveBatch(tableData)
    .then(() => {
      message.success('数据提交成功');
    })
    .catch((error) => {
      console.error('提交失败:', error);
      message.error(`提交失败: ${error.message}`);
    })
    .finally(() => {
      submitLoading.value = false;
    });
}

// 添加删除选中的行函数
const deleteSelectedRows = () => {
  const selectedRows = gridApi.grid.getCheckboxRecords();
  if (selectedRows.length === 0) {
    alert('请先选择要删除的记录');
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

  alert(`成功删除 ${selectedRows.length} 条记录`);
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

  alert('提交成功');
};

const [Grid, gridApi] = useVbenVxeGrid({ gridOptions });
</script>

<template>
  <div class="container">
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

    <div v-if="resultsVisible" class="results">
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
          <Button
            class="mr-2"
            type="primary"
            @click="submitData"
            :loading="submitLoading"
          >
            提交
          </Button>
          &nbsp;
          <Popconfirm
            title="确定要删除选中的记录吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="deleteSelectedRows"
          >
            <Button class="mr-2" type="primary"> 删除 </Button>&nbsp;
            <Button
              class="mr-2"
              type="default"
              @click="resetFilter"
              v-if="selectedCategory"
            >
              重置过滤
            </Button>
          </Popconfirm>
        </template>
        <template #action="{ row }">
          <Popconfirm
            title="是否确认删除?"
            ok-text="是"
            cancel-text="否"
            @confirm="deleteRow(row)"
          >
            <a href="#">删除</a>
          </Popconfirm>
        </template>
      </Grid>
    </div>
  </div>
</template>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.container {
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  padding: 30px;
}

h1 {
  text-align: center;
  color: #1677ff;
  margin-bottom: 20px;
  font-weight: 600;
}

.upload-area {
  border: 2px dashed #1677ff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  margin-bottom: 30px;
  background-color: #f0f7ff;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area:hover,
.upload-area.dragover {
  background-color: #e0efff;
  transform: translateY(-2px);
}

.upload-text {
  margin-bottom: 5px;
  font-weight: 500;
}

.upload-hint {
  margin-bottom: 10px;
  font-size: 12px;
  color: #666;
}

.browse-btn {
  display: inline-block;
  background: #1677ff;
  color: white;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.browse-btn:hover {
  background: #0e5fd0;
}

input[type='file'] {
  display: none;
}

.results {
  margin-top: 30px;
}

.stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  min-width: 200px;
  text-align: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
  margin: 10px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #1677ff;
  margin: 10px 0;
}

.stat-label {
  color: #666;
  font-size: 14px;
}

.expense {
  color: #ff4d4f;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #1677ff;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-top: 30px;
}

.chart-card {
  height: 400px;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 15px;
  }

  .upload-area {
    padding: 20px;
  }

  .stat-card {
    min-width: 140px;
    padding: 15px;
  }
}
</style>
