<script setup lang="ts">
import type { BusinessCardItem, BusinessCardPage } from './business-card-data';

import type { GoalEntity } from '#/api/core/goal';
import type { MembershipVO } from '#/api/membership';
import type { AnniversaryRecord } from '#/api/my-hub/anniversary';

import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import {
  getGoalList,
  setGoalPinned,
  updateGoalPinnedOrder,
} from '#/api/core/goal';
import { queryMemberships } from '#/api/membership';
import { MovieApi } from '#/api/movie';
import {
  getAnniversaryRecords,
  setAnniversaryPinned,
  updateAnniversaryPinnedOrder,
} from '#/api/my-hub/anniversary';
import { ReadRecordApi } from '#/api/readRecord';
import { AppModal } from '#/components/app-modal';
import { useSecondaryLockStore } from '#/store/secondary-lock';
import { CATEGORIES } from '#/views/membership/constants';

import {
  BUSINESS_CARD_PAGE_SIZE,
  dateDistance,
  findMenuChain,
  hasMoreRecords,
  requirePinnedRows,
  sortMemberships,
} from './business-card-data';
import BusinessListCard from './BusinessListCard.vue';

const props = defineProps<{ only?: string }>();
const GoalEditor = defineAsyncComponent(
  () => import('#/views/task-center/goal/GoalEditor.vue'),
);
const AnniversaryEditor = defineAsyncComponent(
  () => import('#/views/my-hub/anniversary/AnniversaryEditor.vue'),
);
const MembershipEditor = defineAsyncComponent(
  () => import('#/views/membership/form-modal.vue'),
);
const ReadingEditor = defineAsyncComponent(
  () => import('#/views/my-hub/read-record/form-drawer.vue'),
);
const MovieEditor = defineAsyncComponent(
  () => import('#/views/my-hub/movie/form-drawer.vue'),
);
const router = useRouter();
const access = useAccessStore();
const user = useUserStore();
const identity = computed(
  () => user.userInfo?.userId || user.userInfo?.id || '',
);
const locks = useSecondaryLockStore();
const deniedPaths = ref(new Set<string>());
const cardRefs = ref<
  Record<string, InstanceType<typeof BusinessListCard> | null>
>({});
const goalEditor = ref<InstanceType<typeof GoalEditor>>();
const anniversaryEditor = ref<InstanceType<typeof AnniversaryEditor>>();
const editingKind = ref('');
const editingRecord = ref<unknown>();
const editorOpen = ref(false);
const pendingPinnedEdit = ref(false);

function goalProgress(goal: GoalEntity) {
  if (goal.targetValue != null && goal.targetValue > 0) {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(((goal.currentValue ?? 0) / goal.targetValue) * 100),
      ),
    );
  }
  return goal.status === 'completed' ? 100 : 0;
}

