<script>
// 添加moment导入
import {
  DeleteOutlined,
  VerticalAlignTopOutlined,
} from '@ant-design/icons-vue';
import {
  Button,
  Card,
  Col,
  DatePicker,
  FloatButton,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getByDictType } from '#/api/core/common';
import { deleteData, insertOrUpdate, query } from '#/api/core/device';
import { getByDictType as getUserDictType } from '#/api/core/userDictType';
import GlobalFloatBtn from '#/components/global-float-btn/index.vue';

export default {
  components: {
    AButton: Button,
    AModal: Modal,
    AForm: Form,
    AFormItem: Form.Item,
    AInput: Input,
    AInputNumber: InputNumber,
    APopconfirm: Popconfirm,
    ADatePicker: DatePicker,
    ASelect: Select,
    ASelectOption: Select.Option,
    ACard: Card,
    ARow: Row,
    ACol: Col,
    AFloatButtonBackTop: FloatButton.BackTop,
    DeleteOutlined,
    VerticalAlignTopOutlined,
    GlobalFloatBtn,
  },
  data() {
    return {
      totalAmt: 0,
      totalCount: 0,
      totalDailyCost: 0,
      visible: false,
      typeOptions: [], // 设备类型选项
      statusOptions: [], // 设备状态选项
      newDevice: {
        name: '',
        spec: '',
        purchasePrice: 0,
        purchaseDate: '',
        image: '',
        status: '1',
        purchasePlace: '',
        endDate: '',
        remark: '',
      },
      electronics: [],
      tabList: [], // 页签列表
      tabKey: '', // 当前选中的页签
    };
  },
  async mounted() {
    // 获取状态枚举值 (优先请求 device_type)
    await this.getDeviceTypeOptions();
    await this.query();
    await this.getDeviceStatusOptions();
  },
  methods: {
    async query() {
      const res = await query({
        page: 1,
        pageSize: 50,
        condition: {
          type: this.tabKey,
        },
      });
      this.electronics = res.items;
      this.totalDailyCost = 0;
      this.electronics.forEach((item) => {
        item.usaDay = this.getUsageDays(item.purchaseDate, item.endDate);
        item.dailyCost = this.calculateAvgCost(
          item.purchasePrice,
          item.purchaseDate,
          item.endDate,
        );
        this.totalDailyCost += Number.parseFloat(item.dailyCost);
      });
      this.totalDailyCost = this.totalDailyCost.toFixed(2);

      this.totalAmt = res.items
        .reduce((sum, item) => sum + item.purchasePrice, 0)
        .toFixed(2);
      this.totalCount = res.items.length;
    },

    showModal() {
      this.newDevice = {
        name: '',
        spec: '',
        purchasePrice: null,
        purchaseDate: dayjs(),
        status: '1',
        image: '',
        purchasePlace: '',
        endDate: '',
        remark: '',
        type: this.tabKey,
      };
      this.visible = true;
    },
    showEditModal(item) {
      this.newDevice = {
        ...item,
        purchaseDate: dayjs(item.purchaseDate),
        endDate: item.endDate ? dayjs(item.endDate) : null,
      };
      this.visible = true;
    },
    async handleOk() {
      let formattedPurchaseDate = '';
      if (this.newDevice.purchaseDate) {
        formattedPurchaseDate =
          typeof this.newDevice.purchaseDate === 'string'
            ? this.newDevice.purchaseDate
            : this.newDevice.purchaseDate.format('YYYY-MM-DD');
      }

      let formattedEndDate = '';
      if (this.newDevice.endDate) {
        formattedEndDate =
          typeof this.newDevice.endDate === 'string'
            ? this.newDevice.endDate
            : this.newDevice.endDate.format('YYYY-MM-DD');
      }

      const deviceData = {
        ...this.newDevice,
        purchaseDate: formattedPurchaseDate,
        endDate: formattedEndDate,
      };

      await insertOrUpdate(deviceData);

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
        spec: '',
        purchasePrice: 0,
        purchaseDate: '',
        image: '',
        purchasePlace: '',
        endDate: '',
        remark: '',
      };
    },
    calculateAvgCost(price, purchaseDate, endDate) {
      const usageDays = this.getUsageDays(purchaseDate, endDate);
      if (usageDays <= 0) return price.toFixed(2);
      return (price / usageDays).toFixed(2);
    },

    getUsageDays(purchaseDate, endDate) {
      const purchase = new Date(purchaseDate);
      const end = endDate ? new Date(endDate) : new Date();
      const diffTime = end - purchase;
      const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return days <= 0 ? 1 : days;
    },

    getStatusClass(status) {
      return (
        {
          1: 'status-using',
          2: 'status-damaged',
          3: 'status-processed',
          4: 'status-idle',
        }[status] || 'status-using'
      );
    },

    getStatusText(status) {
      return (
        {
          1: '使用中',
          2: '已损坏',
          3: '已送人',
          4: '吃灰中',
        }[status] || '使用中'
      );
    },
    // 切换页签
    onTabChange(value, type) {
      if (type === 'tabKey') {
        this.tabKey = value;
      }
      this.query();
    },
    async getDeviceTypeOptions() {
      // 获取设备类型字典
      const res = await getUserDictType('device_type');
      if (res && res.dictDetailList) {
        this.typeOptions = res.dictDetailList.map((item) => ({
          ...item,
          label: item.dictLabel || item.label,
          value: String(item.id),
        }));
      }

      // 赋值给页签
      this.tabList = [
        {
          key: '',
          tab: '全部',
        },
        ...this.typeOptions.map((item) => ({
          key: item.value,
          tab: item.label,
        })),
      ];
    },
    async getDeviceStatusOptions() {
      // 获取设备状态字典
      const res = await getByDictType('device_status');
      if (res && res.dictDetailList) {
        this.statusOptions = res.dictDetailList;
      }
    },
    async handleDelete(item) {
      try {
        await deleteData(item.id);
        await this.query();
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      }
    },
    async handleDeleteFromModal() {
      if (this.newDevice.id) {
        await this.handleDelete(this.newDevice);
        this.visible = false;
      }
    },
  },
};
</script>

