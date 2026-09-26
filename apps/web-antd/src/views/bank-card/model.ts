import type { BankCard } from '#/api/bank-card';

export const COLORS = [
  '#334766',
  '#38605C',
  '#685174',
  '#87534F',
  '#716348',
  '#414854',
];
export const STATUS_OPTIONS = [
  { value: 'normal', label: '正常' },
  { value: 'frozen', label: '冻结' },
  { value: 'lost', label: '挂失' },
  { value: 'closed', label: '已注销' },
];
export function defaultColor(bankCode = '') {
  const hash = [...bankCode].reduce((n, char) => n + char.codePointAt(0)!, 0);
  return COLORS[hash % COLORS.length]!;
}
export function filterCards(
  cards: BankCard[],
  keyword: string,
  bankId?: string,
  type?: string,
  status?: string,
  tags: string[] = [],
) {
  const query = keyword.trim().toLocaleLowerCase();
  return cards
    .filter(
      (card) =>
        (!bankId ||
          (card.bankId ?? `custom:${card.customBankName}`) === bankId) &&
        (!type || card.cardType === type) &&
        (!status || card.status === status) &&
        (tags.length === 0 || card.tags.some((tag) => tags.includes(tag.id))) &&
        (!query ||
          [card.alias, card.cardName, card.bankName, card.cardNoLast4].some(
            (value) => value?.toLocaleLowerCase().includes(query),
          )),
    )
    .toSorted(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        b.id.localeCompare(a.id, undefined, { numeric: true }),
    );
}
export function money(amount: BankCard['creditLimit']) {
  return amount === null
    ? '未记录'
    : Number(amount).toLocaleString('zh-CN', { maximumFractionDigits: 2 });
}