const goalStatus: Record<string, string> = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  on_hold: '已搁置',
};
const configurations = [
  {
    key: 'goal',
    title: '目标',
    icon: 'mdi:target',
    paths: ['/task/goal', '/task-center/goal'],
    unpin: (id: string) => setGoalPinned(id, 0),
    reorder: updateGoalPinnedOrder,
    async fetchPage(): Promise<BusinessCardPage> {
      const rows = requirePinnedRows(await getGoalList({ isPinned: 1 }));
      return {
        hasMore: false,
        items: rows.map((row) => ({
          id: row.id!,
          title: row.title,
          subtitle: goalStatus[row.status] || row.status,
          progressPercent: goalProgress(row),
          dueDate: row.endDate?.slice(0, 10),
          record: row,
        })),
      };
    },
  },
  {
    key: 'anniversary',
    title: '纪念日',
    icon: 'mdi:calendar-heart',
    paths: ['/record/anniversary', '/my-hub/anniversary'],
    unpin: (id: string) => setAnniversaryPinned(id, 0),
    reorder: updateAnniversaryPinnedOrder,
    async fetchPage(): Promise<BusinessCardPage> {
      const rows = requirePinnedRows(
        await getAnniversaryRecords({ isPinned: 1 }),
      );
      return {
        hasMore: false,
        items: rows.map((row) => ({
          id: row.id!,
          title: row.title,
          subtitle: `${row.targetDate} · ${dateDistance(row.targetDate)}`,
          emoji: row.icon || '🎉',
          record: row,
        })),
      };
    },
  },
  {
    key: 'reading',
    title: '阅读',
    icon: 'mdi:book-open-page-variant',
    paths: ['/record/read', '/my-hub/read-record'],
    async fetchPage(page: number): Promise<BusinessCardPage> {
      // Fetch both statuses from page one so a long in-progress list cannot hide wanted books.
      const results = await Promise.all(
        (['in_progress', 'not_started'] as const).map((status) =>
          ReadRecordApi.pageList({
            status,
            current: page,
            size: BUSINESS_CARD_PAGE_SIZE,
          }),
        ),
      );
      return {
        hasMore: results.some((result) =>
          hasMoreRecords(
            result.total,
            page,
            BUSINESS_CARD_PAGE_SIZE,
            result.items.length,
          ),
        ),
        items: results
          .flatMap((result) => result.items)
          .map((row) => ({
            id: row.id,
            title: row.title,
            subtitle: row.status === 'in_progress' ? '在读' : '想读',
            inProgress: row.status === 'in_progress',
            fileId: row.fileId,
            coverUrl: row.coverImgUrl,
            media: true,
            record: row,
          })),
      };
    },
  },
  {
    key: 'membership',
    title: '会员',
    icon: 'mdi:card-account-details-outline',
    paths: ['/membership'],
    async fetchPage(): Promise<BusinessCardPage> {
      return {
        hasMore: false,
        items: sortMemberships(await queryMemberships()).map((row) => ({
          id: row.id,
          title: row.name,
          subtitle: `${row.expiryDate.slice(0, 10)} 到期`,
          badge: dateDistance(row.expiryDate, true),
          badgeUrgent: row.status === 'expiring',
          membership: true,
          icon:
            row.icon ||
            CATEGORIES.find((category) => category.value === row.category)
              ?.icon,
          autoRenew: row.autoRenew === 1,
          record: row,
        })),
      };
    },
  },
  {
    key: 'movie',
    title: '观影',
    icon: 'mdi:movie-open-play-outline',
    paths: ['/record/movie', '/my-hub/movie'],
    async fetchPage(page: number): Promise<BusinessCardPage> {
      const result = await MovieApi.pageList({
        activeOnly: true,
        inProgressFirst: true,
        current: page,
        size: BUSINESS_CARD_PAGE_SIZE,
      });
      return {
        hasMore: hasMoreRecords(
          result.total,
          page,
          BUSINESS_CARD_PAGE_SIZE,
          result.items.length,
        ),
        items: result.items.map((row) => ({
          id: row.id,
          title: row.title,
          subtitle: row.status === 'in_progress' ? '在看' : '想看',
          inProgress: row.status === 'in_progress',
          fileId: row.fileId,
          coverUrl: row.coverImgUrl,
          media: true,
          record: row,
        })),
      };
    },
  },
];

const cards = computed(() =>
  configurations
    .filter((config) => !props.only || config.key === props.only)
    .flatMap((config) => {
      const chain = findMenuChain(access.accessMenus, config.paths);
      const menu = chain.at(-1);
      if (!menu || access.loginExpired) return [];
      const lockedMenu = chain.find(
        (ancestor) =>
          ((ancestor.menuId != null &&
            locks.isMenuLocked(String(ancestor.menuId))) ||
            deniedPaths.value.has(ancestor.path)) &&
          !locks.isUnlocked(ancestor.path),
      );
      const pending =
        locks.showModal &&
        chain.find((ancestor) => ancestor.path === locks.pendingTargetPath);
      const locked = !locks.loaded || !!lockedMenu || !!pending;
      const unlockPath =
        lockedMenu?.path || (pending && pending.path) || menu.path;
      return [
        {
          ...config,
          icon: menu.icon || config.icon,
          iconColor: menu.iconColor,
          path: menu.path,
          locked,
          unlockPath,
        },
      ];
    }),
);
void locks.loadLockedMenus();
function accessDenied(path: string) {
  const denied = locks.pendingTargetPath || path;
  locks.unlockedPaths.delete(denied);
  deniedPaths.value.add(denied);
}

