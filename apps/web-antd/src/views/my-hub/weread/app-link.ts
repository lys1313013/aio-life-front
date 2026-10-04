import { safeBookLink } from './format';

/** Scheme 来自微信读书官方 book-detail 页面；bId 必须使用接口 bookId。 */
export function wereadAppLink(bookId?: string) {
  return typeof bookId === 'string' && /^[\w-]+$/.test(bookId)
    ? `weread://reading?bId=${encodeURIComponent(bookId)}&style=1`
    : undefined;
}

export function isMobileBrowser(userAgent: string, touchPoints = 0) {
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && touchPoints > 1)
  );
}

export function wereadBrowserLink(
  bookId: string | undefined,
  userAgent: string,
  webLink?: string,
) {
  const scheme = wereadAppLink(bookId);
  if (!scheme) return undefined;
  // Chrome 的原生 fallback 避免定时跳转在用户从 App 返回时误触发。
  if (/Android/i.test(userAgent) && !/MicroMessenger/i.test(userAgent)) {
    const fallback = safeBookLink(webLink);
    return `intent://reading?bId=${encodeURIComponent(bookId!)}&style=1#Intent;scheme=weread;package=com.tencent.weread;${fallback ? `S.browser_fallback_url=${encodeURIComponent(fallback)};` : ''}end`;
  }
  return scheme;
}
