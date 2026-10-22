import type {
  FinancePeriod,
  HomeSectionKind,
  HomeSections,
} from '#/api/core/home-sections';

import {
  computed,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  shallowRef,
  watch,
} from 'vue';

import { useAccessStore, useUserStore } from '@vben/stores';

import { getHomeSection, isFinancialSection } from '#/api/core/home-sections';
import { useMenuVisualsStore } from '#/store/menu-visuals';
import { useSecondaryLockStore } from '#/store/secondary-lock';
import { HOME_SECTION_CHANGED } from '#/utils/home-section-change';

import { findMenuChain } from '../components/business-card-data';
import { useHomeRequest } from './useHomeRequest';

const sessionPeriods = new Map<string, FinancePeriod>();

/** 摘要卡共享权限、锁、请求竞态、返回时效及前台周期刷新。 */
export function useHomeSection<K extends HomeSectionKind>(kind: K) {
  const access = useAccessStore();
  const user = useUserStore();
  const visuals = useMenuVisualsStore();
  const locks = useSecondaryLockStore();
  const data = shallowRef<HomeSections[K] | null>(null);
  const deniedPath = ref('');
  const forbidden = ref(false);
  const active = ref(true);
  const identity = computed(
    () => user.userInfo?.userId || user.userInfo?.id || '',
  );
  const periodKey = () => `${identity.value}:${kind}`;
  const period = ref<FinancePeriod>(sessionPeriods.get(periodKey()) ?? 'month');
  const displayedPeriod = computed(() =>
    data.value && 'period' in data.value ? data.value.period : period.value,
  );
  const chain = computed(() =>
    findMenuChain(
      access.accessMenus,
      [],
      [],
      visuals.cardMenu(`section.${kind}`)?.menuId ?? undefined,
    ),
  );
  const path = computed(() => chain.value.at(-1)?.path);
  const relatedChains = computed(() =>
    kind === 'finance'
      ? [
          chain.value,
          ...['income', 'expense'].map((value) =>
            findMenuChain(access.accessMenus, [
              `/finance/${value}`,
              `/finance-management/${value}`,
            ]),
          ),
        ]
      : [chain.value],
  );
  const lockedMenu = computed(() =>
    relatedChains.value
      .flat()
      .find(
        (menu) =>
          (locks.isMenuLocked(String(menu.menuId)) &&
            !locks.isUnlocked(menu.path)) ||
          (locks.showModal && locks.pendingTargetPath === menu.path),
      ),
  );
  const locked = computed(
    () => !locks.loaded || !!deniedPath.value || !!lockedMenu.value,
  );
  const available = computed(
    () =>
      !!path.value &&
      relatedChains.value.every((menus) => menus.length > 0) &&
      !access.loginExpired &&
      !forbidden.value,
  );
  let lastSuccess = 0;
  const interval = () => {
    const seconds = data.value?.refreshInterval;
    return typeof seconds === 'number' &&
      Number.isFinite(seconds) &&
      seconds > 0
      ? seconds * 1000
      : 0;
  };
  const businessDate = (date: Date) =>
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  const stale = () => {
    if (!lastSuccess) return true;
    if (isFinancialSection(kind) && data.value && 'period' in data.value) {
      const currentDate = businessDate(new Date());
      if (data.value.period !== period.value) return true;
      if (
        data.value.period === 'month' &&
        data.value.startDate?.slice(0, 7) !== currentDate.slice(0, 7)
      )
        return true;
      if (
        data.value.period === 'year' &&
        data.value.startDate?.slice(0, 4) !== currentDate.slice(0, 4)
      )
        return true;
    }
    if (
      kind === 'device' &&
      businessDate(new Date()) !== businessDate(new Date(lastSuccess))
    )
      return true;
    return interval() > 0 && Date.now() - lastSuccess >= interval();
  };
  const request = useHomeRequest({
    enabled: () => active.value && available.value && !locked.value,
    fetch: () =>
      getHomeSection(kind, isFinancialSection(kind) ? period.value : undefined),
    reloadOnActivate: () => false,
    apply: (result) => {
      if ('period' in result) {
        if (result.period !== period.value)
          throw new Error('摘要范围与请求不一致');
        sessionPeriods.set(periodKey(), result.period);
      }
      data.value = result;
      lastSuccess = Date.now();
    },
    onError: (error) => {
      const failure = error as {
        response?: {
          data?: { code?: number; data?: { menuPath?: string } };
          status?: number;
        };
      };
      if (failure.response?.data?.code === 2001) {
        deniedPath.value =
          failure.response.data.data?.menuPath || path.value || '';
        data.value = null;
      } else if (failure.response?.status === 403) {
        forbidden.value = true;
        data.value = null;
      }
    },
  });
  let timer: ReturnType<typeof setInterval> | undefined;
  function clearTimer() {
    if (timer) clearInterval(timer);
    timer = undefined;
  }
  function resume() {
    clearTimer();
    if (
      !active.value ||
      document.visibilityState === 'hidden' ||
      !available.value ||
      locked.value
    )
      return;
    if (stale() || request.failed.value) void request.load();
    if (interval() <= 0) return;
    timer = setInterval(
      () => {
        if (stale()) void request.load();
      },
      Math.min(interval(), 30_000),
    );
  }
  watch(() => data.value?.refreshInterval, resume);
  watch(
    identity,
    () => {
      forbidden.value = false;
      deniedPath.value = '';
      period.value = sessionPeriods.get(periodKey()) ?? 'month';
    },
    { flush: 'sync' },
  );
  watch(
    () => locks.unlockedPaths.size,
    () => {
      deniedPath.value = '';
    },
  );
  watch(
    [identity, available, locked],
    () => {
      request.invalidate();
      data.value = null;
      lastSuccess = 0;
      request.loaded.value = false;
      request.failed.value = false;
      resume();
    },
    { immediate: true, flush: 'sync' },
  );
  function visibilityChanged() {
    if (document.visibilityState === 'hidden') {
      clearTimer();
      request.invalidate();
    } else resume();
  }
  function changed(event: Event) {
    const changedKind = (event as CustomEvent).detail;
    if (
      changedKind === kind ||
      (isFinancialSection(kind) && changedKind === 'finance') ||
      (kind === 'finance' &&
        (changedKind === 'income' || changedKind === 'expense'))
    ) {
      lastSuccess = 0;
      if (active.value && document.visibilityState !== 'hidden')
        void request.load(true);
    }
  }
  onMounted(() => {
    document.addEventListener('visibilitychange', visibilityChanged);
    window.addEventListener(HOME_SECTION_CHANGED, changed);
    resume();
  });
  onDeactivated(() => {
    active.value = false;
    clearTimer();
  });
  onActivated(() => {
    active.value = true;
    resume();
  });
  onBeforeUnmount(() => {
    active.value = false;
    clearTimer();
    document.removeEventListener('visibilitychange', visibilityChanged);
    window.removeEventListener(HOME_SECTION_CHANGED, changed);
  });
  void visuals.load();
  void locks.loadLockedMenus();
  function unlock() {
    const target = deniedPath.value || lockedMenu.value?.path || path.value;
    if (target) locks.triggerUnlock(target, false);
  }
  function selectPeriod(next: FinancePeriod) {
    if (!isFinancialSection(kind) || locked.value || !available.value) return;
    if (next === period.value && !request.failed.value) return;
    period.value = next;
    void request.load(true);
  }
  return {
    ...request,
    data,
    available,
    locked,
    path,
    unlock,
    identity,
    period,
    displayedPeriod,
    selectPeriod,
  };
}
