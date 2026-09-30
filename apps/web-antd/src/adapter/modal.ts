import type { ModalApiOptions, ModalProps } from '@vben/common-ui';

import { useVbenModal as useBaseModal } from '@vben/common-ui';

import '#/components/app-modal/modal.css';

/** Preserve Vben's connected-component/data/lock lifecycle, sharing the application skin. */
export function useVbenModal<T extends ModalProps = ModalProps>(
  options: ModalApiOptions = {},
) {
  return useBaseModal<T>({
    centered: true,
    bordered: false,
    header: false,
    closable: false,
    fullscreenButton: false,
    closeOnClickModal: true,
    overlayBlur: 1,
    confirmText: '保存',
    ...options,
    class: [
      'app-vben-modal w-[calc(100vw-32px)] sm:w-[640px] max-w-[calc(100vw-32px)]',
      options.class,
    ]
      .filter(Boolean)
      .join(' '),
    contentClass: ['app-modal-body app-modal-form', options.contentClass]
      .filter(Boolean)
      .join(' '),
    footerClass: ['app-modal-footer', options.footerClass]
      .filter(Boolean)
      .join(' '),
  });
}
