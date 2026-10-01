import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useVbenModal } from './modal';

const base = vi.hoisted(() => vi.fn());
vi.mock('@vben/common-ui', () => ({ useVbenModal: base }));

describe('vben application modal adapter', () => {
  beforeEach(() => base.mockReset());

  it('shares the shell while retaining custom classes and caller options', () => {
    useVbenModal({
      class: 'custom-width',
      contentClass: 'custom-body',
      footerClass: 'custom-footer',
      confirmText: '导入',
    });
    expect(base).toHaveBeenCalledWith(
      expect.objectContaining({
        centered: true,
        submitOnEnter: true,
        closeOnClickModal: true,
        header: false,
        closable: false,
        overlayBlur: 1,
        confirmText: '导入',
        class:
          'app-vben-modal w-[calc(100vw-32px)] sm:w-[640px] max-w-[calc(100vw-32px)] custom-width',
        contentClass: 'app-modal-body app-modal-form custom-body',
        footerClass: 'app-modal-footer custom-footer',
      }),
    );
  });

  it('allows opting out of Enter submission', () => {
    useVbenModal({ submitOnEnter: false });
    expect(base).toHaveBeenCalledWith(
      expect.objectContaining({ submitOnEnter: false }),
    );
  });

  it('preserves explicit opt-out of backdrop dismissal', () => {
    useVbenModal({ closeOnClickModal: false });
    expect(base).toHaveBeenCalledWith(
      expect.objectContaining({ closeOnClickModal: false }),
    );
  });

  it('preserves connected components, lifecycle callbacks and the returned API', () => {
    const connectedComponent = { template: '<div />' };
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const api = [
      {},
      { open: vi.fn(), setData: vi.fn(), lock: vi.fn(), unlock: vi.fn() },
    ];
    base.mockReturnValue(api);
    expect(useVbenModal({ connectedComponent, onConfirm, onOpenChange })).toBe(
      api,
    );
    expect(base).toHaveBeenCalledWith(
      expect.objectContaining({ connectedComponent, onConfirm, onOpenChange }),
    );
  });
});
