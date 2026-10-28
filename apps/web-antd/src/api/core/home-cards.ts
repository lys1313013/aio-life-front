import { requestClient } from '#/api/request';

export interface HomeCardPreference {
  cardKey: string;
  group: 'overview' | 'section';
  title: string;
  icon: string;
  iconColor?: null | string;
  isEnabled: number;
  sortOrder: number;
}
export const getHomeCards = () =>
  requestClient.get<HomeCardPreference[]>('/home/cards');
export const toggleHomeCard = (key: string, enabled: boolean) =>
  requestClient.put<HomeCardPreference[]>(
    `/home/cards/${encodeURIComponent(key)}`,
    { isEnabled: enabled ? 1 : 0 },
  );
export const orderHomeCards = (group: string, keys: string[]) =>
  requestClient.put<HomeCardPreference[]>('/home/cards/order', { group, keys });
export const resetHomeCards = () =>
  requestClient.delete<HomeCardPreference[]>('/home/cards');
