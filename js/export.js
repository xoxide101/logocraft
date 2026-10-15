/* LogoCraft export: PNG (see-through), JPG, BMP, SVG, PDF and ICO at any pixel size, one size or several in a .zip. Also a simple print. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const DPI = PC.DPI;
  PC.addressList = () => [];

  // ------------------------------------------------------------------ file writers
  const enc = new TextEncoder();
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const u16 = (v) => [v & 255, (v >> 8) & 255], u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  function makeZip(files) { // files: [{ name, bytes }] stored without compression (pictures are compressed already)
    const parts = [], central = [];
    let off = 0;
    files.forEach((f) => {
      const name = enc.encode(f.name), crc = crc32(f.bytes), len = f.bytes.length;
      const head = new Uint8Array([0x50, 0x4b, 3, 4, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(len), ...u32(len), ...u16(name.length), ...u16(0)]);
      parts.push(head, name, f.bytes);
      central.push(new Uint8Array([0x50, 0x4b, 1, 2, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(len), ...u32(len), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
      off += head.length + name.length + len;
    });
    const cdSize = central.reduce((a, b) => a + b.length, 0);
    const end = new Uint8Array([0x50, 0x4b, 5, 6, ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), ...u16(0)]);
    return new Blob([...parts, ...central, end], { type: 'application/zip' });
  }
  // BMP: 24-bit, bottom-up rows padded to 4 bytes. BMP has no see-through, so the picture sits on the background colour.
  function makeBMP(c) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, row = Math.ceil((w * 3) / 4) * 4, size = 54 + row * h;
    const b = new Uint8Array(size);
    b.set([0x42, 0x4d, ...u32(size), 0, 0, 0, 0, ...u32(54), ...u32(40), ...u32(w), ...u32(h), ...u16(1), ...u16(24), ...u32(0), ...u32(row * h), ...u32(11811), ...u32(11811), ...u32(0), ...u32(0)]);
    for (let y = 0; y < h; y++) {
      let o = 54 + (h - 1 - y) * row;
      for (let x = 0; x < w; x++) { const q = (y * w + x) * 4; b[o++] = d[q + 2]; b[o++] = d[q + 1]; b[o++] = d[q]; }
    }
    return new Blob([b], { type: 'image/bmp' });
  }
  // ICO: several square PNG pictures in one file (every browser and Windows since Vista read PNG icons).
  function makeICO(pngs) { // [{ size, bytes }]
    const head = [0, 0, ...u16(1), ...u16(pngs.length)], dir = [];
    let off = 6 + 16 * pngs.length;
    pngs.forEach((p) => { dir.push(p.size >= 256 ? 0 : p.size, p.size >= 256 ? 0 : p.size, 0, 0, ...u16(1), ...u16(32), ...u32(p.bytes.length), ...u32(off)); off += p.bytes.length; });
    return new Blob([new Uint8Array([...head, ...dir]), ...pngs.map((p) => p.bytes)], { type: 'image/x-icon' });
  }
  // PDF: one page the size of the logo, the picture as JPEG with its see-through areas kept as a soft mask.
  function makePDF(c, wMM, hMM) {
    const w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
    const alpha = new Uint8Array(w * h); let solid = true;
    for (let i = 0; i < alpha.length; i++) { alpha[i] = d[i * 4 + 3]; if (alpha[i] < 255) solid = false; }
    const rgb = document.createElement('canvas'); rgb.width = w; rgb.height = h; // colours without the see-through (no dark edges)
    const id = new ImageData(new Uint8ClampedArray(d), w, h); for (let i = 3; i < id.data.length; i += 4) id.data[i] = 255;
    rgb.getContext('2d').putImageData(id, 0, 0);
    return new Promise((res) => rgb.toBlob(async (jb) => {
      const jpeg = new Uint8Array(await jb.arrayBuffer());
      const chunks = [], offsets = []; let size = 0;
      const add = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); size += b.length; };
      const obj = (n, body) => { offsets[n] = size; add(`${n} 0 obj\n`); body.forEach(add); add('\nendobj\n'); };
      const W = (wMM / 25.4) * 72, H = (hMM / 25.4) * 72, content = `q ${W.toFixed(2)} 0 0 ${H.toFixed(2)} 0 0 cm /Im0 Do Q`;
      add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
      obj(1, ['<< /Type /Catalog /Pages 2 0 R >>']);
      obj(2, ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
      obj(3, [`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W.toFixed(2)} ${H.toFixed(2)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`]);
      obj(4, [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`]);
      obj(5, [`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode${solid ? '' : ' /SMask 6 0 R'} /Length ${jpeg.length} >>\nstream\n`, jpeg, '\nendstream']);
      if (!solid) obj(6, [`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceGray /BitsPerComponent 8 /Length ${alpha.length} >>\nstream\n`, alpha, '\nendstream']);
      const count = solid ? 6 : 7, xref = size;
      add(`xref\n0 ${count}\n0000000000 65535 f \n`);
      for (let k = 1; k < count; k++) add(`${String(offsets[k]).padStart(10, '0')} 00000 n \n`);
      add(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
      res(new Blob(chunks, { type: 'application/pdf' }));
    }, 'image/jpeg', 0.95));
  }
  const blobBytes = async (b) => new Uint8Array(await b.arrayBuffer());
  const canvasBlob = (c, type, q) => new Promise((r) => c.toBlob(r, type, q));
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); }
  const baseName = () => (PC.doc.name || 'logo').replace(/[^\w -]+/g, '').trim() || 'logo';

  // ------------------------------------------------------------------ what to draw
  // The area to export, in artboard pixels: the whole artboard, or just the logo plus some space.
  function region(o) {
    const p = PC.doc.panels[0], W = PC.px(p.w), H = PC.px(p.h);
    if (!o.trim) return { x: 0, y: 0, w: W, h: H };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    PC.canvas.getObjects().forEach((ob) => {
      if (ob.visible === false) return;
      const b = ob.getBoundingRect(true, true);
      x0 = Math.min(x0, b.left); y0 = Math.min(y0, b.top); x1 = Math.max(x1, b.left + b.width); y1 = Math.max(y1, b.top + b.height);
    });
    if (!isFinite(x0)) return { x: 0, y: 0, w: W, h: H };
    const pad = Math.max(x1 - x0, y1 - y0) * (o.pad / 100);
    let r = { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad };
    if (o.square) { const s = Math.max(r.w, r.h); r = { x: r.x - (s - r.w) / 2, y: r.y - (s - r.h) / 2, w: s, h: s }; }
    return r;
  }
  // Background for this export: null = see-through.
  const bgFor = (o) => (o.bg === 'clear' ? null : o.bg === 'white' ? '#ffffff' : o.bg === 'color' ? o.bgc : PC.doc.panels[0].bg || null);
  // Render the area at `width` pixels wide. The artboard is drawn big enough, then the area is cut out.
  async function raster(o, width) {
    PC.saveLive();
    const p = PC.doc.panels[0], r = region(o), k = width / r.w, keep = p.bg;
    const dpi = Math.min(DPI * k, DPI * (16000 / Math.max(PC.px(p.w), PC.px(p.h))));
    const kk = dpi / DPI;
    const keepPaint = p.paint; p.bg = null; if (o.bg && o.bg !== 'board') p.paint = null; // a patterned or picture background goes out only "as the artboard"
    let full;
    try { full = await PC.renderPanel(0, dpi); } finally { p.bg = keep; p.paint = keepPaint; }
    const out = document.createElement('canvas'); out.width = Math.max(1, Math.round(width)); out.height = Math.max(1, Math.round(r.h * k));
    const x = out.getContext('2d');
    const bg = bgFor(o) || (o.opaque ? '#ffffff' : null);
    if (bg) { x.fillStyle = bg; x.fillRect(0, 0, out.width, out.height); }
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    // shrink in halves for small sizes (16 px icons stay crisp, not jagged)
    let src = full, sx = r.x * kk, sy = r.y * kk, sw = r.w * kk, sh = r.h * kk;
    while (sw / 2 > out.width) {
      const c2 = document.createElement('canvas'); c2.width = Math.ceil(src.width / 2); c2.height = Math.ceil(src.height / 2);
      const x2 = c2.getContext('2d'); x2.imageSmoothingQuality = 'high'; x2.drawImage(src, 0, 0, c2.width, c2.height);
      src = c2; sx /= 2; sy /= 2; sw /= 2; sh /= 2;
    }
    x.drawImage(src, sx, sy, sw, sh, 0, 0, out.width, out.height);
    return { canvas: out, r };
  }
  async function svgText(o, width) {
    PC.saveLive();
    const p = PC.doc.panels[0], keep = p.bg, r = region(o);
    const keepPaint = p.paint; p.bg = null; if (o.bg && o.bg !== 'board') p.paint = null;
    let s; try { s = await PC.renderPanelSVG(0); } finally { p.bg = keep; p.paint = keepPaint; }
    const bg = bgFor(o), h = (r.h / r.w) * width;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${Math.round(width)}" height="${Math.round(h)}" viewBox="${r.x.toFixed(2)} ${r.y.toFixed(2)} ${r.w.toFixed(2)} ${r.h.toFixed(2)}">\n`
      + `<!-- Made with LogoCraft -->\n${bg ? `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${bg}"/>\n` : ''}${s.inner}\n</svg>\n`;
  }

  // ------------------------------------------------------------------ the Export dialog
  const FORMATS = {
    png: ['PNG', 'Sharp picture with a see-through background. Best for most uses: websites, documents, PressCraft and LabelCraft.'],
    jpg: ['JPG', 'Small photo-style file. No see-through: the background is filled in (white unless you choose).'],
    bmp: ['BMP', 'Plain Windows picture for older programs. No see-through.'],
    svg: ['SVG', 'Vector: stays sharp at any size, for printers, sign makers and cutters. (The retro look is not kept: it is made of dots.)'],
    pdf: ['PDF', 'A one-page PDF the size of the logo, for printers and print shops.'],
    ico: ['ICO', 'Website and Windows icon: 16, 32, 48, 64, 128 and 256 pixels in one file, made square.'],
  };
  const SIZES = [16, 32, 48, 64, 128, 256, 512, 1024, 1500, 2048, 3000, 4096];
  const MULTI = [16, 32, 64, 128, 256, 512, 1024, 2048];
  const o = { fmt: 'png', size: 1024, custom: 1500, multi: false, bg: 'board', bgc: '#ffffff', trim: true, pad: 4 };
  const segs = (id, list, val, on) => { $(id).innerHTML = list.map(([v, n]) => `<button type="button" class="btn" aria-pressed="${v === val}" data-v="${v}">${n}</button>`).join(''); $(id).onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) on(b.dataset.v); }; };
  function show() {
    const vec = o.fmt === 'svg', ico = o.fmt === 'ico', clearOk = ['png', 'svg', 'pdf', 'ico'].includes(o.fmt);
    if (!clearOk && o.bg === 'clear') o.bg = 'white';
    segs('ex-fmt', Object.entries(FORMATS).map(([k, f]) => [k, f[0]]), o.fmt, (v) => { o.fmt = v; show(); preview(); });
    $('ex-fmt-tip').textContent = FORMATS[o.fmt][1];
    $('ex-size-f').hidden = ico; $('ex-multi-f').hidden = vec || ico || o.fmt === 'pdf';
    $('ex-size').innerHTML = SIZES.map((s) => `<option value="${s}" ${s === o.size ? 'selected' : ''}>${s} pixels wide${PC.ARTBOARDS[PC.doc.board] && PC.ARTBOARDS[PC.doc.board][3] === s ? ' (the artboard)' : s === 1024 ? ' (good all-round)' : s === 32 ? ' (tiny icon)' : ''}</option>`).join('') + `<option value="custom" ${o.size === 'custom' ? 'selected' : ''}>Custom…</option>`;
    $('ex-size-f').querySelector('span').textContent = vec ? 'Width in pixels (it can be made any size later)' : o.fmt === 'pdf' ? 'Sharpness (pixels wide)' : 'Width in pixels';
    $('ex-custom-f').hidden = ico || o.size !== 'custom';
    $('ex-multi').checked = o.multi; $('ex-size').disabled = o.multi && !$('ex-multi-f').hidden;
    segs('ex-bg', [['board', 'As the artboard'], ...(clearOk ? [['clear', 'See-through']] : []), ['white', 'White'], ['color', 'Colour…']], o.bg, (v) => { o.bg = v; show(); preview(); });
    $('ex-bgc').hidden = o.bg !== 'color'; $('ex-bgc').value = o.bgc;
    $('ex-trim').checked = o.trim; $('ex-pad').value = o.pad; $('ex-pad-v').textContent = o.pad + '%'; $('ex-pad').disabled = !o.trim;
    const ext = o.multi && !$('ex-multi-f').hidden ? 'zip' : o.fmt;
    $('ex-go').textContent = `Export ${ext.toUpperCase()}`;
    $('ex-note').textContent = PC.doc.retro && vec ? 'The retro look is made of dots, so SVG saves the modern look. Use PNG to keep the dots.' : '';
  }
  let pv = 0;
  async function preview() {
    const n = ++pv;
    const { canvas: c, r } = await raster({ ...o, opaque: ['jpg', 'bmp'].includes(o.fmt), square: o.fmt === 'ico' }, 360);
    if (n !== pv) return;
    const width = o.fmt === 'ico' ? 256 : o.size === 'custom' ? +o.custom || 1500 : o.size;
    $('ex-prev').innerHTML = ''; c.style.cssText = 'max-width:100%;max-height:320px;display:block;margin:auto;box-shadow:0 0 0 1px #0002';
    $('ex-prev').append(c);
    const info = document.createElement('p'); info.className = 'hint'; info.style.textAlign = 'center';
    info.textContent = o.fmt === 'ico' ? 'Square icon, 16 to 256 pixels' : `${Math.round(width)} × ${Math.round((r.h / r.w) * width)} pixels · ${(r.w / DPI * 25.4).toFixed(0)} × ${(r.h / DPI * 25.4).toFixed(0)} mm at print size`;
    $('ex-prev').append(info);
  }
  $('ex-size').onchange = () => { o.size = $('ex-size').value === 'custom' ? 'custom' : +$('ex-size').value; show(); preview(); };
  $('ex-custom').onchange = () => { o.custom = Math.max(8, Math.min(8000, +$('ex-custom').value || 1500)); preview(); };
  $('ex-multi').onchange = () => { o.multi = $('ex-multi').checked; show(); };
  $('ex-bgc').onchange = () => { o.bgc = $('ex-bgc').value; preview(); };
  $('ex-trim').onchange = () => { o.trim = $('ex-trim').checked; show(); preview(); };
  $('ex-pad').oninput = () => { o.pad = +$('ex-pad').value; $('ex-pad-v').textContent = o.pad + '%'; };
  $('ex-pad').onchange = () => preview();
  $('ex-close').onclick = () => { $('exportdlg').hidden = true; };
  PC.openExport = function () {
    if (!PC.doc) return;
    $('ex-name').value = baseName();
    const pxb = PC.ARTBOARDS[PC.doc.board] && PC.ARTBOARDS[PC.doc.board][3];
    if (pxb && o.board !== PC.doc.board) { o.size = pxb; o.trim = false; } // a pixel artboard exports at its own size, whole
    o.board = PC.doc.board;
    const cur = document.documentElement.dataset.backdrop || 'checker';
    $('ex-backdrop').innerHTML = PC.ui.BACKDROPS.map(([k, n]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${n === 'No' ? 'None' : n}</option>`).join('');
    $('ex-backdrop').onchange = () => PC.ui.setBackdrop($('ex-backdrop').value);
    $('exportdlg').hidden = false; show(); preview();
  };
  async function oneFile(fmt, width, opt) {
    if (fmt === 'svg') return new Blob([await svgText(opt, width)], { type: 'image/svg+xml' });
    if (fmt === 'ico') {
      const pngs = [];
      for (const s of [16, 32, 48, 64, 128, 256]) { const { canvas } = await raster({ ...opt, square: true }, s); pngs.push({ size: s, bytes: await blobBytes(await canvasBlob(canvas, 'image/png')) }); }
      return makeICO(pngs);
    }
    const { canvas, r } = await raster({ ...opt, opaque: fmt === 'jpg' || fmt === 'bmp' }, width);
    if (fmt === 'png') return canvasBlob(canvas, 'image/png');
    if (fmt === 'jpg') return canvasBlob(canvas, 'image/jpeg', 0.92);
    if (fmt === 'bmp') return makeBMP(canvas);
    return makePDF(canvas, (r.w / DPI) * 25.4, (r.h / DPI) * 25.4);
  }
  PC.exportFile = oneFile; // used by the tests
  $('ex-go').onclick = async () => {
    const name = ($('ex-name').value || baseName()).replace(/[\\/:*?"<>|]+/g, '').trim() || 'logo';
    const btn = $('ex-go'); btn.disabled = true; const label = btn.textContent; btn.textContent = 'Working…';
    try {
      if (o.multi && !$('ex-multi-f').hidden) {
        const files = [];
        for (const s of MULTI) files.push({ name: `${name}-${s}px.${o.fmt}`, bytes: await blobBytes(await oneFile(o.fmt, s, o)) });
        download(makeZip(files), `${name}.zip`);
      } else {
        const width = o.size === 'custom' ? +o.custom || 1500 : o.size;
        download(await oneFile(o.fmt, width, o), `${name}.${o.fmt}`);
      }
      PC.ui.toast && PC.ui.toast('Exported. Look in your Downloads folder.');
    } catch (e) { alert('Sorry, the export did not work: ' + e.message); } finally { btn.disabled = false; btn.textContent = label; }
  };
  $('exportdlg').addEventListener('keydown', (e) => { if (e.key === 'Escape') $('exportdlg').hidden = true; });

  // ------------------------------------------------------------------ print: the logo at its real size on one page
  PC.openPrintLogo = async function () {
    if (!PC.doc) return;
    const { canvas, r } = await raster({ trim: false, pad: 0, bg: 'board' }, Math.min(6000, (r0().w / DPI) * 300));
    const wMM = (r.w / DPI) * 25.4, hMM = (r.h / DPI) * 25.4, url = canvas.toDataURL('image/png');
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;width:0;height:0;border:0;left:-9999px';
    document.body.append(f);
    f.srcdoc = `<!doctype html><html><head><title>${baseName()}</title><style>@page{margin:15mm}body{margin:0;display:flex;justify-content:center}img{width:${wMM}mm;height:${hMM}mm;max-width:100%;object-fit:contain}</style></head><body><img src="${url}"></body></html>`;
    f.onload = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 60000); };
  };
  const r0 = () => region({ trim: false });
  PC.output = { makeZip, makeBMP, makeICO, makePDF };
})();
