import type { TencentMapConfig } from './map-config';
import type { FootprintMapHandle } from './map-handle';
import type { Coordinate, FootprintMapRecord, LocationGroup } from './model';

import { groupLocations } from './model';

type Position = { lat: number; lng: number };
interface TencentMap {
  destroy(): void;
  fitBounds(bounds: unknown, options: { padding: number }): void;
  getZoom(): number;
  on(event: string, callback: (event: { latLng?: Position }) => void): void;
  projectToContainer(point: Position): { x: number; y: number };
  setCenter(point: Position): void;
  setPitch(pitch: number): void;
  setRotation(rotation: number): void;
  setZoom(zoom: number): void;
}
interface TencentSdk {
  LatLng: new (latitude: number, longitude: number) => Position;
  LatLngBounds: new (
    southwest: Position,
    northeast: Position,
  ) => {
    extend(point: Position): void;
  };
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => TencentMap;
}
const globals = window as unknown as Record<string, unknown> & {
  TMap?: TencentSdk;
};
let sdkRequest: null | { promise: Promise<TencentSdk>; serviceHost: string } =
  null;
let callbackSequence = 0;

/** 仅从腾讯官方地址按需加载；失败允许重试，同一代理地址的多地图实例共用 SDK。 */
export function loadTencentSdk(serviceHost: string): Promise<TencentSdk> {
  const proxy = new URL(serviceHost, window.location.origin);
  if (proxy.origin !== window.location.origin || proxy.search || proxy.hash)
    return Promise.reject(new Error('地图代理必须使用本站地址'));
  if (sdkRequest?.serviceHost === proxy.href) return sdkRequest.promise;
  // 官方代理配置必须先于 SDK 执行，SDK 与后续鉴权请求均不携带 Key。
  (
    window as unknown as { _TMapSecurityConfig: { serviceHost: string } }
  )._TMapSecurityConfig = { serviceHost: proxy.href };
  const promise = new Promise<TencentSdk>((resolve, reject) => {
    const callback = `aioFootprintTencentReady${++callbackSequence}`;
    const script = document.createElement('script');
    const clean = () => {
      clearTimeout(timer);
      delete globals[callback];
      script.onerror = null;
    };
    const fail = () => {
      clean();
      script.remove();
      if (sdkRequest?.promise === promise) sdkRequest = null;
      reject(new Error('腾讯地图加载失败'));
    };
    const timer = setTimeout(fail, 20_000);
    globals[callback] = () => {
      if (!globals.TMap) return fail();
      clean();
      resolve(globals.TMap);
    };
    script.src = `https://map.qq.com/api/gljs?v=1.exp&callback=${callback}`;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.onerror = fail;
    document.head.append(script);
  });
  sdkRequest = { serviceHost: proxy.href, promise };
  return promise;
}

