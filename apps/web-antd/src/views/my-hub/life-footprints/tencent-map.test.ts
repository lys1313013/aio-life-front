import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let requestedScript: HTMLScriptElement;
const mapState = { map: null as any };
class MapStub {
  center: any;
  destroy = vi.fn();
  events: Record<string, () => void> = {};
  pitch = 0;
  zoom = 4;
  constructor(_container: HTMLElement, options: any) {
    this.center = options.center;
    this.zoom = options.zoom;
    mapState.map = this;
  }
  fitBounds() {}
  getZoom() {
    return this.zoom;
  }
  on(event: string, callback: () => void) {
    this.events[event] = callback;
  }
  projectToContainer() {
    return { x: 150, y: 120 };
  }
  setCenter(value: any) {
    this.center = value;
  }
  setPitch(value: number) {
    this.pitch = value;
  }
  setRotation() {}
  setZoom(value: number) {
    this.zoom = value;
  }
}
async function completeSdk() {
  const script = requestedScript;
  const callback = new URL(script.src).searchParams.get('callback')!;
  Object.assign(window, {
    TMap: {
      Map: MapStub,
      LatLng: class {
        constructor(
          public lat: number,
          public lng: number,
        ) {}
      },
      LatLngBounds: class {
        extend() {}
      },
    },
  });
  (window as any)[callback]();
}
beforeEach(() => {
  vi.resetModules();
  vi.spyOn(document.head, 'append').mockImplementation((...nodes) => {
    requestedScript = nodes[0] as HTMLScriptElement;
  });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => {
  document.body.replaceChildren();
  document.head.querySelectorAll('script').forEach((script) => script.remove());
  delete (window as any).TMap;
  delete (window as any)._TMapSecurityConfig;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('腾讯生活足迹地图', () => {
  it('拒绝外站代理且未配置时不加载 SDK', async () => {
    const { loadTencentSdk, mountTencentFootprintMap } =
      await import('./tencent-map');
    await expect(
      loadTencentSdk('https://untrusted.test/proxy'),
    ).rejects.toThrow('本站');
    await expect(
      mountTencentFootprintMap(document.createElement('div'), {
        config: { enabled: false, serviceHost: '', mapStyleId: 'style1' },
        onSelect: vi.fn(),
        onTileState: vi.fn(),
      }),
    ).rejects.toThrow('配置');
    expect(document.head.append).not.toHaveBeenCalled();
  });
  it('保留 GCJ02 坐标和字符串 ID，标记可访问且支持 3D 与销毁', async () => {
    const { mountTencentFootprintMap } = await import('./tencent-map');
    const container = document.createElement('div');
    document.body.append(container);
    const select = vi.fn();
    const state = vi.fn();
    const pending = mountTencentFootprintMap(container, {
      config: {
        enabled: true,
        serviceHost: '/api/life-footprints/map/tencent-proxy',
        mapStyleId: 'style1',
      },
      onSelect: select,
      onTileState: state,
    });
    expect(new URL(requestedScript.src).searchParams.has('key')).toBe(false);
    expect((window as any)._TMapSecurityConfig.serviceHost).toBe(
      new URL('/api/life-footprints/map/tencent-proxy', window.location.origin)
        .href,
    );
    await completeSdk();
    const handle = await pending;
    const record = {
      id: '9223372036854775807',
      longitude: 120.129_779,
      latitude: 30.279_61,
      placeName: '住所',
    } as any;
    handle.setRecords([record], record.id);
    handle.focus([record], 16);
    expect(mapState.map.zoom).toBe(4);
    mapState.map.events.tilesloaded();
    expect(mapState.map.zoom).toBe(16);
    expect(mapState.map.center).toMatchObject({
      lng: record.longitude,
      lat: record.latitude,
    });
    expect(container.querySelector('button')?.getAttribute('aria-label')).toBe(
      '住所',
    );
    container.querySelector('button')!.click();
    expect(select.mock.calls[0]![0].records[0].id).toBe(record.id);
    handle.toggle3D!();
    expect(mapState.map.pitch).toBe(55);
    mapState.map.events.tilesloaded();
    expect(state).toHaveBeenLastCalledWith('ready');
    handle.destroy();
    expect(mapState.map.destroy).toHaveBeenCalledOnce();
    expect(container.querySelector('button')).toBeNull();
  });
  it('sDK 请求失败后可以重新加载，已取消的异步加载不创建地图', async () => {
    const { loadTencentSdk, mountTencentFootprintMap } =
      await import('./tencent-map');
    const first = loadTencentSdk('/api/life-footprints/map/tencent-proxy');
    const rejection = expect(first).rejects.toThrow();
    requestedScript.dispatchEvent(new Event('error'));
    await rejection;
    const second = mountTencentFootprintMap(document.createElement('div'), {
      config: {
        enabled: true,
        serviceHost: '/api/life-footprints/map/tencent-proxy',
        mapStyleId: 'style1',
      },
      cancelled: () => true,
      onSelect: vi.fn(),
      onTileState: vi.fn(),
    });
    const cancelled = expect(second).rejects.toThrow('已取消');
    await completeSdk();
    await cancelled;
  });
  it('弹窗选点保留 GCJ02，回显与清除选点且销毁后不回调', async () => {
    const { mountTencentFootprintMap } = await import('./tencent-map');
    const container = document.createElement('div');
    const onPick = vi.fn();
    const pending = mountTencentFootprintMap(container, {
      config: {
        enabled: true,
        serviceHost: '/api/life-footprints/map/tencent-proxy',
        mapStyleId: 'style1',
      },
      initialPoint: { longitude: 120.123_456, latitude: 30.234_567 },
      picking: true,
      onPick,
      onSelect: vi.fn(),
      onTileState: vi.fn(),
    });
    await completeSdk();
    const handle = await pending;
    mapState.map.events.click({
      latLng: { lng: 120.123_456, lat: 30.234_567 },
    });
    expect(onPick).toHaveBeenCalledWith({
      longitude: 120.123_456,
      latitude: 30.234_567,
    });
    handle.setPick(onPick.mock.calls[0]![0]);
    expect(container.querySelector('button')?.getAttribute('aria-label')).toBe(
      '已选地图位置',
    );
    handle.setPick(null);
    expect(container.querySelector('button')).toBeNull();
    mapState.map.events.click({ latLng: { lng: Number.NaN, lat: 30 } });
    expect(onPick).toHaveBeenCalledTimes(1);
    handle.destroy();
    mapState.map.events.click({ latLng: { lng: 121, lat: 31 } });
    expect(onPick).toHaveBeenCalledTimes(1);
  });
  it('编辑模式保留其他明细与编号，切换选点不重建地图', async () => {
    const { mountTencentFootprintMap } = await import('./tencent-map');
    const container = document.createElement('div');
    const onPick = vi.fn();
    const onSelect = vi.fn();
    const pending = mountTencentFootprintMap(container, {
      config: {
        enabled: true,
        serviceHost: '/api/life-footprints/map/tencent-proxy',
        mapStyleId: 'style1',
      },
      numbered: true,
      onSelect,
      onPick,
      onTileState: vi.fn(),
    });
    await completeSdk();
    const handle = await pending;
    const first = {
      id: '9223372036854775806',
      placeName: '住所',
      longitude: 116.3,
      latitude: 40.07,
    } as any;
    const second = {
      id: '9223372036854775807',
      placeName: '办公',
      markerNumber: 3,
      longitude: 116.4,
      latitude: 40.17,
    } as any;
    mapState.map.setZoom(16);
    handle.setRecords([first, second], first.id);
    expect(container.querySelectorAll('button')).toHaveLength(2);
    expect(container.querySelector('[aria-label="办公"]')?.textContent).toBe(
      '3',
    );
    handle.setPicking!(true);
    handle.setPick({ longitude: 116.32, latitude: 40.08 });
    expect(container.querySelectorAll('button')).toHaveLength(2);
    expect(container.querySelector('[aria-label="办公"]')).not.toBeNull();
    expect(
      container.querySelector('[aria-label="已选地图位置"]'),
    ).not.toBeNull();
    mapState.map.events.click({ latLng: { lat: 40.08, lng: 116.32 } });
    expect(onPick).toHaveBeenCalledOnce();
    handle.setPicking!(false);
    mapState.map.events.click({ latLng: { lat: 40.09, lng: 116.33 } });
    expect(onPick).toHaveBeenCalledOnce();
    expect(mapState.map.destroy).not.toHaveBeenCalled();
    handle.setPick(null);
    container.querySelector<HTMLButtonElement>('[aria-label="办公"]')!.click();
    expect(onSelect.mock.calls[0]![0].records[0].id).toBe(second.id);
    handle.destroy();
  });
});
