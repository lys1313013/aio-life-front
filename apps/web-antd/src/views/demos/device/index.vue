<template>
  <a-card style="width: 100%" :tab-list="tabList" :active-tab-key="tabKey"
    @tabChange="(key) => onTabChange(key, 'tabKey')">
    <div class="electronics-container">

      <!-- 维护设备弹窗 -->
      <a-modal v-model:visible="visible" title="新增设备" @ok="handleOk" @cancel="handleCancel">
        <a-form :model="newDevice" layout="vertical">
          <a-form-item label="设备名称">
            <a-input v-model:value="newDevice.name" />
          </a-form-item>
          <a-form-item label="价格">
            <a-input-number v-model:value="newDevice.purchasePrice" style="width: 100%" />
          </a-form-item>
          <a-form-item label="购买日期">
            <a-date-picker format="YYYY-MM-DD" v-model:value="newDevice.purchaseDate" style="width: 100%" />
          </a-form-item>
          <a-form-item label="设备类型">
            <a-select v-model:value="newDevice.type" style="width: 100%" :options="typeOptions"/>
          </a-form-item>
          <a-form-item label="设备状态">
            <a-select v-model:value="newDevice.status" style="width: 100%" :options="statusOptions"/>
          </a-form-item>
          <a-form-item label="图片链接">
            <a-input v-model:value="newDevice.image" />
          </a-form-item>
          <a-form-item label="购买平台">
            <a-input v-model:value="newDevice.purchasePlace" />
          </a-form-item>
          <a-form-item label="订单号">
            <a-input v-model:value="newDevice.orderNumber" />
          </a-form-item>
        </a-form>
      </a-modal>

      <!-- 原有电子设备列表 -->
      <div class="electronics-grid">
        <div v-for="(item, index) in electronics" :key="index" class="electronics-card" @click="showEditModal(item)">
          <div class="card-image">
            <img v-if="item.image" :src="item.image" :alt="item.name" />
            <div v-else class="default-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 16L8.586 11.414C8.961 11.039 9.47 10.828 10 10.828C10.53 10.828 11.039 11.039 11.414 11.414L16 16M14 14L15.586 12.414C15.961 12.039 16.47 11.828 17 11.828C17.53 11.828 18.039 12.039 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z"
                  stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </div>
          <div class="card-content">
            <a-button class="delete-btn" type="text" danger @click.stop="handleDelete(item, index)">
            </a-button>
            <h3>{{ item.name }}</h3>
            <p class="price">价格: {{ item.purchasePrice }}</p>
            <p class="purchase-date">购买时间: {{ item.purchaseDate }}</p>
            <p class="usage-days">已使用: {{ getUsageDays(item.purchaseDate) }} 天</p>
            <p class="avg-cost">日均费用: {{ calculateAvgCost(item.purchasePrice, item.purchaseDate) }} 元/天</p>
            <div class="status-badge" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </div>
          </div>
        </div>
      </div>
      <!-- 新增可拖动悬浮球 -->
      <div class="floating-btn" ref="floatingBtn" @mousedown="startDrag" @click="showModal">
        <plus-outlined style="font-size: 24px; color: white" />
      </div>
    </div>
  </a-card>

</template>

<script >
import { Button, Modal, Form, Input, InputNumber, DatePicker, Select, Card } from 'ant-design-vue';

import moment from 'moment'; // 添加moment导入

import dayjs from 'dayjs';

import { query } from '#/api/core/device';

import { insertOrUpdate } from '#/api/core/device';

import { getByDictType } from '#/api/core/common';

import { DeleteOutlined } from '@ant-design/icons-vue';

import { PlusOutlined } from '@ant-design/icons-vue';

