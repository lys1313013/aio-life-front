<script lang="ts" setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';

import {
  AuthenticationColorToggle,
  AuthenticationLayoutToggle,
  AuthPageLayout,
  LanguageToggle,
  ThemeToggle,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';

import { $t } from '#/locales';

const router = useRouter();

const appName = computed(() => preferences.app.name);
const logo = computed(() => preferences.logo.source);
const logoDark = computed(() => preferences.logo.sourceDark);
</script>

<template>
  <AuthPageLayout
    :app-name="appName"
    :logo="logo"
    :logo-dark="logoDark"
    :page-description="$t('authentication.pageDesc')"
    :page-title="$t('authentication.pageTitle')"
  >
    <!-- 自定义工具栏：默认切换按钮 + 产品介绍入口 -->
    <template #toolbar>
      <div
        class="flex-center absolute right-2 top-4 z-10 rounded-3xl bg-accent px-3 py-1"
      >
        <div class="hidden md:flex">
          <AuthenticationColorToggle />
          <AuthenticationLayoutToggle />
        </div>
        <LanguageToggle v-if="preferences.widget.languageToggle" />
        <ThemeToggle v-if="preferences.widget.themeToggle" />
        <button
          class="ml-1 rounded-full border border-border px-3 py-0.5 text-sm text-foreground transition-colors hover:border-primary hover:text-primary"
          @click="router.push('/intro')"
        >
          产品介绍
        </button>
      </div>
    </template>
  </AuthPageLayout>
</template>
