import { requestClient } from '#/api/request';

export interface FeishuChannelConfig {
  appId?: string;
  bound: boolean;
  configured: boolean;
  enabled: boolean;
  openIdMasked?: string;
  receiverOpenId?: string;
  receiverName?: string;
}

export interface FeishuChannelSaveParams {
  appId?: string;
  appSecret?: string;
  enabled: boolean;
  openId?: string;
}

export interface FeishuRecipient {
  name?: string;
  openId: string;
}

export interface FeishuRecipientList {
  items: FeishuRecipient[];
  warning?: string;
}

export interface ChannelState {
  channel: string;
  enabled: boolean;
}

export interface NotificationPreference {
  bizType: string;
  description: string;
  visible: boolean;
  channels: ChannelState[];
}

export async function getFeishuChannelConfigApi() {
  return await requestClient.get<FeishuChannelConfig>(
    '/notification/channels/feishu',
  );
}

export async function saveFeishuChannelConfigApi(
  data: FeishuChannelSaveParams,
) {
  return await requestClient.put<FeishuChannelConfig>(
    '/notification/channels/feishu',
    data,
  );
}

export async function deleteFeishuChannelConfigApi() {
  return await requestClient.delete<void>('/notification/channels/feishu');
}

export async function getFeishuRecipientsApi() {
  return await requestClient.get<FeishuRecipientList>(
    '/notification/channels/feishu/recipients',
  );
}

export async function testFeishuChannelConfigApi() {
  return await requestClient.post<void>('/notification/channels/feishu/test');
}

export async function getNotificationPreferencesApi() {
  return await requestClient.get<NotificationPreference[]>(
    '/notification/preferences',
  );
}

export async function updateNotificationPreferencesApi(
  items: NotificationPreference[],
) {
  return await requestClient.put<NotificationPreference[]>(
    '/notification/preferences',
    {
      items: items.flatMap(({ bizType, channels }) =>
        channels.map(({ channel, enabled }) => ({ bizType, channel, enabled })),
      ),
    },
  );
}