<template>
  <ACard
    style="width: 100%"
    :tab-list="tabList"
    :active-tab-key="tabKey"
    @tab-change="(key) => onTabChange(key, 'tabKey')"
  >
    <div class="electronics-container">
      <!-- 维护设备弹窗 -->
      <AModal
        v-model:open="visible"
        :title="newDevice.id ? '编辑设备' : '新增设备'"
        @ok="handleOk"
        @cancel="handleCancel"
      >
        <template #footer>
          <div
            style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              width: 100%;
            "
          >
            <div>
              <APopconfirm
                v-if="newDevice.id"
                title="确定要删除这个设备吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDeleteFromModal"
              >
                <AButton danger type="text">
                  <template #icon><DeleteOutlined /></template>
                  删除
                </AButton>
              </APopconfirm>
            </div>
            <div>
              <AButton @click="handleCancel">取消</AButton>
              <AButton type="primary" @click="handleOk">确定</AButton>
            </div>
          </div>
        </template>
        <AForm :model="newDevice" layout="vertical" class="device-form">
          <AFormItem label="设备名称">
            <AInput v-model:value="newDevice.name" />
          </AFormItem>
          <AFormItem label="配置">
            <AInput v-model:value="newDevice.spec" placeholder="" />
          </AFormItem>
          <ARow :gutter="16">
            <ACol :span="12">
              <AFormItem label="设备类型">
                <ASelect
                  v-model:value="newDevice.type"
                  style="width: 100%"
                  :options="typeOptions"
                />
              </AFormItem>
            </ACol>
            <ACol :span="12">
              <AFormItem label="设备状态">
                <ASelect
                  v-model:value="newDevice.status"
                  style="width: 100%"
                  :options="statusOptions"
                />
              </AFormItem>
            </ACol>
          </ARow>
          <ARow :gutter="16">
            <ACol :span="12">
              <AFormItem label="价格">
                <AInputNumber
                  v-model:value="newDevice.purchasePrice"
                  style="width: 100%"
                />
              </AFormItem>
            </ACol>
            <ACol :span="12">
              <AFormItem label="购买平台">
                <AInput v-model:value="newDevice.purchasePlace" />
              </AFormItem>
            </ACol>
          </ARow>
          <ARow :gutter="16">
            <ACol :span="12">
              <AFormItem label="购买日期">
                <ADatePicker
                  format="YYYY-MM-DD"
                  v-model:value="newDevice.purchaseDate"
                  style="width: 100%"
                />
              </AFormItem>
            </ACol>
            <ACol :span="12">
              <AFormItem label="退役日期">
                <ADatePicker
                  format="YYYY-MM-DD"
                  v-model:value="newDevice.endDate"
                  style="width: 100%"
                  placeholder="留空则计算至今日"
                />
              </AFormItem>
            </ACol>
          </ARow>
          <AFormItem label="图片链接">
            <AInput v-model:value="newDevice.image" />
          </AFormItem>
          <AFormItem label="备注">
            <AInput
              v-model:value="newDevice.remark"
              type="textarea"
              :rows="3"
              placeholder="其他备注信息"
            />
          </AFormItem>
        </AForm>
      </AModal>

      <div class="total-static">
        <ACard>
          <span>总资产: {{ totalAmt }} 元</span>
          <span>资产数量： {{ totalCount }} 个</span>
          <span>每日成本： {{ totalDailyCost }}</span>
        </ACard>
      </div>
      <!-- 设备列表 -->
      <div class="electronics-grid">
        <div
          v-for="(item, index) in electronics"
          :key="index"
          class="electronics-card"
          @click="showEditModal(item)"
        >
          <div class="card-image">
            <div class="status-badge" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </div>
            <img v-if="item.image" :src="item.image" :alt="item.name" />
            <div v-else class="default-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 16L8.586 11.414C8.961 11.039 9.47 10.828 10 10.828C10.53 10.828 11.039 11.039 11.414 11.414L16 16M14 14L15.586 12.414C15.961 12.039 16.47 11.828 17 11.828C17.53 11.828 18.039 12.039 18.414 12.414L20 14M14 8H14.01M6 20H18C19.105 20 20 19.105 20 18V6C20 4.895 19.105 4 18 4H6C4.895 4 4 4.895 4 6V18C4 19.105 4.895 20 6 20Z"
                  stroke="#888"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <APopconfirm
              title="确定要删除这个设备吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(item)"
            >
              <AButton class="delete-btn" type="text" danger @click.stop>
                <DeleteOutlined />
              </AButton>
            </APopconfirm>
          </div>
          <div class="card-content">
            <h3>{{ item.name }}</h3>
            <p v-if="item.spec" class="spec">{{ item.spec }}</p>
            <p class="price">价格: {{ item.purchasePrice }}</p>
            <p class="purchase-date">购买时间: {{ item.purchaseDate }}</p>
            <p class="usage-days">已使用: {{ item.usaDay }} 天</p>
            <p class="avg-cost">日均费用: {{ item.dailyCost }} 元/天</p>
          </div>
        </div>
      </div>
      <!-- 新增可拖动悬浮球 -> 全局 FloatButton 替换 -->
      <GlobalFloatBtn @click="showModal" />

      <AFloatButtonBackTop :visibility-height="400" class="global-backtop-btn">
        <template #icon>
          <VerticalAlignTopOutlined />
        </template>
      </AFloatButtonBackTop>
    </div>
  </ACard>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.electronics-container {
  padding: 10px;
  margin: 0 auto;
}

