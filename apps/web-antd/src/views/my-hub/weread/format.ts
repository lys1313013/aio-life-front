/** 外部接口链接只允许 HTTPS，禁止可执行协议。 */
export function safeLink(value?: string) {
  try {
    const url = new URL(value ?? '');
    return url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}
export function safeBookLink(value?: string) {
  const link = safeLink(value);
  if (!link) return undefined;
  const url = new URL(link);
  if (
    url.username ||
    url.password ||
    (url.hostname !== 'weread.qq.com' &&
      !url.hostname.endsWith('.weread.qq.com'))
  ) {
    return undefined;
  }
  // 接口返回的详情页链接在 Web 端转换为可直接阅读的地址。
  if (url.pathname === '/book-detail') {
    const readerId = url.searchParams.get('v');
    return readerId
      ? `https://weread.qq.com/web/reader/${encodeURIComponent(readerId)}`
      : undefined;
  }
  return link;
}
export function readingTime(seconds?: number) {
  if (seconds == null) return '暂无数据';
  return seconds >= 3600
    ? `${(seconds / 3600).toFixed(1)} 小时`
    : `${Math.round(seconds / 60)} 分钟`;
}
export function readingDate(seconds?: number) {
  return seconds
    ? new Date(seconds * 1000).toLocaleDateString('zh-CN', {
        timeZone: 'Asia/Shanghai',
      })
    : '暂无记录';
}
