<script setup lang="ts">
import type { Props } from './types';

import { useIsMobile } from '@vben/hooks';

import { preferences } from '@vben-core/preferences';
import {
  Card,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
  VbenAvatar,
} from '@vben-core/shadcn-ui';

import { Page } from '../../components';

defineOptions({
  name: 'ProfileUI',
});

withDefaults(defineProps<Props>(), {
  title: '关于项目',
  tabs: () => [],
});

const tabsValue = defineModel<string>('modelValue');
const { isMobile } = useIsMobile();
</script>
<template>
  <Page auto-content-height>
    <div class="flex h-full w-full flex-col gap-4 lg:flex-row">
      <Card class="flex-none lg:w-1/4">
        <div
          class="flex flex-col items-center justify-center gap-4 py-6 lg:h-40 lg:py-0"
        >
          <VbenAvatar
            :src="userInfo?.avatar ?? preferences.app.defaultAvatar"
            class="size-20"
          />
          <div class="flex flex-col items-center gap-1">
            <span class="text-lg font-semibold">
              {{ userInfo?.realName ?? '' }}
            </span>
            <span class="text-foreground/80 text-sm">
              {{ userInfo?.introduction || userInfo?.username || '' }}
            </span>
          </div>
        </div>
        <Separator class="hidden lg:block" />
        <Tabs
          v-model="tabsValue"
          :orientation="isMobile ? 'horizontal' : 'vertical'"
          class="m-4"
        >
          <TabsList
            class="bg-card grid h-auto w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-1"
          >
            <TabsTrigger
              v-for="tab in tabs"
              :key="tab.value"
              :value="tab.value"
              class="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-12 justify-start px-4"
            >
              {{ tab.label }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>
      <Card class="flex-auto p-4 lg:w-3/4 lg:p-8">
        <slot name="content"></slot>
      </Card>
    </div>
  </Page>
</template>
