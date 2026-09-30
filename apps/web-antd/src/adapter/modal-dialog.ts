import type { ModalFuncProps } from 'ant-design-vue';

import { Modal } from 'ant-design-vue';

import '#/components/app-modal/modal.css';

// Imperative confirmations retain their explicit action text and Promise lifecycle.
function options(value: ModalFuncProps): ModalFuncProps {
  return {
    centered: true,
    maskClosable: true,
    ...value,
    class: ['app-modal-confirm', value.class].filter(Boolean).join(' '),
    maskStyle: {
      background: 'hsl(var(--overlay))',
      backdropFilter: 'blur(1px)',
      ...value.maskStyle,
    },
  };
}
export const appDialog = {
  confirm: (value: ModalFuncProps) => Modal.confirm(options(value)),
  success: (value: ModalFuncProps) => Modal.success(options(value)),
  info: (value: ModalFuncProps) => Modal.info(options(value)),
  error: (value: ModalFuncProps) => Modal.error(options(value)),
  warning: (value: ModalFuncProps) => Modal.warning(options(value)),
};