.electronics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;

  /* 动态控制每行显示个数 */
}

.electronics-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: transform 0.3s ease;

  /* 添加这个属性防止内容溢出 */
}

.electronics-card:hover {
  box-shadow: 0 10px 20px rgb(0 0 0 / 10%);
  transform: translateY(-5px);
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
  right: 10px;
  bottom: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background-color: rgb(255 255 255 / 90%);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
  opacity: 0;
  transition: all 0.3s ease;
}

.electronics-card:hover .delete-btn {
  opacity: 1;
  transform: scale(1.1);
}

.card-content h3 {
  margin: 0 0 5px;
  font-size: 18px;
}

.spec {
  margin: 0 0 5px;
  font-size: 12px;
  color: #888;
}

.price {
  margin: 5px 0;
  font-weight: bold;
}

.purchase-date {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.usage-days {
  margin: 5px 0;
  font-size: 14px;
  color: #666;
}

.default-icon {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
}

.default-icon svg {
  width: 50%;
  height: 50%;
  opacity: 0.5;
}

/* 添加新的样式 */
.avg-cost {
  margin: 5px 0;
  font-size: 14px;
  font-weight: bold;
  color: #666;
}

.status-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  padding: 2px 8px;
  font-size: 12px;
  color: white;
  border-radius: 10px;
}

.status-using {
  background-color: #7fbd60;
}

.status-damaged {
  background-color: #f5222d;
}

.status-processed {
  background-color: #b7eb8f;
}

.status-idle {
  color: #666;
  background-color: #d9d9d9;
}

.total-static {
  margin-bottom: 20px;
}

.total-static .ant-card span {
  display: block;
  font-size: 16px;
  line-height: 2;
}

.total-static .ant-card span:first-child {
  font-size: 18px;
  font-weight: bold;
}

.device-form :deep(.ant-form-item) {
  margin-bottom: 12px;
}

@media screen and (max-width: 768px) {
  /* 覆盖 Ant Design Card 样式 */
  :deep(.ant-card-body) {
    padding: 12px !important;
  }

  :deep(.ant-card-head) {
    min-height: 46px;
    padding: 0 12px !important;
  }

  :deep(.ant-tabs-tab) {
    padding: 8px 0 !important;
    margin: 0 12px 0 0 !important;
  }

  .electronics-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .electronics-container {
    padding: 0;
  }

  .total-static {
    margin-bottom: 12px;
  }

  .card-content {
    padding: 8px;
  }

  .card-content h3 {
    margin-bottom: 5px;
    font-size: 14px;
  }

  .price,
  .purchase-date,
  .usage-days,
  .avg-cost {
    margin: 2px 0;
    font-size: 12px;
  }

  /* 隐藏部分不重要的信息以节省空间，或者调整显示 */
  .purchase-date {
    display: none;
  }

  .status-badge {
    top: 5px;
    right: 5px;
    padding: 1px 6px;
    font-size: 10px;
  }

  .delete-btn {
    display: none;
  }
}
</style>
