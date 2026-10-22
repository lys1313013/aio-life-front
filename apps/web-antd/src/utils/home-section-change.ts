import type { HomeSectionKind } from '#/api/core/home-sections';

export const HOME_SECTION_CHANGED = 'aio-life:home-section-changed';
/** 业务写入成功后标记首页摘要过期，失败不影响已显示的数据。 */
export async function afterHomeSectionWrite<T>(
  kind: HomeSectionKind,
  operation: Promise<T>,
): Promise<T> {
  const result = await operation;
  window.dispatchEvent(new CustomEvent(HOME_SECTION_CHANGED, { detail: kind }));
  return result;
}