/** 记录和腾讯底图均为 GCJ02，无二次转换；标记使用 DOM 保留键盘与触控操作。 */
export async function mountTencentFootprintMap(
  container: HTMLElement,
  options: {
    cancelled?: () => boolean;
    config: TencentMapConfig;
    initialPoint?: Coordinate | null;
    numbered?: boolean;
    onPick?: (point: Coordinate) => void;
    onSelect: (group: LocationGroup) => void;
    onTileState: (state: 'error' | 'loading' | 'ready') => void;
    picking?: boolean;
    small?: boolean;
  },
): Promise<FootprintMapHandle> {
  if (!options.config.enabled)
    throw new Error('请先在系统配置填写腾讯地图 Key');
  const sdk = await loadTencentSdk(options.config.serviceHost);
  if (options.cancelled?.()) throw new Error('地图加载已取消');
  const point = (value: Coordinate) =>
    new sdk.LatLng(value.latitude, value.longitude);
  const map = new sdk.Map(container, {
    center: point(options.initialPoint ?? { longitude: 105, latitude: 35 }),
    zoom: options.initialPoint ? 16 : 4,
    minZoom: 3,
    maxZoom: 20,
    pitch: 0,
    rotation: 0,
    viewMode: '3D',
    mapStyleId: options.config.mapStyleId,
    showControl: false,
  });
  const overlay = document.createElement('div');
  overlay.className = 'footprint-tencent-markers';
  container.append(overlay);
  let records: FootprintMapRecord[] = [];
  let picked: Coordinate | null = null;
  let picking = !!options.picking;
  let selected: null | string = null;
  let disposed = false;
  let frame = 0;
  let tilted = false;
  let loaded = false;
  let pendingFocus: null | { points: Coordinate[]; zoom?: number } = null;
  const loadingTimeout = setTimeout(() => {
    if (!disposed && !loaded) options.onTileState('error');
  }, 20_000);
  function redraw() {
    if (disposed) return;
    const dots: { coordinate: Coordinate; group: LocationGroup | null }[] =
      groupLocations(
        records.filter((r) => !picked || r.id !== selected),
        map.getZoom(),
      ).map((group) => ({
        coordinate: group,
        group,
      }));
    if (picked) dots.push({ coordinate: picked, group: null });
    overlay.replaceChildren(
      ...dots.map(({ coordinate, group }) => {
        const pixel = map.projectToContainer(point(coordinate));
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'footprint-map-hit';
        button.style.left = `${pixel.x}px`;
        button.style.top = `${pixel.y}px`;
        button.setAttribute(
          'aria-label',
          group
            ? group.records.length > 1
              ? `${group.records.length}条地点记录`
              : group.records[0]!.placeName
            : '已选地图位置',
        );
        const dot = document.createElement('span');
        dot.className = 'footprint-map-dot';
        dot.dataset.active = String(
          !group || group.records.some((record) => record.id === selected),
        );
        dot.dataset.small = String(!!options.small);
        if (group && group.records.length > 1) {
          dot.classList.add('footprint-map-cluster');
          dot.textContent = String(group.records.length);
        } else if (options.numbered) {
          dot.classList.add('footprint-map-number');
          const id = group?.records[0]?.id ?? selected;
          dot.textContent = String(
            records.find((r) => r.id === id)?.markerNumber ??
              (records.findIndex((r) => r.id === id) + 1 || '+'),
          );
        }
        button.append(dot);
        button.onclick = (event) => {
          event.stopPropagation();
          if (group) options.onSelect(group);
        };
        button.addEventListener('pointerdown', (event) =>
          event.stopPropagation(),
        );
        return button;
      }),
    );
  }
  map.on('click', (event) => {
    if (disposed || !picking || !event.latLng) return;
    const { lat, lng } = event.latLng;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    )
      return;
    options.onPick?.({ longitude: lng, latitude: lat });
  });
  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(redraw);
  }
  for (const event of ['zoom', 'pan', 'rotate', 'pitch', 'resize', 'idle'])
    map.on(event, schedule);
  map.on('tilesloaded', () => {
    if (disposed) return;
    const firstLoad = !loaded;
    loaded = true;
    if (firstLoad && pendingFocus) {
      const pending = pendingFocus;
      pendingFocus = null;
      focus(pending.points, pending.zoom);
    }
    clearTimeout(loadingTimeout);
    options.onTileState('ready');
    schedule();
  });
  map.on('context_lost', () => {
    if (!disposed) options.onTileState('error');
  });
  function focus(points: Coordinate[], zoom?: number) {
    if (disposed || points.length === 0) return;
    if (!loaded) {
      pendingFocus = { points: [...points], zoom };
      return;
    }
    if (
      points.every(
        (p) =>
          p.latitude === points[0]!.latitude &&
          p.longitude === points[0]!.longitude,
      )
    ) {
      map.setCenter(point(points[0]!));
      map.setZoom(zoom ?? 16);
    } else {
      const bounds = new sdk.LatLngBounds(point(points[0]!), point(points[0]!));
      for (const p of points) bounds.extend(point(p));
      map.fitBounds(bounds, { padding: 40 });
    }
    schedule();
  }
  options.onTileState('loading');
  return {
    setRecords(value, id) {
      records = value;
      selected = id;
      schedule();
    },
    setPick(value) {
      picked = value;
      schedule();
    },
    setPicking(enabled) {
      picking = enabled;
    },
    setDark() {
      /* 使用已确认的白浅底图，页面与标记沿用主题变量。 */
    },
    focus,
    china() {
      pendingFocus = null;
      map.setCenter(point({ longitude: 105, latitude: 35 }));
      map.setZoom(4);
      schedule();
    },
    zoomIn() {
      map.setZoom(Math.min(20, map.getZoom() + 1));
    },
    zoomOut() {
      map.setZoom(Math.max(3, map.getZoom() - 1));
    },
    toggle3D() {
      tilted = !tilted;
      map.setPitch(tilted ? 55 : 0);
      map.setRotation(tilted ? 15 : 0);
      schedule();
    },
    retryTiles() {
      /* 组件重建地图恢复 WebGL 或瓦片错误。 */
    },
    destroy() {
      disposed = true;
      clearTimeout(loadingTimeout);
      cancelAnimationFrame(frame);
      overlay.remove();
      map.destroy();
    },
  };
}
