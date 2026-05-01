<script setup lang="ts">
import type { PasswordGeneratorOptions } from '#/utils/crypto';

import { ref } from 'vue';

import { CopyOutlined, LockOutlined } from '@ant-design/icons-vue';
import {
  Button,
  Form,
  FormItem,
  Input,
  message,
  Modal,
  Select,
  SelectOption,
  Spin,
  Switch,
} from 'ant-design-vue';

import {
  createPasswordApi,
  getCategoriesApi,
  getPasswordApi,
  updatePasswordApi,
} from '#/api/core/password-manager';
import { usePasswordVaultStore } from '#/store/password-vault';
import {
  decryptText,
  encryptText,
  generatePassword,
  generateSalt,
} from '#/utils/crypto';

const emit = defineEmits(['success']);
const store = usePasswordVaultStore();

const visible = ref(false);
const loading = ref(false);
const categories = ref<string[]>([]);
const showGenerator = ref(false);
const generatorLoading = ref(false);

// Form state
const formState = ref({
  title: '',
  website: '',
  category: '其他',
  username: '',
  password: '',
  salt: '',
  remark: '',
  favorite: false,
});

// Generator options
const generatorOptions = ref<PasswordGeneratorOptions>({
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: false,
  excludeAmbiguous: false,
});

const generatedPassword = ref('');

const isEdit = ref(false);
const editId = ref<null | string>(null);

const fetchCategories = async () => {
  try {
    categories.value = await getCategoriesApi();
  } catch {
    categories.value = ['工作', '生活', '金融', '社交', '其他'];
  }
};

const fetchPasswordForEdit = async (id: string) => {
  loading.value = true;
  try {
    const data = await getPasswordApi(id);
    if (data.password && store.masterKey) {
      try {
        formState.value.password = await decryptText(
          data.password,
          store.masterKey,
          data.salt,
        );
      } catch {
        message.error('密码解密失败，请检查主密码是否正确');
      }
      try {
        if (data.remark) {
          formState.value.remark = await decryptText(
            data.remark,
            store.masterKey,
            data.salt,
          );
        }
      } catch {
        // 备注解密失败可以忽略
      }
      try {
        if (data.username && /^[0-9a-f]{32,}$/i.test(data.username)) {
          formState.value.username = await decryptText(
            data.username,
            store.masterKey,
            data.salt,
          );
        } else {
          formState.value.username = data.username || '';
        }
      } catch {
        formState.value.username = data.username || '';
      }
    } else {
      formState.value.username = data.username || '';
    }

    formState.value.title = data.title;
    formState.value.website = data.website || '';
    formState.value.category = data.category || '其他';
    formState.value.salt = data.salt;
    formState.value.favorite = data.favorite || false;
  } catch {
    message.error('获取密码详情失败');
    visible.value = false;
  } finally {
    loading.value = false;
  }
};

const handleGeneratePassword = async () => {
  generatorLoading.value = true;
  try {
    generatedPassword.value = generatePassword(generatorOptions.value);
    formState.value.password = generatedPassword.value;
  } finally {
    generatorLoading.value = false;
  }
};

