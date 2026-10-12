// <lao-map> — Leaflet + OpenStreetMap (CARTO tiles).
// Data attributes (JSON strings): stops=[{lat,lng,name}], places=[{id,lat,lng,name,cat,sel}], nearby=[{id,lat,lng,name,cat}], pin={lat,lng}, focus={lat,lng}
// Other: theme="light|dark", mode="route|places|pick", fit-key (refit when changed), zoom="1" (zoom buttons), pad-left/right/top/bottom (px)
// Without data attributes it renders a sample Luang Prabang route (day="1|2", nearby="0|1").
// Emits bubbling CustomEvent 'laomap' with detail {type:'pick',lat,lng} or {type:'select',id}.
(function () {
  if (customElements.get('lao-map')) return;
  const HUE = { temple: 75, cafe: 45, food: 25, stay: 320, nature: 155, market: 355, view: 215, museum: 260, gift: 110 };
  const ICON = { temple: 'temple_buddhist', cafe: 'local_cafe', food: 'restaurant', stay: 'hotel', nature: 'water', market: 'storefront', view: 'landscape', museum: 'museum', gift: 'redeem' };
  const col = (c) => `oklch(0.6 0.12 ${HUE[c] ?? 260})`;
  const SAMPLE = {
    1: [[19.8919, 102.1361, 'พระราชวังหลวง'], [19.8926, 102.1378, 'พระธาตุภูษี'], [19.8976, 102.1430, 'วัดเชียงทอง'], [19.8950, 102.1395, 'Saffron Coffee'], [19.8912, 102.1347, 'ตลาดมืดหลวงพระบาง']],
    2: [[19.7490, 101.9930, 'ตาดกวางสี'], [19.8790, 102.1690, 'บ้านผานม']],
    nearby: [[19.8915, 102.1372, 'วัดใหม่สุวรรณภูมาราม', 'temple'], [19.8958, 102.1409, 'Le Banneton', 'cafe'], [19.8897, 102.1343, 'ศูนย์ศิลปะและชาติพันธุ์', 'museum'], [19.8862, 102.1362, 'วัดวิชุนราช', 'temple'], [19.8878, 102.1372, 'Manda de Laos', 'food'], [19.8988, 102.1404, 'จุดชมวิวริมโขง', 'view'], [19.8868, 102.1398, 'Satri House', 'stay']]
  };

  let loading;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise((res) => {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(l);
      const st = document.createElement('style');
      st.textContent = '.leaflet-control-attribution{font-size:9px!important;background:rgba(255,255,255,.6)!important}.lao-dark .leaflet-control-attribution{background:rgba(20,25,56,.6)!important;color:#aab}.lao-dark .leaflet-control-attribution a{color:#ccd}.leaflet-container{font-family:Anuphan,sans-serif;background:transparent}.leaflet-tooltip{font-family:Anuphan,sans-serif;font-size:13px;border-radius:8px;border:0;box-shadow:0 4px 16px rgba(20,25,56,.18)}.leaflet-bar a{color:#1C1B22}';
      document.head.appendChild(st);
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = res; document.head.appendChild(s);
    });
    return loading;
  }
  const routeCache = {};
  async function fetchRoute(pts, attempt = 0) {
    const key = pts.map((p) => p.join(',')).join(';');
    if (routeCache[key]) return routeCache[key];
    try {
      const q = pts.map((p) => `${p[1]},${p[0]}`).join(';');
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${q}?overview=full&geometries=geojson`);
      const j = await r.json();
      const line = j.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
      routeCache[key] = line; return line;
    } catch (e) {
      console.warn('lao-map: OSRM route failed (attempt ' + (attempt + 1) + '):', e && e.message);
      if (attempt < 2) { await new Promise((r) => setTimeout(r, 1200 * (attempt + 1))); return fetchRoute(pts, attempt + 1); }
      return null;
    }
  }
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/';
  const tileUrl = (dark) => ESRI + (dark ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base') + '/MapServer/tile/{z}/{y}/{x}';
  const labelUrl = (dark) => ESRI + (dark ? 'World_Dark_Gray_Reference' : 'World_Light_Gray_Reference') + '/MapServer/tile/{z}/{y}/{x}';

  class LaoMap extends HTMLElement {
    static get observedAttributes() { return ['theme', 'day', 'nearby', 'stops', 'places', 'pin', 'focus', 'fit-key', 'fitkey', 'mode']; }
    attr(n) { return this.getAttribute(n) ?? this.getAttribute(n.replace(/-/g, '')); }
    connectedCallback() {
      Object.assign(this.style, { display: 'block', width: '100%', height: '100%', position: 'relative' });
      loadLeaflet().then(() => { if (this.isConnected && !this.map) this.init(); });
    }
    disconnectedCallback() { if (this.map) { this.map.remove(); this.map = null; } if (this.ro) this.ro.disconnect(); }
    attributeChangedCallback(n) {
      if (!this.map) return;
      if (n === 'theme') { this.tiles.setUrl(tileUrl(this.dark())); this.labels.setUrl(labelUrl(this.dark())); this.classList.toggle('lao-dark', this.dark()); }
      cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(() => this.draw());
    }
    dark() { return this.getAttribute('theme') === 'dark'; }
    num(a, d) { const v = parseFloat(this.attr(a)); return isNaN(v) ? d : v; }
    json(a) { const v = this.getAttribute(a); if (!v || v[0] !== '[' && v[0] !== '{') return null; try { return JSON.parse(v); } catch (e) { return null; } }
    emit(detail) { this.dispatchEvent(new CustomEvent('laomap', { bubbles: true, composed: true, detail })); }
    init() {
      const L = window.L;
      this.innerHTML = '';
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;inset:0;';
      this.appendChild(el);
      this.classList.toggle('lao-dark', this.dark());
      const map = L.map(el, { zoomControl: false, attributionControl: true });
      this.map = map;
      if (this.getAttribute('zoom') === '1') L.control.zoom({ position: this.getAttribute('look') === 'fleet' ? 'topright' : 'bottomright' }).addTo(map);
      this.tiles = L.tileLayer(tileUrl(this.dark()), { maxZoom: 19, maxNativeZoom: 16, attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors' }).addTo(map);
      this.labels = L.tileLayer(labelUrl(this.dark()), { maxZoom: 19, maxNativeZoom: 16 }).addTo(map);
      this.layer = L.layerGroup().addTo(map);
      map.setView([19.89, 102.14], 14);
      map.on('click', (e) => { if (this.getAttribute('mode') === 'pick') this.emit({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng }); });
      this.ro = new ResizeObserver(() => map.invalidateSize());
      this.ro.observe(this);
      this.draw();
    }
    draw() {
      const L = window.L, map = this.map; if (!map) return;
      const dark = this.dark(); const fleet = this.getAttribute('look') === 'fleet';
      let stops = this.json('stops'), places = this.json('places'), nearby = this.json('nearby'), pin = this.json('pin');
      if (!stops && !places && !pin && !nearby) {
        stops = (SAMPLE[this.getAttribute('day') || '1'] || SAMPLE[1]).map((s) => ({ lat: s[0], lng: s[1], name: s[2] }));
        nearby = this.getAttribute('nearby') === '0' ? [] : SAMPLE.nearby.map((s) => ({ lat: s[0], lng: s[1], name: s[2], cat: s[3] }));
      }
      stops = stops || []; places = places || []; nearby = nearby || [];
      const id = (this.drawId = (this.drawId || 0) + 1);
      this.layer.clearLayers();
      const ring = dark ? '#141938' : '#fff';
      places.forEach((p) => {
        const s = p.sel ? 36 : (fleet ? 28 : 26);
        const html = `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${col(p.cat)};border:${p.sel ? 3 : 2}px solid ${p.sel ? (fleet ? '#1C1D3B' : '#D8B76A') : ring};box-shadow:0 ${p.sel ? 4 : 1}px ${p.sel ? 12 : 4}px rgba(20,25,56,.35);display:grid;place-items:center;color:#fff;font-family:'Material Symbols Rounded';font-size:${p.sel ? 20 : 15}px;line-height:1">${ICON[p.cat] || 'place'}</div>`;
        const m = L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: '', iconSize: [s, s], iconAnchor: [s / 2, s / 2] }), zIndexOffset: p.sel ? 2000 : 0 })
          .bindTooltip(p.name, { direction: 'top', offset: [0, -s / 2] }).addTo(this.layer);
        if (p.id) m.on('click', () => this.emit({ type: 'select', id: p.id }));
      });
      nearby.forEach((p) => {
        const html = `<div style="width:26px;height:26px;border-radius:50%;background:${dark ? '#1E255A' : '#fff'};color:${col(p.cat)};border:2px dashed ${col(p.cat)};box-shadow:0 1px 4px rgba(20,25,56,.25);display:grid;place-items:center;font-family:'Material Symbols Rounded';font-size:15px;line-height:1">${ICON[p.cat] || 'place'}</div>`;
        const m = L.marker([p.lat, p.lng], { icon: L.divIcon({ html, className: '', iconSize: [26, 26], iconAnchor: [13, 13] }) })
          .bindTooltip('ใกล้เส้นทาง · ' + p.name, { direction: 'top', offset: [0, -12] }).addTo(this.layer);
        if (p.id) m.on('click', () => this.emit({ type: 'select', id: p.id }));
      });
      const pts = stops.map((s) => [s.lat, s.lng]);
      let casing, line;
      if (pts.length > 1) {
        casing = L.polyline(pts, { color: fleet ? '#2F8466' : ring, weight: fleet ? 14 : 8, opacity: fleet ? 0.12 : 0.9 }).addTo(this.layer);
        line = L.polyline(pts, { color: fleet ? '#2F8466' : dark ? '#D8B76A' : '#333F96', weight: fleet ? 3.5 : 4, opacity: 0.95 }).addTo(this.layer);
      }
      stops.forEach((s, i) => {
        const bg = dark ? '#D8B76A' : '#333F96', fg = dark ? '#141938' : '#fff';
        const end = i === 0 || i === stops.length - 1;
        const html = fleet
          ? (end ? `<div style="width:30px;height:30px;border-radius:50%;background:rgba(47,132,102,.18);display:grid;place-items:center"><div style="width:18px;height:18px;border-radius:50%;background:#2F8466;border:2.5px solid #fff;color:#fff;display:grid;place-items:center;font:700 10px Anuphan,sans-serif">${i + 1}</div></div>` : `<div style="width:22px;height:22px;border-radius:5px;background:#fff;border:2.5px solid #1C1D3B;color:#1C1D3B;display:grid;place-items:center;font:700 11px Anuphan,sans-serif;box-shadow:0 2px 6px rgba(28,29,59,.2);margin:4px">${i + 1}</div>`)
          : `<div style="width:30px;height:30px;border-radius:50%;background:${bg};color:${fg};border:2.5px solid ${ring};box-shadow:0 2px 8px rgba(20,25,56,.4);display:grid;place-items:center;font:600 13px Anuphan,sans-serif">${i + 1}</div>`;
        L.marker([s.lat, s.lng], { icon: L.divIcon({ html, className: '', iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: 1000 })
          .bindTooltip(s.name || '', { direction: 'top', offset: [0, -14] }).addTo(this.layer);
      });
      if (pin && isFinite(pin.lat) && isFinite(pin.lng)) {
        const html = `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${fleet ? '#2F8466' : '#333F96'};border:3px solid #fff;box-shadow:0 4px 12px rgba(20,25,56,.4)"></div>`;
        const m = L.marker([pin.lat, pin.lng], { draggable: true, icon: L.divIcon({ html, className: '', iconSize: [34, 34], iconAnchor: [17, 38] }), zIndexOffset: 3000 }).addTo(this.layer);
        m.on('dragend', () => { const ll = m.getLatLng(); this.emit({ type: 'pick', lat: ll.lat, lng: ll.lng }); });
      }
      const fk = this.attr('fit-key') || 'default';
      if (fk !== this.lastFit) {
        this.lastFit = fk;
        const all = pts.length ? pts.concat(nearby.length && pts.length < 2 ? [] : []) : places.length ? places.map((p) => [p.lat, p.lng]) : pin ? [[pin.lat, pin.lng]] : [];
        if (all.length === 1) map.setView(all[0], 16);
        else if (all.length > 1) map.fitBounds(L.latLngBounds(all), { paddingTopLeft: [this.num('pad-left', 48), this.num('pad-top', 48)], paddingBottomRight: [this.num('pad-right', 48), this.num('pad-bottom', 48)], maxZoom: 17 });
      }
      const f = this.json('focus');
      const fkey = f ? f.lat + ',' + f.lng : '';
      if (f && fkey !== this.lastFocus) map.flyTo([f.lat, f.lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
      this.lastFocus = fkey;
      if (line) fetchRoute(pts).then((road) => { if (road && this.drawId === id) { line.setLatLngs(road); casing.setLatLngs(road); } });
    }
  }
  customElements.define('lao-map', LaoMap);
})();
