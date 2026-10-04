import { requestClient } from '#/api/request';

export interface HomeCardPreference {
  cardKey: string;
  group: 'overview' | 'section';
  title: string;
  icon: string;
  enabled: boolean;
  sortOrder: number;
}
export const getHomeCards = () =>
  requestClient.get<HomeCardPreference[]>('/home/cards');
export const toggleHomeCard = (key: string, enabled: boolean) =>
  requestClient.put<HomeCardPreference[]>(
    `/home/cards/${encodeURIComponent(key)}`,
    { enabled },
  );
export const orderHomeCards = (group: string, keys: string[]) =>
  requestClient.put<HomeCardPreference[]>('/home/cards/order', { group, keys });
export const resetHomeCards = () =>
  requestClient.delete<HomeCardPreference[]>('/home/cards');
