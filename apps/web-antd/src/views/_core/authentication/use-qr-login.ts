import type { QrLoginStatus, QrLoginTicket } from '#/api/core/qr-login';

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import {
  cancelQrLogin,
  consumeQrLogin,
  createQrLogin,
  getQrLoginStatus,
  QrLoginError,
} from '#/api/core/qr-login';

export function useQrLogin(completeLogin: (token: string) => Promise<unknown>) {
  const ticket = ref<null | QrLoginTicket>(null);
  const status = ref<QrLoginStatus>('WAITING');
  const loading = ref(false);
  const finishing = ref(false);
  const error = ref('');
  const remaining = ref(120);
  let revision = 0;
  let disposed = false;
  let deadline = 0;
  let failures = 0;
  let polling = false;
  let loginToken = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let clock: ReturnType<typeof setInterval> | undefined;
  const terminal = computed(() =>
    ['EXPIRED', 'FAILED', 'REJECTED'].includes(status.value),
  );
  const text = computed(
    () =>
      ({
        WAITING: '使用已登录的 AIO Life App 或小程序扫一扫',
        SCANNED: '已扫码，请在手机上确认',
        CONFIRMED: '已确认，正在登录',
        ISSUING: '正在登录',
        CONSUMED: '正在进入首页',
        EXPIRED: '二维码已过期',
        REJECTED: '已取消登录',
        FAILED: '登录未完成，请刷新二维码',
      })[status.value],
  );

  function stopTimer() {
    clearTimeout(timer);
  }
  function schedule(delay = 2000) {
    stopTimer();
    if (!disposed && !terminal.value && !document.hidden)
      timer = setTimeout(poll, delay);
  }
  async function finish(version: number) {
    if (finishing.value) return;
    finishing.value = true;
    try {
      await completeLogin(loginToken);
      if (version === revision) {
        loginToken = '';
        ticket.value = null;
        stopTimer();
      }
    } catch {
      if (version === revision) error.value = '登录信息加载失败，请重试';
    } finally {
      if (version === revision) finishing.value = false;
    }
  }
  async function poll() {
    if (
      polling ||
      !ticket.value ||
      terminal.value ||
      disposed ||
      document.hidden ||
      loginToken
    )
      return;
    const version = revision;
    const current = ticket.value;
    polling = true;
    try {
      const result = await getQrLoginStatus(current);
      if (version !== revision || disposed) return;
      if (
        Date.now() >= deadline &&
        ['SCANNED', 'WAITING'].includes(result.status)
      ) {
        status.value = 'EXPIRED';
        return;
      }
      status.value = result.status;
      error.value = '';
      if (['CONFIRMED', 'CONSUMED'].includes(result.status)) {
        const login = await consumeQrLogin(current);
        if (version !== revision || disposed) return;
        loginToken = login.accessToken;
        await finish(version);
        return;
      }
      failures = 0;
    } catch (error_) {
      if (version !== revision || disposed) return;
      failures++;
      error.value =
        error_ instanceof Error ? error_.message : '连接失败，正在重试';
      if (
        (error_ instanceof QrLoginError && !error_.retryable) ||
        Date.now() > deadline + 30_000
      )
        status.value = 'FAILED';
    } finally {
      polling = false;
      if (version === revision && !loginToken && ticket.value)
        schedule(Math.min(10_000, 2000 * 2 ** failures));
      else if (version !== revision && ticket.value && !loading.value)
        schedule(0);
    }
  }
  async function refresh() {
    if (loading.value || finishing.value) return;
    const version = ++revision;
    stopTimer();
    loading.value = true;
    error.value = '';
    loginToken = '';
    try {
      if (ticket.value) await cancelQrLogin(ticket.value);
      if (disposed || version !== revision) return;
      ticket.value = null;
      const created = await createQrLogin();
      if (disposed || version !== revision) {
        void cancelQrLogin(created).catch(() => {});
        return;
      }
      ticket.value = created;
      status.value = 'WAITING';
      failures = 0;
      remaining.value = created.expiresIn;
      deadline = Date.now() + created.expiresIn * 1000;
      schedule(created.pollInterval * 1000);
    } catch (error_) {
      if (version !== revision) return;
      status.value = 'FAILED';
      error.value =
        error_ instanceof Error ? error_.message : '二维码加载失败，请重试';
    } finally {
      if (version === revision) loading.value = false;
    }
  }
  function visibility() {
    if (document.hidden) stopTimer();
    else schedule(0);
  }
  function retry() {
    return loginToken ? finish(revision) : refresh();
  }
  onMounted(() => {
    void refresh();
    document.addEventListener('visibilitychange', visibility);
    clock = setInterval(() => {
      remaining.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      if (
        ticket.value &&
        remaining.value === 0 &&
        ['SCANNED', 'WAITING'].includes(status.value)
      ) {
        status.value = 'EXPIRED';
        stopTimer();
      }
    }, 1000);
  });
  onBeforeUnmount(() => {
    disposed = true;
    revision++;
    stopTimer();
    clearInterval(clock);
    document.removeEventListener('visibilitychange', visibility);
    if (ticket.value) void cancelQrLogin(ticket.value).catch(() => {});
    loginToken = '';
  });
  return {
    ticket,
    status,
    loading,
    finishing,
    error,
    remaining,
    terminal,
    text,
    refresh,
    retry,
  };
}
