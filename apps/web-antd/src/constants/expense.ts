// 支付方式选项
export interface PayTypeOption {
  id: number;
  label: string;
  value: string;
}

export const PAY_TYPE_OPTIONS: PayTypeOption[] = [
  { id: 1, label: '支付宝', value: '1' },
  { id: 2, label: '微信', value: '2' },
  { id: 3, label: '现金', value: '3' },
  { id: 4, label: '银行卡', value: '4' },
  { id: 5, label: '广发信用卡', value: '5' },
  { id: 6, label: '招商信号卡', value: '6' },
  { id: 7, label: '京东', value: '7' },
];