const handleCopyGenerated = async () => {
  if (generatedPassword.value) {
    try {
      await navigator.clipboard.writeText(generatedPassword.value);
      message.success('密码已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
  }
};

const handleSubmit = async () => {
  if (!formState.value.title) {
    message.warning('请输入标题');
    return;
  }
  if (!formState.value.password) {
    message.warning('请输入密码');
    return;
  }
  if (!store.masterKey) {
    message.warning('请先解锁主密码');
    return;
  }

  loading.value = true;
  try {
    // 如果没有盐值，前端自己生成
    if (!formState.value.salt) {
      formState.value.salt = generateSalt();
    }

    // Encrypt sensitive fields
    const encryptedPassword = await encryptText(
      formState.value.password,
      store.masterKey,
      formState.value.salt,
    );
    const encryptedRemark = await encryptText(
      formState.value.remark || '',
      store.masterKey,
      formState.value.salt,
    );

    const data = {
      title: formState.value.title,
      website: formState.value.website,
      category: formState.value.category,
      username: formState.value.username, // 不再加密账号，直接明文保存以便展示
      password: encryptedPassword,
      salt: formState.value.salt,
      remark: encryptedRemark,
      favorite: formState.value.favorite,
    };

    if (isEdit.value && editId.value) {
      await updatePasswordApi(editId.value, data);
      message.success('更新成功');
    } else {
      await createPasswordApi(data);
      message.success('添加成功');
    }

    visible.value = false;
    emit('success');
  } catch {
    message.error(isEdit.value ? '更新失败' : '添加失败');
  } finally {
    loading.value = false;
  }
};

const openModal = async (id?: string) => {
  visible.value = true;
  isEdit.value = !!id;
  editId.value = id || null;
  formState.value = {
    title: '',
    website: '',
    category: '其他',
    username: '',
    password: '',
    salt: '',
    remark: '',
    favorite: false,
  };

  await fetchCategories();

  if (id) {
    await fetchPasswordForEdit(id);
  }
};

defineExpose({ openModal });
</script>

<template>
  <Modal
    v-model:open="visible"
    :title="isEdit ? '编辑密码' : '添加密码'"
    :confirm-loading="loading"
    width="600px"
    destroy-on-close
    @ok="handleSubmit"
  >
    <Spin :spinning="loading">
      <Form layout="vertical" class="mt-4">
        <FormItem label="标题" required>
          <Input v-model:value="formState.title" placeholder="如：GitHub" />
        </FormItem>

        <FormItem label="网站/应用">
          <Input
            v-model:value="formState.website"
            placeholder="如：https://github.com"
          />
        </FormItem>

        <FormItem label="分类">
          <Select v-model:value="formState.category">
            <SelectOption v-for="cat in categories" :key="cat" :value="cat">
              {{ cat }}
            </SelectOption>
          </Select>
        </FormItem>

        <FormItem label="账号">
          <Input
            v-model:value="formState.username"
            placeholder="请输入账号"
            autocomplete="off"
          />
        </FormItem>

        <FormItem label="密码" required>
          <div class="flex gap-2">
            <Input.Password
              v-model:value="formState.password"
              placeholder="请输入密码"
              class="flex-1"
              autocomplete="new-password"
            />
            <Button @click="showGenerator = true">
              <LockOutlined /> 生成
            </Button>
          </div>
        </FormItem>

        <FormItem label="备注">
          <Input.TextArea
            v-model:value="formState.remark"
            placeholder="可选备注信息"
            :rows="3"
          />
        </FormItem>

        <FormItem label="收藏">
          <Switch v-model:checked="formState.favorite" />
        </FormItem>
      </Form>
    </Spin>
  </Modal>

  <!-- Password Generator Modal -->
  <Modal
    v-model:open="showGenerator"
    title="密码生成器"
    :footer="null"
    width="400px"
  >
    <div class="space-y-4">
      <FormItem label="密码长度">
        <Input
          v-model:value="generatorOptions.length"
          type="number"
          :min="8"
          :max="32"
        />
      </FormItem>

      <FormItem label="字符类型">
        <div class="space-y-2">
          <div>
            <Switch v-model:checked="generatorOptions.uppercase" />
            <span class="ml-2">大写字母 (A-Z)</span>
          </div>
          <div>
            <Switch v-model:checked="generatorOptions.lowercase" />
            <span class="ml-2">小写字母 (a-z)</span>
          </div>
          <div>
            <Switch v-model:checked="generatorOptions.numbers" />
            <span class="ml-2">数字 (0-9)</span>
          </div>
          <div>
            <Switch v-model:checked="generatorOptions.symbols" />
            <span class="ml-2">特殊字符 (!@#$%^&*)</span>
          </div>
          <div>
            <Switch v-model:checked="generatorOptions.excludeAmbiguous" />
            <span class="ml-2">排除易混淆字符 (0/O, 1/l/I)</span>
          </div>
        </div>
      </FormItem>

      <div class="flex gap-2">
        <Button
          type="primary"
          :loading="generatorLoading"
          @click="handleGeneratePassword"
        >
          生成
        </Button>
        <Button :disabled="!generatedPassword" @click="handleCopyGenerated">
          <CopyOutlined /> 复制
        </Button>
      </div>

      <div
        v-if="generatedPassword"
        class="rounded bg-slate-100 p-3 dark:bg-slate-700"
      >
        <p class="text-sm text-slate-500">生成的密码：</p>
        <p class="break-all font-mono text-lg">{{ generatedPassword }}</p>
      </div>
    </div>
  </Modal>
</template>

<style scoped></style>
