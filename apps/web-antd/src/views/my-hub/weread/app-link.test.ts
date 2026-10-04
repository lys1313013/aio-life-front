import { describe, expect, it } from 'vitest';

import { isMobileBrowser, wereadAppLink, wereadBrowserLink } from './app-link';

describe('微信读书 App 链接', () => {
  it('保留长 ID，拒绝参数和 Intent 注入', () => {
    expect(wereadAppLink('9223372036854775807')).toBe(
      'weread://reading?bId=9223372036854775807&style=1',
    );
    for (const id of ['', '1&bId=2', '1#Intent;package=evil', '1/2'])
      expect(wereadAppLink(id)).toBeUndefined();
  });
  it('android 使用 Intent 与编码的网页版回退，iOS 和微信使用 Scheme', () => {
    const web = 'https://weread.qq.com/web/reader/mock';
    expect(wereadBrowserLink('123', 'Android Chrome', web)).toContain(
      `S.browser_fallback_url=${encodeURIComponent(web)};end`,
    );
    for (const ua of ['iPhone', 'Android MicroMessenger'])
      expect(wereadBrowserLink('123', ua, web)).toBe(wereadAppLink('123'));
    expect(
      wereadBrowserLink('123', 'Android', 'https://evil.test'),
    ).not.toContain('fallback');
  });
  it('识别手机及 iPad 桌面 UA，电脑触摸屏不受影响', () => {
    expect(isMobileBrowser('Android')).toBe(true);
    expect(isMobileBrowser('Macintosh', 5)).toBe(true);
    expect(isMobileBrowser('Macintosh', 0)).toBe(false);
    expect(isMobileBrowser('Windows', 5)).toBe(false);
  });
});