function refresh(key: string) {
  void cardRefs.value[key]?.reload();
}
function closeEditor() {
  editorOpen.value = false;
  editingKind.value = '';
  pendingPinnedEdit.value = false;
}
function edit(key: string, item?: BusinessCardItem) {
  editingKind.value = key;
  editingRecord.value = item?.record;
  if (key === 'goal' || key === 'anniversary') {
    pendingPinnedEdit.value = true;
    openPinnedEditor();
  } else editorOpen.value = true;
}
function openPinnedEditor() {
  if (!pendingPinnedEdit.value) return;
  const editor =
    editingKind.value === 'goal' ? goalEditor.value : anniversaryEditor.value;
  if (!editor) return;
  pendingPinnedEdit.value = false;
  if (editingKind.value === 'goal')
    goalEditor.value?.open(editingRecord.value as GoalEntity | undefined, true);
  else
    anniversaryEditor.value?.open(
      editingRecord.value as AnniversaryRecord | undefined,
      true,
    );
}
watch([goalEditor, anniversaryEditor], openPinnedEditor);
watch(
  () => cards.value.find((card) => card.key === editingKind.value)?.locked,
  (locked) => {
    if (locked !== false) closeEditor();
  },
);
watch(identity, () => {
  closeEditor();
  deniedPaths.value.clear();
});
const membershipRecord = computed(
  () => editingRecord.value as MembershipVO | undefined,
);
</script>

<template>
  <template v-for="card in cards" :key="`${identity}:${card.key}`">
    <BusinessListCard
      :ref="
        (el) => {
          cardRefs[card.key] = el as InstanceType<
            typeof BusinessListCard
          > | null;
        }
      "
      :title="card.title"
      :skeleton-row-height="
        card.key === 'goal' ? 72 : card.key === 'anniversary' ? 56 : 64
      "
      :icon="card.icon"
      :media="card.key === 'reading' || card.key === 'movie'"
      :reading-shelves="card.key === 'reading'"
      :icon-color="card.iconColor"
      :locked="card.locked"
      :fetch-page="card.fetchPage"
      :unpin="card.unpin"
      :reorder="card.reorder"
      :drag-order="card.key === 'goal' || card.key === 'anniversary'"
      @navigate="router.push(card.path)"
      @unlock="locks.triggerUnlock(card.unlockPath, false)"
      @access-denied="accessDenied(card.path)"
      @add="edit(card.key)"
      @edit="edit(card.key, $event)"
    />
  </template>
  <GoalEditor
    v-if="editingKind === 'goal'"
    ref="goalEditor"
    @saved="refresh('goal')"
    @deleted="refresh('goal')"
  />
  <AnniversaryEditor
    v-if="editingKind === 'anniversary'"
    ref="anniversaryEditor"
    @saved="refresh('anniversary')"
    @deleted="refresh('anniversary')"
  />
  <MembershipEditor
    v-if="editingKind === 'membership'"
    v-model:open="editorOpen"
    :values="membershipRecord"
    @saved="refresh('membership')"
    @deleted="refresh('membership')"
  />
  <AppModal
    v-if="editingKind === 'reading' || editingKind === 'movie'"
    v-model:open="editorOpen"
    :width="560"
    :footer="null"
    :closable="false"
    destroy-on-close
    centered
  >
    <ReadingEditor
      v-if="editingKind === 'reading'"
      :values="editingRecord"
      @close="closeEditor"
      @table-reload="refresh('reading')"
    />
    <MovieEditor
      v-else
      :values="editingRecord"
      @close="closeEditor"
      @table-reload="refresh('movie')"
    />
  </AppModal>
</template>
