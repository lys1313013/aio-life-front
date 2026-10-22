import type { DeviceCreateReq } from '#/api/payload';

import { pickPayload } from '#/api/payload';
import { requestClient } from '#/api/request';
import { afterHomeSectionWrite } from '#/utils/home-section-change';

export interface LinkedDevice {
  id: string;
  name: string;
  spec?: null | string;
  purchaseDate?: null | string;
}
export interface ExpenseDeviceContext {
  device: LinkedDevice | null;
  defaults: DeviceCreateReq;
}
export interface ExpenseDeviceChange {
  expenseId: string;
  deviceId: null | string;
  deviceName: null | string;
}
export function getExpenseDevice(id: string) {
  return requestClient.get<ExpenseDeviceContext>(`/expense/${id}/device`);
}
export function bindExpenseDevice(id: string, deviceId: string) {
  return requestClient.put<LinkedDevice>(`/expense/${id}/device`, { deviceId });
}
export function createExpenseDevice(id: string, draft: DeviceCreateReq) {
  return afterHomeSectionWrite(
    'device',
    requestClient.post<LinkedDevice>(
      `/expense/${id}/device`,
      pickPayload('DeviceCreateReq', draft),
    ),
  );
}
export function unbindExpenseDevice(id: string) {
  return requestClient.delete<boolean>(`/expense/${id}/device`);
}
