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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('腾讯生活足迹地图', () => {
  it('保留 GCJ02 坐标和字符串 ID，标记可访问且支持 3D 与销毁', async () => {
    const { mountTencentFootprintMap } = await import('./tencent-map');
    const container = document.createElement('div');
    document.body.append(container);
    const select = vi.fn();
    const state = vi.fn();
    const pending = mountTencentFootprintMap(container, {
      config: { key: 'synthetic-key', mapStyleId: 'style1' },
      onSelect: select,
      onTileState: state,
    });
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
    const first = loadTencentSdk('synthetic-key');
    const rejection = expect(first).rejects.toThrow();
    requestedScript.dispatchEvent(new Event('error'));
    await rejection;
    const second = mountTencentFootprintMap(document.createElement('div'), {
      config: { key: 'synthetic-key', mapStyleId: 'style1' },
      cancelled: () => true,
      onSelect: vi.fn(),
      onTileState: vi.fn(),
    });
    const cancelled = expect(second).rejects.toThrow('已取消');
    await completeSdk();
    await cancelled;
  });
});