export default {
  components: {
    'a-button': Button,
    'a-modal': Modal,
    'a-form': Form,
    'a-form-item': Form.Item,
    'a-input': Input,
    'a-input-number': InputNumber,
    'a-date-picker': DatePicker,
    'a-select': Select,
    'a-select-option': Select.Option,
    'a-card': Card,
    'plus-outlined': PlusOutlined,
  },
  data() {
    return {
      visible: false,
      typeOptions: [], // 设备类型选项
      statusOptions: [], // 设备状态选项
      newDevice: {
        name: '',
        purchasePrice: 0,
        purchaseDate: '',
        image: '',
        status: '1', // 默认状态为"使用中"
        purchasePlace: '',
        orderNumber: ''
      },
      electronics: [
      ],
      tabList: [], // 页签列表
      tabKey: '', // 当前选中的页签
    }
  },
  methods: {
    async query() {
      const res = await query({
        page: 1,
        pageSize: 50,
        condition: {
          type: this.tabKey,
        }
      });
      this.electronics = res.items
      console.log('查询设备:', res);
    },

    showModal() {
      this.newDevice = {
        name: '',
        purchasePrice: 0,
        purchaseDate: dayjs(),
        status: '1', // 默认状态为"使用中",
        image: '',
        type: this.tabKey,
      };
      this.visible = true;
    },
    showEditModal(item) {
      this.newDevice = {
        ...item,
        // 确保日期类型一致
        purchaseDate: dayjs(item.purchaseDate)
      };
      this.visible = true;
    },
    async handleOk() {
      console.log('新增日期:', this.newDevice.purchaseDate);

      // 确保日期正确格式化
      let formattedDate = '';
      if (this.newDevice.purchaseDate) {
        // 如果是字符串直接使用，如果是moment对象则格式化
        formattedDate = typeof this.newDevice.purchaseDate === 'string'
          ? this.newDevice.purchaseDate
          : this.newDevice.purchaseDate.format('YYYY-MM-DD');
      }

      console.log('格式化后的日期:', formattedDate);

      const deviceData = {
        ...this.newDevice,
        purchaseDate: formattedDate
      };

      // 调用API新增设备
      await insertOrUpdate(deviceData)

      this.query();
      this.visible = false;
      this.resetForm();
    },
    handleCancel() {
      this.visible = false;
      this.resetForm();
    },
    resetForm() {
      this.newDevice = {
        name: '',
        purchasePrice: 0,
        purchaseDate: '',
        image: ''
      };
    },
    calculateAvgCost(price, purchaseDate) {
      const usageDays = this.getUsageDays(purchaseDate);
      if (usageDays <= 0) return price.toFixed(2); // 如果使用天数小于等于0，直接返回价格
      return (price / usageDays).toFixed(2); // 保留两位小数
    },

    getUsageDays(purchaseDate) {
      const purchase = new Date(purchaseDate);
      const now = new Date();
      const diffTime = now - purchase;
      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return days <= 0 ? 1 : days; // 确保除数不为0
    },

    getStatusClass(status) {
      return {
        '1': 'status-using',
        '2': 'status-damaged',
        '3': 'status-processed',
        '4': 'status-idle'
      }[status] || 'status-using';
    },

    getStatusText(status) {
      return {
        '1': '使用中',
        '2': '已损坏',
        '3': '已送人',
        '4': '吃灰中'
      }[status] || '使用中';
    },
    // 切换页签
    onTabChange(value, type) {
      console.log(value, type);
      if (type === 'tabKey') {
        this.tabKey = value;
      }
      this.query();
    },
    async getDeviceTypeOptions() {
      // 获取设备类型字典
      const res = await getByDictType('device_type');
      if (res && res.dictDetailList) {
        this.typeOptions = res.dictDetailList;
      }

      // 赋值给页签
      this.tabList = [
        {
          key: '',
          tab: '全部',
        },
        ...this.typeOptions.map(item => ({
          key: item.value,
          tab: item.label,
        })),
      ]

    },
    async getDeviceStatusOptions() {
      // 获取设备状态字典
      const res = await getByDictType('device_status');
      if (res && res.dictDetailList) {
        this.statusOptions = res.dictDetailList;
      }
    },
  },
  async mounted() {
    await this.query();
    await this.getDeviceStatusOptions();
    // 获取状态枚举值
    await this.getDeviceTypeOptions();
  }
}
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.electronics-container {
  padding: 10px;
  max-width: 1200px;
  margin: 0 auto;
}

.electronics-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  /* 动态控制每行显示个数 */
}

.electronics-card {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s ease;
  min-width: 0;
  /* 添加这个属性防止内容溢出 */
}

.electronics-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.card-image {
  position: relative;
  width: 100%;
  padding-top: 100%;
  /* 1:1 宽高比 */
  overflow: hidden;
}

.card-image img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background-color: #f5f5f5;
}

.card-content {
  position: relative;
  padding: 15px;
}

.delete-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
}

.card-content h3 {
  margin: 0 0 10px 0;
  font-size: 18px;
}

.price {
  font-weight: bold;
  margin: 5px 0;
}

.purchase-date {
  color: #666;
  font-size: 14px;
  margin: 5px 0;
}

.usage-days {
  color: #666;
  font-size: 14px;
  margin: 5px 0;
}

.default-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
}

.default-icon svg {
  width: 50%;
  height: 50%;
  opacity: 0.5;
}

/* 添加新的样式 */
.avg-cost {
  color: #666;
  font-size: 14px;
  margin: 5px 0;
  font-weight: bold;
}

.floating-btn {
  position: fixed;
  right: 30px;
  bottom: 30px;
  width: 56px;
  height: 56px;
  background-color: #1890ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: move;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  transition: all 0.3s;
  z-index: 1000;
  user-select: none;
  /* 添加以下属性确保拖动时位置更新 */
  left: auto;
  top: auto;
}

.floating-btn:hover {
  background-color: #40a9ff;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 添加十字图标样式 */
.floating-btn::before,
.floating-btn::after {
  content: '';
  position: absolute;
  background-color: white;
}

.floating-btn::before {
  width: 24px;
  height: 2px;
}

.floating-btn::after {
  width: 2px;
  height: 24px;
}

/* 修改状态标签样式到右下角 */
.status-badge {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  color: white;
  z-index: 1;
}

.status-using {
  background-color: #7fbd60;
  /* 绿色 */
}

.status-damaged {
  background-color: #f5222d;
  /* 红色 */
}

.status-processed {
  background-color: #b7eb8f;
  /* 浅绿色 */
}

.status-idle {
  background-color: #d9d9d9;
  /* 灰色 */
  color: #666;
}
</style>
