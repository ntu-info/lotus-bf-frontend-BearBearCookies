// Display settings: x>0 appears on right side of screen
const X_RIGHT_ON_SCREEN_RIGHT = true;

import { useEffect, useMemo, useRef, useState } from 'react';
import * as nifti from 'nifti-reader-js';
import { API_BASE } from '../api';

const MNI_BG_URL = 'static/mni_2mm.nii.gz';

function isStandardMNI2mm(dims, voxelMM) {
  const okDims = Array.isArray(dims) && dims[0] === 91 && dims[1] === 109 && dims[2] === 91;
  const okSp = voxelMM && Math.abs(voxelMM[0] - 2) < 1e-3 && Math.abs(voxelMM[1] - 2) < 1e-3 && Math.abs(voxelMM[2] - 2) < 1e-3;
  return okDims && okSp;
}

const MNI2MM = { x0: 90, y0: -126, z0: -72, vx: 2, vy: 2, vz: 2 };

export function NiiViewer({ query, bookmarks = [], onRemoveBookmark }) {
  const [loadingBG, setLoadingBG] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [errBG, setErrBG] = useState('');
  const [errMap, setErrMap] = useState('');
  const [activeTab, setActiveTab] = useState('viewer');

  // Backend params
  const [voxel, setVoxel] = useState(2.0);
  const [fwhm, setFwhm] = useState(10.0);
  const [kernel, setKernel] = useState('gauss');
  const [r, setR] = useState(6.0);

  // Overlay controls
  const [overlayAlpha, setOverlayAlpha] = useState(0.5);
  const [posOnly, setPosOnly] = useState(true);
  const [useAbs, setUseAbs] = useState(false);
  const [thrMode, setThrMode] = useState('pctl');
  const [pctl, setPctl] = useState(95);
  const [thrValue, setThrValue] = useState(0);

  // Bookmark sorting
  const [bookmarkSort, setBookmarkSort] = useState('time'); // 'time', 'journal', 'year'

  // Volumes
  const bgRef = useRef(null);
  const mapRef = useRef(null);
  const getVoxelMM = () => {
    const vm = bgRef.current?.voxelMM ?? mapRef.current?.voxelMM ?? [1, 1, 1];
    return { x: vm[0], y: vm[1], z: vm[2] };
  };
  const [dims, setDims] = useState([0, 0, 0]);

  // Slice indices
  const [ix, setIx] = useState(0);
  const [iy, setIy] = useState(0);
  const [iz, setIz] = useState(0);

  // Displayed coords
  const [cx, setCx] = useState('0');
  const [cy, setCy] = useState('0');
  const [cz, setCz] = useState('0');

  const canvases = [useRef(null), useRef(null), useRef(null)];

  const mapUrl = useMemo(() => {
    if (!query) return '';
    const u = new URL(`${API_BASE}/query/${encodeURIComponent(query)}/nii`);
    u.searchParams.set('voxel', String(voxel));
    u.searchParams.set('fwhm', String(fwhm));
    u.searchParams.set('kernel', String(kernel));
    u.searchParams.set('r', String(r));
    return u.toString();
  }, [query, voxel, fwhm, kernel, r]);

  // Utils - keeping all original implementation
  function asTypedArray(header, buffer) {
    switch (header.datatypeCode) {
      case nifti.NIFTI1.TYPE_INT8: return new Int8Array(buffer);
      case nifti.NIFTI1.TYPE_UINT8: return new Uint8Array(buffer);
      case nifti.NIFTI1.TYPE_INT16: return new Int16Array(buffer);
      case nifti.NIFTI1.TYPE_UINT16: return new Uint16Array(buffer);
      case nifti.NIFTI1.TYPE_INT32: return new Int32Array(buffer);
      case nifti.NIFTI1.TYPE_UINT32: return new Uint32Array(buffer);
      case nifti.NIFTI1.TYPE_FLOAT32: return new Float32Array(buffer);
      case nifti.NIFTI1.TYPE_FLOAT64: return new Float64Array(buffer);
      default: return new Float32Array(buffer);
    }
  }

  function minmax(arr) {
    let mn = Infinity, mx = -Infinity;
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    return [mn, mx];
  }

  function percentile(arr, p, step = Math.ceil(arr.length / 200000)) {
    if (!arr.length) return 0;
    const samp = [];
    for (let i = 0; i < arr.length; i += step) samp.push(arr[i]);
    samp.sort((a, b) => a - b);
    const k = Math.floor((p / 100) * (samp.length - 1));
    return samp[Math.max(0, Math.min(samp.length - 1, k))];
  }

  async function loadNifti(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`GET ${url} → ${res.status} ${t}`);
    }
    let ab = await res.arrayBuffer();
    if (nifti.isCompressed(ab)) ab = nifti.decompress(ab);
    if (!nifti.isNIFTI(ab)) throw new Error('not a NIfTI file');
    const header = nifti.readHeader(ab);
    const image = nifti.readImage(header, ab);
    const ta = asTypedArray(header, image);
    let f32;
    if (ta instanceof Float32Array) f32 = ta;
    else if (ta instanceof Float64Array) f32 = Float32Array.from(ta);
    else {
      const [mn, mx] = minmax(ta);
      const range = (mx - mn) || 1;
      f32 = new Float32Array(ta.length);
      for (let i = 0; i < ta.length; i++) f32[i] = (ta[i] - mn) / range;
    }
    const nx = header.dims[1] | 0;
    const ny = header.dims[2] | 0;
    const nz = header.dims[3] | 0;
    if (!nx || !ny || !nz) throw new Error('invalid dims');
    const [mn, mx] = minmax(f32);
    const vx = Math.abs(header.pixDims?.[1] ?? 1);
    const vy = Math.abs(header.pixDims?.[2] ?? 1);
    const vz = Math.abs(header.pixDims?.[3] ?? 1);
    return { data: f32, dims: [nx, ny, nz], voxelMM: [vx, vy, vz], min: mn, max: mx };
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  const AXIS_SIGN = { x: -1, y: 1, z: 1 };
  
  const idx2coord = (i, n, axis) => {
    const [nx, ny, nz] = dims;
    const { x: vx, y: vy, z: vz } = getVoxelMM();
    const isStd = isStandardMNI2mm([nx, ny, nz], [vx, vy, vz]);
    if (isStd) {
      if (axis === 'x') return (-MNI2MM.vx * i + MNI2MM.x0);
      if (axis === 'y') return (MNI2MM.vy * i + MNI2MM.y0);
      if (axis === 'z') return (MNI2MM.vz * i + MNI2MM.z0);
    }
    const mmPerVoxel = axis === 'x' ? vx : axis === 'y' ? vy : vz;
    return AXIS_SIGN[axis] * (i - Math.floor(n / 2)) * mmPerVoxel;
  };

  const coord2idx = (c_mm, n, axis) => {
    const [nx, ny, nz] = dims;
    const { x: vx, y: vy, z: vz } = getVoxelMM();
    const isStd = isStandardMNI2mm([nx, ny, nz], [vx, vy, vz]);
    if (isStd) {
      let v;
      if (axis === 'x') v = ((MNI2MM.x0 - c_mm) / MNI2MM.vx);
      else if (axis === 'y') v = ((c_mm - MNI2MM.y0) / MNI2MM.vy);
      else v = ((c_mm - MNI2MM.z0) / MNI2MM.vz);
      const idx = Math.round(v);
      return Math.max(0, Math.min(n - 1, idx));
    }
    const mmPerVoxel = axis === 'x' ? vx : axis === 'y' ? vy : vz;
    const sign = AXIS_SIGN[axis];
    const v = (sign * (c_mm / mmPerVoxel)) + Math.floor(n / 2);
    const idx = Math.round(v);
    return Math.max(0, Math.min(n - 1, idx));
  };

  // Load background on mount
  useEffect(() => {
    let alive = true;
    setLoadingBG(true);
    setErrBG('');
    (async () => {
      try {
        const bg = await loadNifti(MNI_BG_URL);
        if (!alive) return;
        bgRef.current = bg;
        setDims(bg.dims);
        const [nx, ny, nz] = bg.dims;
        const mx = Math.floor(nx / 2), my = Math.floor(ny / 2), mz = Math.floor(nz / 2);
        setIx(mx); setIy(my); setIz(mz);
        setCx('0'); setCy('0'); setCz('0');
      } catch (e) {
        if (!alive) return;
        setErrBG(e?.message || String(e));
        bgRef.current = null;
      } finally {
        if (!alive) return;
        setLoadingBG(false);
      }
    })();
    return () => { alive = false };
  }, []);

  // Load map when query changes
  useEffect(() => {
    if (!mapUrl) { mapRef.current = null; return; }
    let alive = true;
    setLoadingMap(true);
    setErrMap('');
    (async () => {
      try {
        const mv = await loadNifti(mapUrl);
        if (!alive) return;
        mapRef.current = mv;
        if (!bgRef.current) {
          setDims(mv.dims);
          const [nx, ny, nz] = mv.dims;
          const mx = Math.floor(nx / 2), my = Math.floor(ny / 2), mz = Math.floor(nz / 2);
          setIx(mx); setIy(my); setIz(mz);
          setCx('0'); setCy('0'); setCz('0');
        }
      } catch (e) {
        if (!alive) return;
        setErrMap(e?.message || String(e));
        mapRef.current = null;
      } finally {
        if (!alive) return;
        setLoadingMap(false);
      }
    })();
    return () => { alive = false };
  }, [mapUrl]);

  const mapThreshold = useMemo(() => {
    const mv = mapRef.current;
    if (!mv) return null;
    if (thrMode === 'value') return Number(thrValue) || 0;
    return percentile(mv.data, Math.max(0, Math.min(100, Number(pctl) || 95)));
  }, [thrMode, thrValue, pctl, mapRef.current]);

  // Drawing function - NO MODIFICATIONS to preserve quality
  function drawSlice(canvas, axis, index) {
    const [nx, ny, nz] = dims;
    const sx = (x) => (X_RIGHT_ON_SCREEN_RIGHT ? (nx - 1 - x) : x);
    const bg = bgRef.current;
    const map = mapRef.current;
    const dimsStr = dims.join('x');
    const bgOK = !!(bg && bg.dims.join('x') === dimsStr);
    const mapOK = !!(map && map.dims.join('x') === dimsStr);

    let w = 0, h = 0, getBG = null, getMap = null;
    if (axis === 'z') { w = nx; h = ny; if (bgOK) getBG = (x, y) => bg.data[sx(x) + y * nx + index * nx * ny]; if (mapOK) getMap = (x, y) => map.data[sx(x) + y * nx + index * nx * ny]; }
    if (axis === 'y') { w = nx; h = nz; if (bgOK) getBG = (x, y) => bg.data[sx(x) + index * nx + y * nx * ny]; if (mapOK) getMap = (x, y) => map.data[sx(x) + index * nx + y * nx * ny]; }
    if (axis === 'x') { w = ny; h = nz; if (bgOK) getBG = (x, y) => bg.data[index + x * nx + y * nx * ny]; if (mapOK) getMap = (x, y) => map.data[index + x * nx + y * nx * ny]; }

    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    const img = ctx.createImageData(w, h);
    const alpha = Math.max(0, Math.min(1, overlayAlpha));
    const R = 255, G = 0, B = 0;
    const thr = mapThreshold;
    const bgMin = bg?.min ?? 0;
    const bgMax = bg?.max ?? 1;
    const bgRange = (bgMax - bgMin) || 1;

    let p = 0;
    for (let yy = 0; yy < h; yy++) {
      const srcY = h - 1 - yy;
      for (let xx = 0; xx < w; xx++) {
        let gray = 0;
        if (getBG) {
          const vbg = getBG(xx, srcY);
          let g = (vbg - bgMin) / bgRange;
          if (g < 0) g = 0;
          if (g > 1) g = 1;
          gray = (g * 255) | 0;
        }
        img.data[p] = gray;
        img.data[p + 1] = gray;
        img.data[p + 2] = gray;
        img.data[p + 3] = 255;

        if (getMap) {
          let mv = getMap(xx, srcY);
          const raw = mv;
          if (useAbs) mv = Math.abs(mv);
          let pass = (thr == null) ? (mv > 0) : (mv >= thr);
          if (posOnly && raw <= 0) pass = false;
          if (pass) {
            img.data[p] = ((1 - alpha) * img.data[p] + alpha * R) | 0;
            img.data[p + 1] = ((1 - alpha) * img.data[p + 1] + alpha * G) | 0;
            img.data[p + 2] = ((1 - alpha) * img.data[p + 2] + alpha * B) | 0;
          }
        }
        p += 4;
      }
    }
    ctx.putImageData(img, 0, 0);

    ctx.save();
    ctx.strokeStyle = '#7c9d7c';
    ctx.lineWidth = 1.5;
    let cx = 0, cy = 0;
    if (axis === 'z') {
      cx = Math.max(0, Math.min(w - 1, (X_RIGHT_ON_SCREEN_RIGHT ? (w - 1 - ix) : ix)));
      cy = Math.max(0, Math.min(h - 1, iy));
    } else if (axis === 'y') {
      cx = Math.max(0, Math.min(w - 1, (X_RIGHT_ON_SCREEN_RIGHT ? (w - 1 - ix) : ix)));
      cy = Math.max(0, Math.min(h - 1, iz));
    } else {
      cx = Math.max(0, Math.min(w - 1, iy));
      cy = Math.max(0, Math.min(h - 1, iz));
    }
    const screenY = h - 1 - cy;
    ctx.beginPath(); ctx.moveTo(cx + 0.5, 0); ctx.lineTo(cx + 0.5, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, screenY + 0.5); ctx.lineTo(w, screenY + 0.5); ctx.stroke();
    ctx.restore();
  }

  function onCanvasClick(e, axis) {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * canvas.width / rect.width);
    const y = Math.floor((e.clientY - rect.top) * canvas.height / rect.height);
    const srcY = canvas.height - 1 - y;
    const [nx, ny, nz] = dims;
    const toIdxX = (screenX) => (X_RIGHT_ON_SCREEN_RIGHT ? (nx - 1 - screenX) : screenX);
    if (axis === 'z') { const xi = toIdxX(x); setIx(xi); setIy(srcY); setCx(String(idx2coord(xi, nx, 'x'))); setCy(String(idx2coord(srcY, ny, 'y'))); }
    else if (axis === 'y') { const xi = toIdxX(x); setIx(xi); setIz(srcY); setCx(String(idx2coord(xi, nx, 'x'))); setCz(String(idx2coord(srcY, nz, 'z'))); }
    else { setIy(x); setIz(srcY); setCy(String(idx2coord(x, ny, 'y'))); setCz(String(idx2coord(srcY, nz, 'z'))); }
  }

  useEffect(() => {
    const [nx, ny, nz] = dims;
    if (!nx) return;
    setCx(String(idx2coord(ix, nx, 'x')));
    setCy(String(idx2coord(iy, ny, 'y')));
    setCz(String(idx2coord(iz, nz, 'z')));
  }, [ix, iy, iz, dims]);

  const commitCoord = (axis) => {
    const [nx, ny, nz] = dims;
    let vStr = axis === 'x' ? cx : axis === 'y' ? cy : cz;
    if (vStr === '' || vStr === '-') return;
    const parsed = parseFloat(vStr);
    if (Number.isNaN(parsed)) return;
    if (axis === 'x') setIx(coord2idx(parsed, nx, 'x'));
    if (axis === 'y') setIy(coord2idx(parsed, ny, 'y'));
    if (axis === 'z') setIz(coord2idx(parsed, nz, 'z'));
  };

  useEffect(() => {
    const [nx, ny, nz] = dims;
    if (!nx) return;
    const c0 = canvases[0].current, c1 = canvases[1].current, c2 = canvases[2].current;
    if (c0 && iz >= 0 && iz < nz) drawSlice(c0, 'z', iz);
    if (c1 && iy >= 0 && iy < ny) drawSlice(c1, 'y', iy);
    if (c2 && ix >= 0 && ix < nx) drawSlice(c2, 'x', ix);
  }, [dims, ix, iy, iz, overlayAlpha, posOnly, useAbs, thrMode, pctl, thrValue, loadingBG, loadingMap, errBG, errMap, query]);

  const [nx, ny, nz] = dims;
  const sliceConfigs = [
    { key: 'y', name: 'Coronal', canvasRef: canvases[1] },
    { key: 'x', name: 'Sagittal', canvasRef: canvases[2] },
    { key: 'z', name: 'Axial', canvasRef: canvases[0] },
  ];

  // Sort bookmarks
  const sortedBookmarks = useMemo(() => {
    const sorted = [...bookmarks];
    if (bookmarkSort === 'time') {
      sorted.sort((a, b) => (b.bookmarkedAt || 0) - (a.bookmarkedAt || 0));
    } else if (bookmarkSort === 'journal') {
      sorted.sort((a, b) => String(a.journal || '').localeCompare(String(b.journal || '')));
    } else if (bookmarkSort === 'year') {
      sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    return sorted;
  }, [bookmarks, bookmarkSort]);

  const nsInputCls = 'nii__coord-input';

  return (
    <div className="nii-viewer">
      <style>{`
        .nii-viewer {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .nii__tabs {
          display: flex;
          gap: 6px;
          border-bottom: 2px solid var(--border-light);
        }

        .nii__tab {
          padding: 10px 18px;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          color: var(--text-secondary);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 13px;
        }

        .nii__tab:hover {
          color: var(--matcha-primary);
          background: rgba(124, 157, 124, 0.05);
        }

        .nii__tab--active {
          color: var(--matcha-primary-dark);
          border-bottom-color: var(--matcha-primary);
        }

        .nii__slices {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .nii__slice {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nii__slice-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-align: center;
        }

        .nii__canvas {
          width: 100%;
          aspect-ratio: 1;
          border-radius: 10px;
          border: 2px solid var(--border-light);
          background: #f8f8f8;
          cursor: crosshair;
          transition: border-color 0.2s ease;
          image-rendering: pixelated;
        }

        .nii__canvas:hover {
          border-color: var(--matcha-primary-light);
        }

        .nii__panel {
          padding: 16px;
          background: var(--bg-cream);
          border-radius: 10px;
          border: 1px solid var(--border-light);
        }

        .nii__controls {
          display: grid;
          gap: 16px;
        }

        .nii__control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .nii__label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .nii__coords {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .nii__coord {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nii__coord-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          min-width: 45px;
        }

        .nii__coord-input {
          width: 70px;
          padding: 6px 10px;
          border: 1.5px solid var(--border-medium);
          border-radius: 8px;
          font-size: 13px;
          text-align: center;
          font-family: var(--font-mono);
          background: var(--bg-white);
          color: var(--text-primary);
        }

        .nii__coord-input:focus {
          outline: none;
          border-color: var(--matcha-primary);
          box-shadow: 0 0 0 2px rgba(124, 157, 124, 0.1);
        }

        .nii__bookmarks {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nii__bookmark-header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          margin-bottom: 8px;
        }

        .nii__bookmark-sort {
          padding: 6px 12px;
          border: 1.5px solid var(--border-medium);
          border-radius: 8px;
          font-size: 12px;
          background: var(--bg-white);
          color: var(--text-primary);
          cursor: pointer;
        }

        .nii__bookmark-item {
          padding: 16px;
          background: var(--bg-white);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          transition: all 0.2s ease;
          position: relative;
        }

        .nii__bookmark-item:hover {
          border-color: var(--matcha-primary-light);
          box-shadow: 0 2px 8px rgba(124, 157, 124, 0.1);
        }

        .nii__bookmark-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .nii__bookmark-year {
          font-size: 11px;
          color: var(--text-muted);
          font-style: italic;
          font-weight: 400;
        }

        .nii__bookmark-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.4;
          padding-right: 50px;
        }

        .nii__bookmark-meta {
          font-size: 12px;
          color: var(--text-secondary);
          display: grid;
          gap: 4px;
          line-height: 1.5;
        }

        .nii__bookmark-meta-row {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 8px;
        }

        .nii__bookmark-meta-label {
          font-weight: 600;
          color: var(--text-primary);
        }

        .nii__bookmark-meta-value {
          color: var(--text-secondary);
        }

        .nii__bookmark-actions {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .nii__bookmark-link {
          font-size: 12px;
          color: var(--matcha-primary);
          text-decoration: none;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .nii__bookmark-link:hover {
          background: rgba(124, 157, 124, 0.1);
        }

        .nii__bookmark-remove {
          padding: 4px 10px;
          background: transparent;
          border: 1px solid var(--border-medium);
          color: var(--text-muted);
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-left: auto;
        }

        .nii__bookmark-remove:hover {
          background: var(--error);
          color: white;
          border-color: var(--error);
        }

        .nii__empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .nii__empty-icon {
          font-size: 36px;
          margin-bottom: 8px;
          opacity: 0.5;
        }

        @media (max-width: 1024px) {
          .nii__slices {
            grid-template-columns: 1fr;
          }

          .nii__coords {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>

      <div className="nii__tabs">
        <button
          className={`nii__tab ${activeTab === 'viewer' ? 'nii__tab--active' : ''}`}
          onClick={() => setActiveTab('viewer')}
        >
          Brain Viewer
        </button>
        <button
          className={`nii__tab ${activeTab === 'bookmarks' ? 'nii__tab--active' : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          Bookmarks ({bookmarks.length})
        </button>
      </div>

      {activeTab === 'viewer' && (
        <>
          {(loadingBG || loadingMap) && (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-base)',
              fontStyle: 'italic'
            }}>
              Loading brain data...
            </div>
          )}

          {(errBG || errMap) && (
            <div className="alert alert--error">
              {errBG && <div>Background: {errBG}</div>}
              {errMap && <div>Map: {errMap}</div>}
            </div>
          )}

          {!!nx && (
            <>
              {/* Brain slices */}
              <div className="nii__slices">
                {sliceConfigs.map(({ key, name, canvasRef }) => (
                  <div key={key} className="nii__slice">
                    <div className="nii__slice-label">{name}</div>
                    <canvas
                      ref={canvasRef}
                      className="nii__canvas"
                      onClick={(e) => onCanvasClick(e, key)}
                    />
                  </div>
                ))}
              </div>

              {/* Controls below images */}
              <div className="nii__panel">
                <div className="nii__controls">
                  <div className="nii__control-group">
                    <div className="nii__label">MNI Coordinates (mm)</div>
                    <div className="nii__coords">
                      {[
                        { axis: 'x', label: 'X (L/R)', value: cx, setter: setCx },
                        { axis: 'y', label: 'Y (P/A)', value: cy, setter: setCy },
                        { axis: 'z', label: 'Z (I/S)', value: cz, setter: setCz },
                      ].map(({ axis, label, value, setter }) => (
                        <div key={axis} className="nii__coord">
                          <span className="nii__coord-label">{label}:</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={nsInputCls}
                            value={value}
                            onChange={(e) => setter(e.target.value)}
                            onBlur={() => commitCoord(axis)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitCoord(axis); }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="nii__control-group">
                    <div className="nii__label">Threshold Mode</div>
                    <select
                      value={thrMode}
                      onChange={(e) => setThrMode(e.target.value)}
                      style={{ maxWidth: '200px' }}
                    >
                      <option value="value">Value</option>
                      <option value="pctl">Percentile</option>
                    </select>
                  </div>

                  {thrMode === 'pctl' && (
                    <div className="nii__control-group">
                      <div className="nii__label">Percentile: {pctl}%</div>
                      <input
                        type="range"
                        min={50}
                        max={99.9}
                        step={0.5}
                        value={pctl}
                        onChange={(e) => setPctl(Number(e.target.value))}
                      />
                    </div>
                  )}

                  <div className="nii__control-group">
                    <div className="nii__label">Overlay Alpha: {(overlayAlpha * 100).toFixed(0)}%</div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={overlayAlpha}
                      onChange={(e) => setOverlayAlpha(Number(e.target.value))}
                    />
                  </div>

                  <div className="nii__control-group">
                    <div className="nii__label">FWHM: {fwhm}mm</div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={0.5}
                      value={fwhm}
                      onChange={(e) => setFwhm(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {query && (
                <div>
                  <a
                    href={mapUrl}
                    download
                    className="btn"
                    style={{ width: '100%', textAlign: 'center', textDecoration: 'none', display: 'block' }}
                  >
                    Download Map
                  </a>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'bookmarks' && (
        <div className="nii__panel">
          {bookmarks.length === 0 ? (
            <div className="nii__empty">
              <div className="nii__empty-icon">★</div>
              <p>No bookmarks yet</p>
              <p style={{ fontSize: '12px', marginTop: '8px' }}>
                Click the star icon next to studies to bookmark them
              </p>
            </div>
          ) : (
            <>
              <div className="nii__bookmark-header">
                <select
                  className="nii__bookmark-sort"
                  value={bookmarkSort}
                  onChange={(e) => setBookmarkSort(e.target.value)}
                >
                  <option value="time">Sort by Added Time</option>
                  <option value="year">Sort by Published Year</option>
                  <option value="journal">Sort by Journal</option>
                </select>
              </div>

              <div className="nii__bookmarks">
                {sortedBookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="nii__bookmark-item">
                    <div className="nii__bookmark-header-row">
                      <div className="nii__bookmark-title">{bookmark.title || 'Untitled Study'}</div>
                      <div className="nii__bookmark-year">{bookmark.year || 'N/A'}</div>
                    </div>
                    
                    <div className="nii__bookmark-meta">
                      {bookmark.journal && (
                        <div className="nii__bookmark-meta-row">
                          <span className="nii__bookmark-meta-label">Journal:</span>
                          <span className="nii__bookmark-meta-value">{bookmark.journal}</span>
                        </div>
                      )}
                      {bookmark.authors && (
                        <div className="nii__bookmark-meta-row">
                          <span className="nii__bookmark-meta-label">Authors:</span>
                          <span className="nii__bookmark-meta-value">{bookmark.authors}</span>
                        </div>
                      )}
                    </div>

                    <div className="nii__bookmark-actions">
                      {bookmark.pmid && (
                        <a
                          href={`https://pubmed.ncbi.nlm.nih.gov/${bookmark.pmid}/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="nii__bookmark-link"
                        >
                          View on PubMed →
                        </a>
                      )}
                      {onRemoveBookmark && (
                        <button
                          onClick={() => onRemoveBookmark(bookmark.id)}
                          className="nii__bookmark-remove"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}