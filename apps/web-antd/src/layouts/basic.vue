<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import { createIconifyIcon } from '@vben/icons';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { formatDate } from '@vben/utils';

import {
  getMessagePageApi,
  getUnreadCountApi,
  markAllAsReadApi,
  markAsReadApi,
} from '#/api/core/message';
import { getUserBasicInfoApi } from '#/api/core/user';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';
import SecondaryLockModal from '#/views/_core/secondary-lock/secondary-lock-modal.vue';

const notifications = ref<NotificationItem[]>([]);

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const unreadCount = ref(0);
const NOTIFICATION_PAGE_SIZE = 20;
let pollTimer: null | ReturnType<typeof setInterval> = null;
let lastFetchedCount = -1;
const showDot = computed(() => unreadCount.value > 0);

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
  // {
  //   handler: () => {
  //     openWindow(VBEN_DOC_URL, {
  //       target: '_blank',
  //     });
  //   },
  //   icon: BookOpenText,
  //   text: $t('ui.widgets.document'),
  // },
  // {
  //   handler: () => {
  //     openWindow(VBEN_GITHUB_URL, {
  //       target: '_blank',
  //     });
  //   },
  //   icon: SvgGithubIcon,
  //   text: 'GitHub',
  // },
  // {
  //   handler: () => {
  //     openWindow(`${VBEN_GITHUB_URL}/issues`, {
  //       target: '_blank',
  //     });
  //   },
  //   icon: CircleHelp,
  //   text: $t('ui.widgets.qa'),
  // },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

const FeedbackIcon = createIconifyIcon('mdi:message-alert-outline');

function handleFeedback() {
  router.push({ name: 'Feedback' });
}

// Global cache for sender avatars to prevent repeated API calls
const avatarCache = new Map<string, string>();

async function fetchNotifications() {
  const myId = String(
    userStore.userInfo?.userId || userStore.userInfo?.id || '',
  );
  if (!myId) return;
  const { items: messages, total } = await getMessagePageApi({
    current: 1,
    isRead: false,
    size: NOTIFICATION_PAGE_SIZE,
  });

  const unreadMsgs = messages.filter(
    (m) => String(m.receiverId) === myId && !m.isRead,
  );

  const notificationsWithAvatar = await Promise.all(
    unreadMsgs.map(async (msg) => {
      let avatarUrl = msg.avatar || '';
      const senderId = String(msg.senderId);

      if (!avatarUrl && senderId) {
        if (avatarCache.has(senderId)) {
          avatarUrl = avatarCache.get(senderId) || '';
        } else {
          try {
            const userInfo = await getUserBasicInfoApi(senderId);
            avatarUrl = userInfo.avatar || '';
            avatarCache.set(senderId, avatarUrl);
          } catch {
            // Ignore error, keep empty avatar
            avatarCache.set(senderId, '');
          }
        }
      }

      return {
        id: msg.id,
        avatar: avatarUrl,
        date: formatDate(msg.createTime),
        isRead: false,
        message: msg.content,
        title: msg.title || `User ${msg.senderId}`,
        link: `/message?userId=${msg.senderId}`,
      };
    }),
  );

  notifications.value = notificationsWithAvatar;
  unreadCount.value = total;
  lastFetchedCount = total;
}

async function fetchUnreadCount() {
  try {
    const res = await getUnreadCountApi();
    const newCount = res.count;
    unreadCount.value = newCount;

    if (newCount > 0 && newCount !== lastFetchedCount) {
      await fetchNotifications();
    } else if (newCount === 0) {
      notifications.value = [];
      lastFetchedCount = 0;
    }
  } catch (error) {
    console.error('Failed to fetch unread count:', error);
  }
}

async function refreshNotifications() {
  try {
    await fetchNotifications();
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  }
}

// Fetch on mount
onMounted(() => {
  refreshNotifications();
  // Poll every 30 seconds
  pollTimer = setInterval(() => fetchUnreadCount(), 30_000);
});

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
});

async function handleNoticeClear() {
  try {
    await markAllAsReadApi();
    await refreshNotifications();
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }
}

async function markRead(id: number | string) {
  try {
    await markAsReadApi(String(id));
    await refreshNotifications();
  } catch (error) {
    console.error('Failed to mark as read:', error);
  }
}

function remove(id: number | string) {
  // Just remove from list locally for now, as there's no delete API that fits "remove from notification list" without deleting message
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

async function handleMakeAll() {
  try {
    await markAllAsReadApi();
    await refreshNotifications();
  } catch (error) {
    console.error('Failed to mark all as read:', error);
  }
}
watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
  }),
  async ({ enable, content }) => {
    if (enable) {
      await updateWatermark({
        content:
          content ||
          `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`,
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        :description="userStore.userInfo?.email"
        tag-text="Pro"
        @logout="handleLogout"
      >
        <template #after-lock-screen>
          <div
            class="mx-1 flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm leading-8 hover:bg-accent hover:text-accent-foreground"
            @click="handleFeedback"
          >
            <FeedbackIcon class="mr-2 size-4" />
            反馈
          </div>
        </template>
      </UserDropdown>
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @make-all="handleMakeAll"
        @read="(item) => item.id && markRead(item.id)"
        @refresh="refreshNotifications"
        @remove="(item) => item.id && remove(item.id)"
        @view-all="() => router.push('/message')"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
      <SecondaryLockModal />
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
