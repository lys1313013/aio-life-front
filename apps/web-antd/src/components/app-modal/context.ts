import type { InjectionKey, Ref } from 'vue';

export interface ModalFooterContext {
  target: Ref<HTMLElement | undefined>;
  busy: Readonly<Ref<boolean>>;
  setBusy: (id: symbol, busy: boolean) => void;
  clearBusy: (id: symbol) => void;
  register: (id: symbol, busy: boolean) => void;
  unregister: (id: symbol) => void;
}

export const modalFooterKey: InjectionKey<ModalFooterContext> =
  Symbol('app-modal-footer');
