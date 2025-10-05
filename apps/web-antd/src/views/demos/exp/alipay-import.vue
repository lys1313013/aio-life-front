<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

import { onMounted, ref, computed } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import { Button, Popconfirm } from 'ant-design-vue';
import JSZip from 'jszip';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getByDictType } from '#/api/core/common';
import { saveBatch } from '#/api/core/expense';

import FormDrawerDemo from './form-drawer.vue';

interface Transaction {
  transactionId: string;
  merchantOrderId: string;
  createdTime: string;
  expTime: string;
  lastModifiedTime: string;
  source: string;
  type: string;
  counterparty: string;
  expDesc: string;
  amt: number;
  flow: string;
  status: string;
  serviceFee: number;
  successfulRefund: number;
  remark: string;
  fundStatus: string;
  expTypeId?: number; // 添加支出类型字段
}

const uploadAreaRef = ref<HTMLElement>();
const fileInputRef = ref<HTMLInputElement>();
const loading = ref(false);
const resultsVisible = ref(false);
const transactions = ref<Transaction[]>([]);

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
    const csvFilename = Object.keys(zip.files).find((name) =>
      name.endsWith('.csv'),
    );

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
    } catch {
      // 如果GBK解码失败，尝试使用UTF-8
      const decoder = new TextDecoder('utf-8');
      csvText = decoder.decode(csvArrayBuffer);
    }

    // 解析CSV内容
    const parsedTransactions = parseCSV(csvText);
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
  } catch (error) {
    console.error('Error:', error);
    alert(`处理文件时出错: ${(error as Error).message}`);
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
    const line = lines[i].trim();

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
        transactionId: columns[0],
        merchantOrderId: columns[1],
        createdTime: columns[2],
        expTime: columns[3],
        lastModifiedTime: columns[4],
        source: columns[5],
        type: columns[6],
        counterparty: columns[7],
        expDesc: columns[8],
        amt: Number.parseFloat(columns[9]) || 0,
        flow: columns[10], // 收支方向
        status: columns[11],
        serviceFee: Number.parseFloat(columns[12]) || 0,
        successfulRefund: Number.parseFloat(columns[13]) || 0,
        remark: columns[14],
        fundStatus: columns[15] || '',
        expTypeId: 119, // 初始化支出类型字段
      };

      // 只保留"支出"的数据，收入数据不处理（"不计收支"，"收入"不处理）
      //
      if (transaction.flow === '支出') {
        transactions.push(transaction);
      }
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

  transactions.forEach((transaction) => {
    if (transaction.flow === '收入') {
      totalIncome += transaction.amt;
      incomeCount++;
    } else if (transaction.flow === '支出') {
      totalExpense += transaction.amt;
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

onMounted(() => {
  // 确保DOM元素已挂载
});

interface RowType {
  transactionId: string;
  merchantOrderId: string;
  createdTime: string;
  expTime: string;
  lastModifiedTime: string;
  source: string;
  type: string;
  counterparty: string;
  expDesc: string;
  amt: number;
  flow: string;
  status: string;
  serviceFee: number;
  successfulRefund: number;
  remark: string;
  expTypeId?: number; // 添加支出类型字段
}

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
    console.error('加载收入类型失败:', error);
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

const formOptions: VbenFormProps = {
  collapsed: false, // 默认展开
  schema: [
    // 搜索
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择支出类型',
        options: dictOptions, // 绑定类型选项
        allowClear: true, // 添加清除选项功能
        fieldNames: { label: 'label', value: 'id' }, // 指定 label 和 value 的字段名
      },
      fieldName: 'expTypeId', // 修改为按类型查询
      label: '支出类型',
    },
  ],
  // 控制表单是否显示折叠按钮
  showCollapseButton: true,
  submitButtonOptions: {
    content: '查询',
  },
  submitOnChange: false, // 是否在字段值改变时提交表单
  submitOnEnter: true, // 按下回车时是否提交表单
};

const gridOptions: VxeGridProps<RowType> = {
  border: true, // 表格是否显示边框
  stripe: true, // 是否显示斑马纹
  showFooter: true, // 显示底部合计行
  pagerConfig: {enabled: false}, // 关闭分页
  maxHeight: 700,
  minHeight: 700,
  showOverflow: true,
  editConfig: { // 启用单元格编辑
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
      field: 'amt',
      title: '金额',
      sortable: true,
      headerAlign: 'center',
      align: 'right',
      formatter: ({ cellValue }) => {
        return cellValue.toFixed(2);
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
      field: 'expTypeId',
      title: '支出类型',
      sortable: true,
      editRender: {
        name: 'select', // 可编辑组件
        options: selectOptions,
      },
    },
    {
      field: 'status',
      title: '状态',
      sortable: true,
    },
    { title: '交易号', field: 'transactionId' },
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
    const sums = {};
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
    // @ts-ignore 正式环境时有完整的类型声明
    search: true,
  },
};

function submitData() {
  // 获取表格数据
  const tableData = gridApi.grid.getTableData().tableData;
  if (!tableData) {
    alert('没有数据可提交')
  }
  console.log('提交数据:', tableData);
  saveBatch(tableData);
}

const [Grid, gridApi] = useVbenVxeGrid({ formOptions, gridOptions });

// 批量删除选中的行
const deleteSelectedRows = async () => {
  // 获取选中的行
  const selectedRows = gridApi.grid.getCheckboxRecords();

  if (selectedRows.length === 0) {
    alert('请先选择要删除的行');
    return;
  }

  // 获取当前表格数据
  const tableData = gridApi.grid.getTableData().tableData;

  // 获取选中行的transactionId集合
  const selectedIds = new Set(selectedRows.map(row => row.transactionId));

  // 过滤掉选中的行
  const newData = tableData.filter(item => !selectedIds.has(item.transactionId));

  // 更新表格数据
  gridApi.setState({
    gridOptions: {
      data: newData,
    },
  });

  // 更新统计信息
  updateStats(newData);
};

const deleteRow = async (row: RowType) => {
  // 从表格数据中删除指定行
  const tableData = gridApi.grid.getTableData().tableData;
  const newData = tableData.filter(item => item.transactionId !== row.transactionId);

  // 更新表格数据
  gridApi.setState({
    gridOptions: {
      data: newData,
    },
  });

  // 更新统计信息
  updateStats(newData);
};

const tableReload = () => {
  gridApi.reload();
};
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
      <p class="upload-text">拖放ZIP文件到此处，或点击上传</p>
      <div class="browse-btn" @click="handleBrowseClick">选择文件</div>
      <input
        ref="fileInputRef"
        type="file"
        accept=".zip"
        @change="handleFileChange"
      />
    </div>

    <div v-if="loading" class="loading">正在处理文件，请稍候...</div>

    <div v-if="resultsVisible" class="results">
      <h2>交易记录概览</h2>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-label">交易总数</div>
          <div class="stat-value">{{ stats.totalTransactions }}</div>
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
    </div>

    <div class="w-full">
      <FormDrawer @table-reload="tableReload" />
      <Grid>
        <template #toolbar-tools>
          <Button class="mr-2" type="primary" @click="submitData">
            提交
          </Button> &nbsp;
          <Popconfirm
            title="确定要删除选中的记录吗？"
            ok-text="确定"
            cancel-text="取消"
            @confirm="deleteSelectedRows"
          >
            <Button class="mr-2" type="primary">
              删除
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
