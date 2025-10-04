<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import JSZip from 'jszip';

interface Transaction {
  transactionId: string;
  merchantOrderId: string;
  createdTime: string;
  paymentTime: string;
  lastModifiedTime: string;
  source: string;
  type: string;
  counterparty: string;
  productName: string;
  amount: number;
  flow: string;
  status: string;
  serviceFee: number;
  successfulRefund: number;
  remark: string;
  fundStatus: string;
}

const uploadAreaRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();
const loading = ref(false);
const resultsVisible = ref(false);
const transactions = ref<Transaction[]>([]);
const sortConfig = ref<{ key: string; ascending: boolean }>({ key: '', ascending: true });

// 统计信息
const stats = ref({
  totalTransactions: 0,
  incomeCount: 0,
  expenseCount: 0,
  totalIncome: 0,
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

  if (e.dataTransfer?.files.length) {
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
  if (target.files?.length) {
    handleFile(target.files[0]);
  }
};

// 处理上传的ZIP文件
const handleFile = async (file: File) => {
  if (!file.name.endsWith('.zip')) {
    alert('请上传ZIP文件');
    return;
  }

  loading.value = true;
  resultsVisible.value = false;

  try {
    const arrayBuffer = await readFileAsArrayBuffer(file);
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 查找ZIP中的CSV文件
    const csvFilename = Object.keys(zip.files).find(name => name.endsWith('.csv'));

    if (!csvFilename) {
      throw new Error('ZIP文件中未找到CSV文件');
    }

    // 读取CSV文件为ArrayBuffer
    const csvArrayBuffer = await zip.file(csvFilename)!.async('arraybuffer');

    // 解决中文乱码问题 - 支付宝CSV通常使用GBK编码
    let csvText: string;
    try {
      // 尝试使用GBK解码
      const decoder = new TextDecoder('gbk');
      csvText = decoder.decode(csvArrayBuffer);
    } catch (e) {
      // 如果GBK解码失败，尝试使用UTF-8
      const decoder = new TextDecoder('utf-8');
      csvText = decoder.decode(csvArrayBuffer);
    }

    // 解析CSV内容
    const parsedTransactions = parseCSV(csvText);
    transactions.value = parsedTransactions;
    updateStats(parsedTransactions);

    loading.value = false;
    resultsVisible.value = true;
  } catch (error) {
    console.error('Error:', error);
    alert('处理文件时出错: ' + (error as Error).message);
    loading.value = false;
  }
};

// 读取文件为ArrayBuffer
const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
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
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('交易号') || lines[i].includes('交易号')) {
      dataStartIndex = i + 1;
      break;
    }
  }

  // 解析数据行
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行和汇总行
    if (!line || line.includes('共') || line.includes('导出时间') || line.includes('----')) {
      continue;
    }

    // 简单的CSV解析
    const columns = line.split(',').map(col => col.trim());

    if (columns.length >= 15) {
      transactions.push({
        transactionId: columns[0],
        merchantOrderId: columns[1],
        createdTime: columns[2],
        paymentTime: columns[3],
        lastModifiedTime: columns[4],
        source: columns[5],
        type: columns[6],
        counterparty: columns[7],
        productName: columns[8],
        amount: parseFloat(columns[9]) || 0,
        flow: columns[10],
        status: columns[11],
        serviceFee: parseFloat(columns[12]) || 0,
        successfulRefund: parseFloat(columns[13]) || 0,
        remark: columns[14],
        fundStatus: columns[15] || ''
      });
    }
  }

  return transactions;
};

// 更新统计信息
const updateStats = (transactions: Transaction[]) => {
  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  transactions.forEach(transaction => {
    if (transaction.flow === '收入') {
      totalIncome += transaction.amount;
      incomeCount++;
    } else if (transaction.flow === '支出') {
      totalExpense += transaction.amount;
      expenseCount++;
    }
  });

  stats.value = {
    totalTransactions: transactions.length,
    incomeCount,
    expenseCount,
    totalIncome,
    totalExpense,
  };
};

// 表格排序
const sortTable = (key: string) => {
  const isAscending = sortConfig.value.key === key ? !sortConfig.value.ascending : true;
  sortConfig.value = { key, ascending: isAscending };

  transactions.value.sort((a, b) => {
    let valueA = a[key as keyof Transaction];
    let valueB = b[key as keyof Transaction];

    // 处理数值排序
    if (key === 'amount') {
      valueA = parseFloat(valueA as string);
      valueB = parseFloat(valueB as string);
    }

    // 处理日期排序
    if (key.includes('Time')) {
      valueA = new Date(valueA as string).getTime();
      valueB = new Date(valueB as string).getTime();
    }

    if (valueA < valueB) {
      return isAscending ? -1 : 1;
    }
    if (valueA > valueB) {
      return isAscending ? 1 : -1;
    }
    return 0;
  });
};

