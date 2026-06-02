<script setup lang="ts">
import type {
  CategoryVO,
  WardrobeItemReq,
  WardrobeItemVO,
} from '#/api/wardrobe';

import { computed, ref, watch } from 'vue';

import { UploadOutlined } from '@ant-design/icons-vue';
import {
  Button,
  DatePicker,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Select,
  SelectOption,
  Space,
  Upload,
} from 'ant-design-vue';
import dayjs from 'dayjs';

const props = defineProps<{
  categories: CategoryVO[];
  item?: null | WardrobeItemVO;
  visible: boolean;
}>();

const emit = defineEmits<{
  save: [data: WardrobeItemReq];
  'update:visible': [value: boolean];
}>();

const formRef = ref();
const loading = ref(false);

const formData = ref<WardrobeItemReq>({
  name: '',
  categoryId: undefined,
  color: '',
  brand: '',
  season: [],
  purchaseDate: undefined,
  price: undefined,
  photoUrls: [],
  size: '',
  memo: '',
});

const flatCategories = computed(() => {
  const result: { id: number; name: string; parentId?: number }[] = [];
  const flatten = (cats: CategoryVO[], prefix = '') => {
    for (const cat of cats) {
      result.push({
        id: cat.id!,
        name: prefix + cat.name,
        parentId: cat.parentId,
      });
      if (cat.children?.length) {
        flatten(cat.children, `${prefix}  `);
      }
    }
  };
  flatten(props.categories);
  return result;
});

const isEdit = computed(() => !!props.item?.id);

const title = computed(() => (isEdit.value ? '编辑衣物' : '添加衣物'));

const purchaseDateModel = computed({
  get: () =>
    formData.value.purchaseDate
      ? dayjs(formData.value.purchaseDate)
      : undefined,
  set: (val) => {
    formData.value.purchaseDate = val ? val.format('YYYY-MM-DD') : undefined;
  },
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      if (props.item) {
        formData.value = {
          id: props.item.id,
          name: props.item.name,
          categoryId: props.item.categoryId,
          color: props.item.color,
          brand: props.item.brand,
          season: props.item.season?.split(',').filter(Boolean) || [],
          purchaseDate: props.item.purchaseDate,
          price: props.item.price,
          photoUrls: props.item.photoUrls || [],
          size: props.item.size,
          memo: props.item.memo,
        };
      } else {
        formData.value = {
          name: '',
          categoryId: undefined,
          color: '',
          brand: '',
          season: [],
          purchaseDate: undefined,
          price: undefined,
          photoUrls: [],
          size: '',
          memo: '',
        };
      }
    }
  },
);

const handleClose = () => {
  emit('update:visible', false);
};

const handleSubmit = async () => {
  try {
    await formRef.value.validate();
    loading.value = true;
    emit('save', { ...formData.value });
  } catch {
    // 验证失败
  } finally {
    loading.value = false;
  }
};

const handleUploadChange = (info: { fileList: any[] }) => {
  // TODO: 实现实际上传逻辑
  const urls = info.fileList
    .filter((f) => f.status === 'done')
    .map((f) => f.response?.url || f.url);
  formData.value.photoUrls = urls;
};

const seasons = ['春', '夏', '秋', '冬'];
</script>

<template>
  <Modal
    :open="visible"
    :title="title"
    :width="560"
    @cancel="handleClose"
    @ok="handleSubmit"
  >
    <Form ref="formRef" :model="formData" layout="vertical">
      <FormItem
        label="名称"
        name="name"
        required
        :rules="[{ required: true, message: '请输入衣物名称' }]"
      >
        <Input v-model:value="formData.name" placeholder="请输入衣物名称" />
      </FormItem>

      <FormItem label="分类" name="categoryId">
        <Select v-model:value="formData.categoryId" placeholder="请选择分类">
          <SelectOption
            v-for="cat in flatCategories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.name }}
          </SelectOption>
        </Select>
      </FormItem>

      <Space>
        <FormItem label="颜色" name="color">
          <Input v-model:value="formData.color" placeholder="如: 黑色" />
        </FormItem>
        <FormItem label="品牌" name="brand">
          <Input v-model:value="formData.brand" placeholder="如: Nike" />
        </FormItem>
      </Space>

      <Space>
        <FormItem label="尺码" name="size">
          <Input v-model:value="formData.size" placeholder="如: M, 42" />
        </FormItem>
        <FormItem label="价格" name="price">
          <InputNumber
            v-model:value="formData.price"
            :min="0"
            :precision="2"
            placeholder="0.00"
            style="width: 100%"
          />
        </FormItem>
      </Space>

      <FormItem label="适用季节" name="season">
        <Select
          v-model:value="formData.season"
          mode="multiple"
          placeholder="请选择季节"
        >
          <SelectOption v-for="s in seasons" :key="s" :value="s">
            {{ s }}
          </SelectOption>
        </Select>
      </FormItem>

      <FormItem label="购买日期" name="purchaseDate">
        <DatePicker
          v-model:value="purchaseDateModel"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </FormItem>

      <FormItem label="照片" name="photoUrls">
        <Upload
          :file-list="
            formData.photoUrls?.map((url, i) => ({
              uid: i,
              url,
              status: 'done',
            })) || []
          "
          list-type="picture-card"
          :max-count="5"
          @change="handleUploadChange"
        >
          <div>
            <UploadOutlined />
            <div>上传</div>
          </div>
        </Upload>
      </FormItem>

      <FormItem label="备注" name="memo">
        <Input.TextArea
          v-model:value="formData.memo"
          :rows="3"
          placeholder="备注信息"
        />
      </FormItem>
    </Form>

    <template #footer>
      <Button @click="handleClose">取消</Button>
      <Button type="primary" :loading="loading" @click="handleSubmit">
        {{ isEdit ? '更新' : '添加' }}
      </Button>
    </template>
  </Modal>
</template>
