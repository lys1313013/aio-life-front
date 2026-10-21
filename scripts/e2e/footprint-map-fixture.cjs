// 只用于浏览器测试：模拟 SDK 的事件/坐标契约，不代表真实百度底图或联网服务验证。
function mapSdkFixture(callback) {
  return `(${function install(callbackName) {
    window.BMAP_COORD_GCJ02 = 2;
    class Point { constructor(lng, lat) { this.lng = lng; this.lat = lat; } }
    class Overlay {}
    class Map {
      constructor(container) {
        this.container = container; this.zoom = 4; this.center = new Point(104, 35); this.listeners = {}; this.overlays = new Set();
        container.style.position = 'relative'; container.style.background = 'repeating-linear-gradient(0deg,transparent,transparent 39px,#a0aab222 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#a0aab222 40px)';
        this.pane = document.createElement('div'); this.pane.style.cssText = 'position:absolute;inset:0'; container.append(this.pane);
        const label = document.createElement('span'); label.textContent = '模拟地图'; label.style.cssText = 'position:absolute;bottom:8px;left:8px;color:#68788a;font-size:12px;pointer-events:none'; container.append(label);
        container.onclick = e => {
          const rect = container.getBoundingClientRect();
          this.emit('click', { point: new Point(120.12 + (e.clientX - rect.left) / 10000, 30.27 + (e.clientY - rect.top) / 10000) });
        };
      }
      centerAndZoom(point, zoom) { this.center = point; this.zoom = zoom; this.emit('zoomend'); this.draw(); }
      enableScrollWheelZoom() {}
      enablePinchToZoom() {}
      getZoom() { return this.zoom; }
      getPanes() { return { markerPane: this.pane }; }
      pointToOverlayPixel(point) {
        const scale = this.zoom > 10 ? 12000 : 4;
        return { x: Math.max(30, Math.min(this.container.clientWidth - 30, this.container.clientWidth / 2 + (point.lng - this.center.lng) * scale)), y: Math.max(30, Math.min(this.container.clientHeight - 30, this.container.clientHeight / 2 - (point.lat - this.center.lat) * scale)) };
      }
      addOverlay(overlay) { this.overlays.add(overlay); overlay.__element = overlay.initialize(this); overlay.draw(); }
      removeOverlay(overlay) { overlay.__element?.remove(); this.overlays.delete(overlay); }
      addEventListener(name, listener) { (this.listeners[name] ||= new Set()).add(listener); }
      removeEventListener(name, listener) { this.listeners[name]?.delete(listener); }
      emit(name, event = {}) { for (const fn of this.listeners[name] || []) fn(event); }
      draw() { for (const overlay of this.overlays) overlay.draw(); }
      zoomIn() { this.zoom++; this.emit('zoomend'); this.draw(); }
      zoomOut() { this.zoom = Math.max(3, this.zoom - 1); this.emit('zoomend'); this.draw(); }
      setViewport(points) {
        this.center = new Point(points.reduce((sum, p) => sum + p.lng, 0) / points.length, points.reduce((sum, p) => sum + p.lat, 0) / points.length);
        this.zoom = Math.max(...points.map(p => p.lng)) - Math.min(...points.map(p => p.lng)) > 5 ? 4 : 16;
        this.emit('zoomend'); this.draw();
      }
      setMapStyleV2() {}
    }
    window.BMap = { Point, Overlay, Map, coordType: 2 };
    window[callbackName]();
  }.toString()})(${JSON.stringify(callback)});`;
}

function initialRecords() {
  return [
    ['9223372036854775805', '2016-01-01', '2019-06-01', '丁香公寓', 120.127128, 30.273297],
    ['9223372036854775806', '2019-07-01', '2023-04-01', '文三路254号院', 120.129779, 30.279610],
    ['9223372036854775807', '2023-05-01', '9999-12-31', '跑马场巷小区', 120.133886, 30.270607],
  ].map(([id, startDate, endDate, placeName, longitude, latitude]) => ({ id, startDate, endDate, placeName, longitude, latitude,
    address: '杭州市西湖区 · ' + placeName,
    coordinateSystem: 'GCJ02', city: '杭州', providerUid: 'synthetic-poi-' + id, note: '模拟备注：在这里生活过。' }));
}

async function setupMapFixture(page, options = {}) {
  const state = { records: initialRecords(), writes: [], reads: 0, failSave: false, failRead: false, delay: 0, searches: [], ...options };
  await page.route('https://api.map.baidu.com/api?**', route => route.fulfill({ contentType: 'application/javascript', body: mapSdkFixture(new URL(route.request().url()).searchParams.get('callback')) }));
  state.handle = async route => {
    const req = route.request(), url = new URL(req.url()), path = url.pathname.replace(/^\/api/, '');
    if (!path.startsWith('/life-footprints')) return false;
    let data;
    if (path === '/life-footprints/map/config') data = { browserKey: 'synthetic-browser-key', searchEnabled: true, coordinateSystem: 'GCJ02' };
    else if (path === '/life-footprints/map/search') {
      const keyword = url.searchParams.get('keyword'); state.searches.push(keyword);
      if (keyword === '旧搜索') await new Promise(resolve => setTimeout(resolve, 850));
      data = [{ placeName: keyword === '新搜索' ? '新搜索结果' : '新增住所', address: '杭州市示例地址', city: '杭州', longitude: 120.131, latitude: 30.278, coordinateSystem: 'GCJ02', providerUid: 'synthetic-search', precise: true, level: 'POI' }];
    } else if (path === '/life-footprints/map/reverse') {
      if (!url.searchParams.has('longitude') || !url.searchParams.has('latitude')) throw new Error('经纬度被请求过滤器丢弃');
      data = { placeName: '地图选点', address: '手动选点地址', city: '杭州', longitude: Number(url.searchParams.get('longitude')), latitude: Number(url.searchParams.get('latitude')), coordinateSystem: 'GCJ02', providerUid: null, precise: true, level: '选点' };
    } else if (path === '/life-footprints/map/geocode') data = { placeName: '地址解析结果', address: '杭州市示例地址', city: '杭州', longitude: 120.132, latitude: 30.279, coordinateSystem: 'GCJ02', providerUid: null, precise: false, level: '道路' };
    else if (req.method() === 'GET') {
      state.reads++; if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
      if (state.failRead) { await route.fulfill({ json: { code: 1, message: '模拟读取失败' } }); return true; }
      data = state.records;
    } else if (req.method() === 'DELETE') {
      const id = path.split('/').at(-1);
      if (url.searchParams.has('version')) throw new Error('删除请求不应携带版本');
      state.records = state.records.filter(r => r.id !== id); data = null;
    } else {
      const payload = req.postDataJSON(); state.writes.push(payload);
      if ('id' in payload || 'confirmed' in payload || 'userId' in payload) throw new Error('提交了界面或身份字段');
      if (state.failSave) { await route.fulfill({ json: { code: 1, message: '模拟保存失败' } }); return true; }
      const id = req.method() === 'POST' ? String(9223372036854775000n + BigInt(state.writes.length)) : path.split('/').at(-1);
      if (Object.hasOwn(payload, 'version')) throw new Error('保存请求不应携带版本');
      data = { ...payload, id };
      state.records = [...state.records.filter(r => r.id !== id), data];
    }
    await route.fulfill({ json: { code: 0, message: null, data } }); return true;
  };
  return state;
}
module.exports = { mapSdkFixture, initialRecords, setupMapFixture };