// 获取排序指示器类名
const getSortClass = (key: string) => {
  if (sortConfig.value.key !== key) return '';
  return sortConfig.value.ascending ? 'asc' : 'desc';
};

onMounted(() => {
  // 确保DOM元素已挂载
});
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
      <div class="upload-icon">📁</div>
      <p class="upload-text">拖放ZIP文件到此处，或点击上传</p>
      <div class="browse-btn" @click="handleBrowseClick">选择文件</div>
      <input
        ref="fileInputRef"
        type="file"
        accept=".zip"
        @change="handleFileChange"
      >
    </div>

    <div v-if="loading" class="loading">
      正在处理文件，请稍候...
    </div>

    <div v-if="resultsVisible" class="results">
      <h2>交易记录概览</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-label">交易总数</div>
          <div class="stat-value">{{ stats.totalTransactions }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">收入笔数</div>
          <div class="stat-value income">{{ stats.incomeCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">支出笔数</div>
          <div class="stat-value expense">{{ stats.expenseCount }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总收入</div>
          <div class="stat-value income">{{ stats.totalIncome.toFixed(2) }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">总支出</div>
          <div class="stat-value expense">{{ stats.totalExpense.toFixed(2) }}</div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th
                :class="getSortClass('transactionId')"
                @click="sortTable('transactionId')"
              >
                交易号
              </th>
              <th
                :class="getSortClass('createdTime')"
                @click="sortTable('createdTime')"
              >
                交易创建时间
              </th>
              <th
                :class="getSortClass('type')"
                @click="sortTable('type')"
              >
                类型
              </th>
              <th
                :class="getSortClass('counterparty')"
                @click="sortTable('counterparty')"
              >
                交易对方
              </th>
              <th
                :class="getSortClass('productName')"
                @click="sortTable('productName')"
              >
                商品名称
              </th>
              <th
                :class="getSortClass('amount')"
                @click="sortTable('amount')"
              >
                金额 (元)
              </th>
              <th
                :class="getSortClass('flow')"
                @click="sortTable('flow')"
              >
                收/支
              </th>
              <th
                :class="getSortClass('status')"
                @click="sortTable('status')"
              >
                交易状态
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="transactions.length === 0">
              <td colspan="8" class="no-data">未找到交易记录</td>
            </tr>
            <tr v-for="transaction in transactions" :key="transaction.transactionId">
              <td>{{ transaction.transactionId }}</td>
              <td>{{ transaction.createdTime }}</td>
              <td>{{ transaction.type }}</td>
              <td>{{ transaction.counterparty }}</td>
              <td>{{ transaction.productName }}</td>
              <td :class="{ 'income': transaction.flow === '收入', 'expense': transaction.flow === '支出' }">
                {{ transaction.amount.toFixed(2) }}
              </td>
              <td>{{ transaction.flow }}</td>
              <td>{{ transaction.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
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
  max-width: 1200px;
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

.description {
  text-align: center;
  margin-bottom: 30px;
  color: #666;
}

.upload-area {
  border: 2px dashed #1677ff;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  margin-bottom: 30px;
  background-color: #f0f7ff;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area:hover, .upload-area.dragover {
  background-color: #e0efff;
  transform: translateY(-2px);
}

.upload-icon {
  font-size: 48px;
  color: #1677ff;
  margin-bottom: 15px;
}

.upload-text {
  margin-bottom: 15px;
  font-weight: 500;
}

.browse-btn {
  display: inline-block;
  background: #1677ff;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.browse-btn:hover {
  background: #0e5fd0;
}

input[type="file"] {
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

.income {
  color: #52c41a;
}

.expense {
  color: #ff4d4f;
}

.table-container {
  overflow-x: auto;
  margin-top: 20px;
  border-radius: 8px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.08);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #eaeaea;
}

th {
  background-color: #f0f7ff;
  color: #1677ff;
  font-weight: 600;
  cursor: pointer;
  position: relative;
}

th:hover {
  background-color: #e0efff;
}

th::after {
  content: '↕';
  position: absolute;
  right: 8px;
  opacity: 0.5;
}

th.asc::after {
  content: '↑';
  opacity: 1;
}

th.desc::after {
  content: '↓';
  opacity: 1;
}

tr:hover {
  background-color: #f9fbfd;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #999;
}

.loading {
  text-align: center;
  padding: 20px;
  color: #1677ff;
}

.encoding-info {
  background-color: #fffbf0;
  border-left: 4px solid #ffc53d;
  padding: 15px;
  margin: 20px 0;
  border-radius: 4px;
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

  th, td {
    padding: 8px 10px;
    font-size: 14px;
  }
}
</style>
