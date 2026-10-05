import { requestClient } from '#/api/request';

export interface MenuVisual {
  menuId?: null | string;
  path?: null | string;
  icon?: string;
  iconColor?: null | string;
}

export interface MenuVisuals {
  menus: MenuVisual[];
  cards: Record<string, MenuVisual>;
}

export const getMenuVisuals = () =>
  requestClient.get<MenuVisuals>('/menu/visuals');
