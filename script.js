document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ---
    const imageUpload = document.getElementById('imageUpload');
    const uploadArea = document.getElementById('uploadArea');
    const editorArea = document.getElementById('editorArea');
    const imageCanvas = document.getElementById('imageCanvas');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const canvasStack = document.getElementById('canvasStack');
    const canvasContainer = document.getElementById('canvasContainer');
    const ctx = imageCanvas.getContext('2d', { willReadFrequently: true });
    const overlayCtx = overlayCanvas.getContext('2d');
    const selectedColorDisplay = document.getElementById('selectedColorDisplay');
    const selectedColorHex = document.getElementById('selectedColorHex');
    const replacementColorHex = document.getElementById('replacementColorHex');
    const replaceColorBtn = document.getElementById('replaceColorBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const addToPaletteBtn = document.getElementById('addToPaletteBtn');
    const themeToggle = document.getElementById('checkbox');
    const colorPickerModal = document.getElementById('colorPickerModal');
    const replacementColorDisplay = document.getElementById('replacementColorDisplay');
    const colorPreviewLarge = document.getElementById('colorPreviewLarge');
    const colorSpectrum = document.getElementById('colorSpectrum');
    const colorSpectrumSelector = document.getElementById('colorSpectrumSelector');
    const svSquare = document.getElementById('svSquare');
    const svCursor = document.getElementById('svCursor');
    const redInput = document.getElementById('redInput');
    const greenInput = document.getElementById('greenInput');
    const blueInput = document.getElementById('blueInput');
    const hexInput = document.getElementById('hexInput');
    const closeColorPicker = document.getElementById('closeColorPicker');
    const savedColorsPanel = document.getElementById('savedColorsPanel');
    const saveColorBtn = document.getElementById('saveColorBtn');
    const applyColorBtn = document.getElementById('applyColorBtn');
    const quickPresets = document.getElementById('quickPresets');
    const sidebar = document.getElementById('sidebar');
    const workspace = document.querySelector('.workspace');
    const toleranceSlider = document.getElementById('toleranceSlider');
    const toleranceValue = document.getElementById('toleranceValue');
    const undoBtn = document.getElementById('undoBtn');
    const connectedToggle = document.getElementById('connectedToggle');
    const showMaskToggle = document.getElementById('showMaskToggle');
    const formatSelect = document.getElementById('formatSelect');
    const zoomDisplay = document.getElementById('zoomDisplay');
    const dimensionsDisplay = document.getElementById('dimensionsDisplay');

    // --- State ---
    let originalImage = null;
    let originalImageData = null; // pristine copy for compare + reset
    let sourceFormat = 'png';
    let selectedColor = null;
    let selectedPoint = null; // {x,y} on image
    let tolerance = 15;
    let scale = 1;
    let isDragging = false;
    let didDrag = false;
    let dragStart = { x: 0, y: 0 };
    let viewPosition = { x: 0, y: 0 };
    let historyStack = [];
    const maxHistorySize = 10;
    let maskUpdatePending = false;
    let isComparing = false; // spacebar held

    editorArea.style.display = 'none';

    let savedColorItems = JSON.parse(localStorage.getItem('savedColors')) || [];
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.checked = currentTheme === 'dark';

    updateSavedColors();

    // --- Theme ---
    themeToggle.addEventListener('change', function () {
        const theme = this.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // --- Drag-and-drop ---
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files[0]);
    });

    imageUpload.addEventListener('change', (e) => {
        if (e.target.files.length) handleImageUpload(e.target.files[0]);
    });

    function handleImageUpload(file) {
        if (!file) return;
        const accepted = ['image/png', 'image/jpeg', 'image/webp'];
        if (!accepted.includes(file.type)) {
            alert('Please select a PNG, JPG, or WebP file.');
            return;
        }
        sourceFormat = file.type === 'image/jpeg' ? 'jpg' : (file.type === 'image/webp' ? 'webp' : 'png');

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                clearHistory();
                imageCanvas.width = img.width;
                imageCanvas.height = img.height;
                overlayCanvas.width = img.width;
                overlayCanvas.height = img.height;

                ctx.drawImage(img, 0, 0);
                clearOverlay();

                originalImage = new Image();
                originalImage.src = img.src;
                originalImageData = ctx.getImageData(0, 0, img.width, img.height);

                uploadArea.style.display = 'none';
                editorArea.style.display = 'flex';
                sidebar.style.display = 'flex';
                editorArea.classList.add('fade-in');

                addZoomControls();
                setupCanvasInteraction();
                resetBtn.disabled = false;
                downloadBtn.disabled = false;
                imageCanvas.style.cursor = 'crosshair';

                dimensionsDisplay.textContent = `${img.width} × ${img.height}`;
                centerImage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    function centerImage() {
        if (!imageCanvas || !canvasContainer) return;
        const cw = canvasContainer.clientWidth;
        const ch = canvasContainer.clientHeight;
        const iw = imageCanvas.width;
        const ih = imageCanvas.height;
        scale = Math.min(cw / iw, ch / ih, 1);
        viewPosition.x = (cw - iw * scale) / 2;
        viewPosition.y = (ch - ih * scale) / 2;
        applyTransform();
    }

    function addZoomControls() {
        if (document.querySelector('.zoom-controls')) return;
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        const mk = (icon, label, handler) => {
            const b = document.createElement('button');
            b.className = 'zoom-btn';
            b.innerHTML = `<i class="fas ${icon}"></i>`;
            b.setAttribute('aria-label', label);
            b.addEventListener('click', handler);
            return b;
        };
        zoomControls.appendChild(mk('fa-plus', 'Zoom in', () => { scale *= 1.2; applyTransform(); }));
        zoomControls.appendChild(mk('fa-minus', 'Zoom out', () => { scale = Math.max(0.05, scale / 1.2); applyTransform(); }));
        zoomControls.appendChild(mk('fa-expand', 'Fit', () => centerImage()));
        editorArea.appendChild(zoomControls);
    }

    function setupCanvasInteraction() {
        canvasContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = canvasContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = scale * zoomFactor;
            if (newScale >= 0.05 && newScale <= 20) {
                viewPosition.x = mouseX - (mouseX - viewPosition.x) * zoomFactor;
                viewPosition.y = mouseY - (mouseY - viewPosition.y) * zoomFactor;
                scale = newScale;
                applyTransform();
            }
        }, { passive: false });

        canvasContainer.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                isDragging = true;
                didDrag = false;
                dragStart.x = e.clientX - viewPosition.x;
                dragStart.y = e.clientY - viewPosition.y;
            }
        });

        canvasContainer.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const nx = e.clientX - dragStart.x;
                const ny = e.clientY - dragStart.y;
                if (Math.hypot(nx - viewPosition.x, ny - viewPosition.y) > 3) didDrag = true;
                if (didDrag) {
                    canvasContainer.style.cursor = 'grabbing';
                    viewPosition.x = nx;
                    viewPosition.y = ny;
                    applyTransform();
                }
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                canvasContainer.style.cursor = '';
            }
        });

        canvasContainer.addEventListener('dblclick', () => centerImage());
    }

    function applyTransform() {
        canvasStack.style.transform = `translate(${viewPosition.x}px, ${viewPosition.y}px) scale(${scale})`;
        zoomDisplay.textContent = `${Math.round(scale * 100)}%`;
    }

    // --- Pick color from image ---
    imageCanvas.addEventListener('click', (e) => {
        if (!originalImage || didDrag) return;
        const rect = imageCanvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / scale);
        const y = Math.floor((e.clientY - rect.top) / scale);
        if (x < 0 || x >= imageCanvas.width || y < 0 || y >= imageCanvas.height) return;

        // Clicking a transparent pixel deselects rather than picking phantom black.
        const px = ctx.getImageData(x, y, 1, 1).data;
        if (px[3] < 8) { deselectColor(); return; }

        // Sample a 3x3 area average (more robust against anti-aliased edges)
        const sample = sampleAverageColor(x, y, 1);
        selectedColor = { r: sample.r, g: sample.g, b: sample.b, a: 255 };
        selectedPoint = { x, y };

        const hexColor = rgbToHex(selectedColor.r, selectedColor.g, selectedColor.b);
        selectedColorDisplay.style.backgroundColor = hexColor;
        selectedColorHex.textContent = hexColor;
        replaceColorBtn.disabled = false;
        addToPaletteBtn.disabled = false;

        announceToScreenReader(`Selected color ${hexColor}`);
        scheduleMaskUpdate();
    });

    // Click outside the image (on the workspace background) deselects.
    canvasContainer.addEventListener('click', (e) => {
        if (didDrag) return;
        if (e.target === imageCanvas) return;
        if (selectedColor) deselectColor();
    });

    function deselectColor() {
        if (!selectedColor) return;
        selectedColor = null;
        selectedPoint = null;
        selectedColorDisplay.style.backgroundColor = '';
        selectedColorHex.textContent = '—';
        replaceColorBtn.disabled = true;
        addToPaletteBtn.disabled = true;
        clearOverlay();
        announceToScreenReader('Selection cleared');
    }

    function sampleAverageColor(x, y, radius) {
        const w = imageCanvas.width;
        const h = imageCanvas.height;
        const x0 = Math.max(0, x - radius);
        const y0 = Math.max(0, y - radius);
        const x1 = Math.min(w - 1, x + radius);
        const y1 = Math.min(h - 1, y + radius);
        const data = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 8) continue; // skip transparent
            r += data[i]; g += data[i + 1]; b += data[i + 2];
            n++;
        }
        if (n === 0) return { r: 0, g: 0, b: 0 };
        return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
    }

    // --- Color spaces ---
    // sRGB -> linear -> XYZ -> Lab
    function rgbToLab(r, g, b) {
        let R = r / 255, G = g / 255, B = b / 255;
        R = R > 0.04045 ? Math.pow((R + 0.055) / 1.055, 2.4) : R / 12.92;
        G = G > 0.04045 ? Math.pow((G + 0.055) / 1.055, 2.4) : G / 12.92;
        B = B > 0.04045 ? Math.pow((B + 0.055) / 1.055, 2.4) : B / 12.92;
        R *= 100; G *= 100; B *= 100;
        const x = R * 0.4124 + G * 0.3576 + B * 0.1805;
        const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
        const z = R * 0.0193 + G * 0.1192 + B * 0.9505;
        const xr = x / 95.047, yr = y / 100.0, zr = z / 108.883;
        const f = (t) => t > 0.008856 ? Math.cbrt(t) : (7.787 * t) + (16 / 116);
        const fx = f(xr), fy = f(yr), fz = f(zr);
        return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
    }

    // CIEDE2000 — perceptually accurate color difference
    function deltaE2000(lab1, lab2) {
        const { l: L1, a: a1, b: b1 } = lab1;
        const { l: L2, a: a2, b: b2 } = lab2;
        const avgL = (L1 + L2) / 2;
        const C1 = Math.sqrt(a1 * a1 + b1 * b1);
        const C2 = Math.sqrt(a2 * a2 + b2 * b2);
        const avgC = (C1 + C2) / 2;
        const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
        const a1p = (1 + G) * a1;
        const a2p = (1 + G) * a2;
        const C1p = Math.sqrt(a1p * a1p + b1 * b1);
        const C2p = Math.sqrt(a2p * a2p + b2 * b2);
        const avgCp = (C1p + C2p) / 2;
        const h1p = Math.atan2(b1, a1p) * 180 / Math.PI + (Math.atan2(b1, a1p) < 0 ? 360 : 0);
        const h2p = Math.atan2(b2, a2p) * 180 / Math.PI + (Math.atan2(b2, a2p) < 0 ? 360 : 0);
        let dhp;
        if (Math.abs(h1p - h2p) <= 180) dhp = h2p - h1p;
        else if (h2p <= h1p) dhp = h2p - h1p + 360;
        else dhp = h2p - h1p - 360;
        const dLp = L2 - L1;
        const dCp = C2p - C1p;
        const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * Math.PI / 360);
        let avgHp;
        if (Math.abs(h1p - h2p) > 180) avgHp = (h1p + h2p + 360) / 2;
        else avgHp = (h1p + h2p) / 2;
        const T = 1
            - 0.17 * Math.cos((avgHp - 30) * Math.PI / 180)
            + 0.24 * Math.cos((2 * avgHp) * Math.PI / 180)
            + 0.32 * Math.cos((3 * avgHp + 6) * Math.PI / 180)
            - 0.20 * Math.cos((4 * avgHp - 63) * Math.PI / 180);
        const SL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
        const SC = 1 + 0.045 * avgCp;
        const SH = 1 + 0.015 * avgCp * T;
        const dTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
        const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
        const RT = -RC * Math.sin(2 * dTheta * Math.PI / 180);
        return Math.sqrt(
            Math.pow(dLp / SL, 2)
            + Math.pow(dCp / SC, 2)
            + Math.pow(dHp / SH, 2)
            + RT * (dCp / SC) * (dHp / SH)
        );
    }

    function smoothstep(edge0, edge1, x) {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0 || 1)));
        return t * t * (3 - 2 * t);
    }

    // --- Mask + replace ---
    // Build a per-pixel alpha mask (0..1) of how strongly each pixel matches.
    function computeMask() {
        if (!selectedColor) return null;
        const w = imageCanvas.width;
        const h = imageCanvas.height;
        const src = ctx.getImageData(0, 0, w, h).data;
        const mask = new Float32Array(w * h);
        const selLab = rgbToLab(selectedColor.r, selectedColor.g, selectedColor.b);
        // CIEDE2000 in our tolerance slider is roughly 1..100; map directly.
        const tol = Math.max(0.001, tolerance);
        // soft inner zone for full match, fading to 0 at tol
        const inner = tol * 0.5;
        for (let i = 0, p = 0; i < src.length; i += 4, p++) {
            if (src[i + 3] === 0) { mask[p] = 0; continue; }
            const lab = rgbToLab(src[i], src[i + 1], src[i + 2]);
            const d = deltaE2000(selLab, lab);
            if (d >= tol) { mask[p] = 0; continue; }
            // smoothstep falloff: 1 inside `inner`, 0 outside `tol`
            mask[p] = 1 - smoothstep(inner, tol, d);
        }
        if (connectedToggle.checked && selectedPoint) {
            return restrictToConnected(mask, w, h, selectedPoint.x, selectedPoint.y);
        }
        return mask;
    }

    // Flood-fill from the click point through pixels whose mask > threshold.
    function restrictToConnected(mask, w, h, sx, sy) {
        const out = new Float32Array(mask.length);
        const threshold = 0.05;
        if (mask[sy * w + sx] <= threshold) return out;
        const stack = [sy * w + sx];
        const visited = new Uint8Array(mask.length);
        while (stack.length) {
            const idx = stack.pop();
            if (visited[idx]) continue;
            visited[idx] = 1;
            if (mask[idx] <= threshold) continue;
            out[idx] = mask[idx];
            const x = idx % w, y = (idx - x) / w;
            if (x > 0) stack.push(idx - 1);
            if (x < w - 1) stack.push(idx + 1);
            if (y > 0) stack.push(idx - w);
            if (y < h - 1) stack.push(idx + w);
        }
        return out;
    }

    // --- Marching ants ---
    let boundaryPixels = null;
    let antImageData = null;
    let antRafId = null;
    let antPhase = 0;
    let antLastFrame = 0;

    function computeBoundary(mask, w, h) {
        const threshold = 0.3;
        const result = [];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * w + x;
                const inside = mask[idx] > threshold;
                let edge = false;
                if (y > 0     && (mask[idx - w] > threshold) !== inside) edge = true;
                else if (y < h - 1 && (mask[idx + w] > threshold) !== inside) edge = true;
                else if (x > 0     && (mask[idx - 1] > threshold) !== inside) edge = true;
                else if (x < w - 1 && (mask[idx + 1] > threshold) !== inside) edge = true;
                if (edge) result.push(idx);
            }
        }
        return result;
    }

    function stopAnts() {
        if (antRafId) cancelAnimationFrame(antRafId);
        antRafId = null;
    }

    function startAnts() {
        stopAnts();
        if (!boundaryPixels || boundaryPixels.length === 0) return;
        const tick = (ts) => {
            if (ts - antLastFrame > 90) {
                antPhase = (antPhase + 1) & 7;
                drawAnts();
                antLastFrame = ts;
            }
            antRafId = requestAnimationFrame(tick);
        };
        antRafId = requestAnimationFrame(tick);
    }

    function ensureAntBuffer(w, h) {
        if (!antImageData || antImageData.width !== w || antImageData.height !== h) {
            antImageData = overlayCtx.createImageData(w, h);
        }
    }

    function drawAnts() {
        const w = overlayCanvas.width, h = overlayCanvas.height;
        ensureAntBuffer(w, h);
        const d = antImageData.data;
        // Zero out only previously drawn boundary pixels by overwriting them fresh each frame.
        // (Non-boundary pixels stay at 0 from createImageData; we only ever touch boundary positions.)
        const phase = antPhase;
        for (let i = 0; i < boundaryPixels.length; i++) {
            const idx = boundaryPixels[i];
            const x = idx % w;
            const y = (idx - x) / w;
            // 4-on, 4-off diagonal segments shifting with phase
            const on = (((x + y - phase) >> 2) & 1) === 0;
            const o = idx * 4;
            if (on) { d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = 255; }
            else    { d[o] = 0;   d[o + 1] = 0;   d[o + 2] = 0;   d[o + 3] = 255; }
        }
        overlayCtx.putImageData(antImageData, 0, 0);
    }

    function clearOverlay() {
        stopAnts();
        boundaryPixels = null;
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        antImageData = null;
    }

    function scheduleMaskUpdate() {
        if (maskUpdatePending) return;
        maskUpdatePending = true;
        requestAnimationFrame(() => {
            maskUpdatePending = false;
            renderMaskPreview();
        });
    }

    function renderMaskPreview() {
        if (!selectedColor || !showMaskToggle.checked) {
            clearOverlay();
            return;
        }
        const mask = computeMask();
        if (!mask) { clearOverlay(); return; }
        const w = overlayCanvas.width, h = overlayCanvas.height;
        boundaryPixels = computeBoundary(mask, w, h);
        // Reset the buffer so old segments don't linger
        antImageData = overlayCtx.createImageData(w, h);
        if (boundaryPixels.length === 0) {
            overlayCtx.putImageData(antImageData, 0, 0);
            stopAnts();
            return;
        }
        drawAnts();
        startAnts();
    }

    replaceColorBtn.addEventListener('click', () => {
        if (!selectedColor || !originalImage) return;
        const newColor = hexToRgb(replacementColorHex.textContent);
        if (!newColor) return;

        saveHistory();
        const w = imageCanvas.width;
        const h = imageCanvas.height;
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const mask = computeMask();

        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
            const m = mask[p];
            if (m <= 0) continue;
            data[i]     = Math.round(data[i]     * (1 - m) + newColor.r * m);
            data[i + 1] = Math.round(data[i + 1] * (1 - m) + newColor.g * m);
            data[i + 2] = Math.round(data[i + 2] * (1 - m) + newColor.b * m);
        }

        ctx.putImageData(imageData, 0, 0);
        downloadBtn.disabled = false;
        undoBtn.disabled = historyStack.length === 0;

        clearOverlay();

        announceToScreenReader('Color replaced');
    });

    resetBtn.addEventListener('click', () => {
        if (!originalImage) return;
        imageCanvas.width = originalImage.width;
        imageCanvas.height = originalImage.height;
        ctx.drawImage(originalImage, 0, 0);
        overlayCanvas.width = originalImage.width;
        overlayCanvas.height = originalImage.height;
        clearOverlay();

        selectedColor = null;
        selectedPoint = null;
        selectedColorDisplay.style.backgroundColor = '';
        selectedColorHex.textContent = '—';
        replaceColorBtn.disabled = true;
        addToPaletteBtn.disabled = true;
        clearHistory();
        centerImage();
        announceToScreenReader('Image reset');
    });

    // --- Download ---
    downloadBtn.addEventListener('click', () => {
        if (!originalImage) return;
        const choice = formatSelect.value === 'auto' ? sourceFormat : formatSelect.value;
        let mime, ext, quality;
        if (choice === 'jpg') { mime = 'image/jpeg'; ext = 'jpg'; quality = 0.95; }
        else if (choice === 'webp') { mime = 'image/webp'; ext = 'webp'; quality = 0.95; }
        else { mime = 'image/png'; ext = 'png'; quality = undefined; }

        let url;
        if (mime === 'image/jpeg') {
            // JPG has no alpha — composite onto white
            const tmp = document.createElement('canvas');
            tmp.width = imageCanvas.width;
            tmp.height = imageCanvas.height;
            const tctx = tmp.getContext('2d');
            tctx.fillStyle = '#ffffff';
            tctx.fillRect(0, 0, tmp.width, tmp.height);
            tctx.drawImage(imageCanvas, 0, 0);
            url = tmp.toDataURL(mime, quality);
        } else {
            url = imageCanvas.toDataURL(mime, quality);
        }

        const link = document.createElement('a');
        link.download = `pixeldye_image.${ext}`;
        link.href = url;
        link.click();
    });

    // --- Saved colors palette ---
    addToPaletteBtn.addEventListener('click', () => {
        const hex = replacementColorHex.textContent;
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
        if (!savedColorItems.includes(hex)) {
            savedColorItems.push(hex);
            persistSavedColors();
            updateSavedColors();
            announceToScreenReader(`Color ${hex} saved`);
        }
    });

    function persistSavedColors() {
        localStorage.setItem('savedColors', JSON.stringify(savedColorItems));
    }

    function updateSavedColors() {
        savedColorsPanel.innerHTML = '';
        if (savedColorItems.length === 0) {
            const message = document.createElement('div');
            message.className = 'no-colors-message';
            message.textContent = 'No saved colors yet';
            savedColorsPanel.appendChild(message);
            return;
        }
        savedColorItems.forEach((color) => {
            const item = document.createElement('div');
            item.className = 'saved-color-item';
            item.style.backgroundColor = color;
            item.setAttribute('data-color', color);
            item.title = `${color} — click to use, right-click to remove`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '<i class="fas fa-times"></i>';
            removeBtn.setAttribute('aria-label', `Remove ${color}`);
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeSavedColor(color);
            });
            item.appendChild(removeBtn);

            item.addEventListener('click', () => {
                setReplacementColor(color);
                announceToScreenReader(`Selected color ${color}`);
            });
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                removeSavedColor(color);
            });
            savedColorsPanel.appendChild(item);
        });
    }

    function removeSavedColor(color) {
        const i = savedColorItems.indexOf(color);
        if (i > -1) {
            savedColorItems.splice(i, 1);
            persistSavedColors();
            updateSavedColors();
        }
    }

    // --- Hex/RGB helpers ---
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    function hexToRgb(hex) {
        hex = hex.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
        return { r, g, b };
    }

    function rgbToHsv(r, g, b) {
        const R = r / 255, G = g / 255, B = b / 255;
        const max = Math.max(R, G, B), min = Math.min(R, G, B);
        const d = max - min;
        let h = 0;
        if (d !== 0) {
            switch (max) {
                case R: h = ((G - B) / d) % 6; break;
                case G: h = (B - R) / d + 2; break;
                case B: h = (R - G) / d + 4; break;
            }
            h *= 60;
            if (h < 0) h += 360;
        }
        const s = max === 0 ? 0 : d / max;
        const v = max;
        return { h, s, v };
    }

    function hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = v - c;
        let R = 0, G = 0, B = 0;
        if (h < 60) [R, G, B] = [c, x, 0];
        else if (h < 120) [R, G, B] = [x, c, 0];
        else if (h < 180) [R, G, B] = [0, c, x];
        else if (h < 240) [R, G, B] = [0, x, c];
        else if (h < 300) [R, G, B] = [x, 0, c];
        else [R, G, B] = [c, 0, x];
        return {
            r: Math.round((R + m) * 255),
            g: Math.round((G + m) * 255),
            b: Math.round((B + m) * 255),
        };
    }

    // --- Color picker UI (HSV) ---
    let pickerHsv = { h: 0, s: 1, v: 1 };

    function setPickerFromRgb(r, g, b) {
        const next = rgbToHsv(r, g, b);
        // Preserve the previous hue when color is achromatic — otherwise the
        // hue slider would jump to 0 every time the user lands on white/black/gray.
        if (next.s === 0) next.h = pickerHsv.h;
        pickerHsv = next;
        renderPicker();
    }

    function setPickerFromHsv() {
        renderPicker();
    }

    function renderPicker() {
        const { h, s, v } = pickerHsv;
        svSquare.style.backgroundColor = `hsl(${h}, 100%, 50%)`;
        svCursor.style.left = `${s * 100}%`;
        svCursor.style.top = `${(1 - v) * 100}%`;
        colorSpectrumSelector.style.left = `${(h / 360) * 100}%`;

        const rgb = hsvToRgb(h, s, v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        colorPreviewLarge.style.backgroundColor = hex;
        if (document.activeElement !== redInput) redInput.value = rgb.r;
        if (document.activeElement !== greenInput) greenInput.value = rgb.g;
        if (document.activeElement !== blueInput) blueInput.value = rgb.b;
        if (document.activeElement !== hexInput) hexInput.value = hex.substring(1);
    }

    function setReplacementColor(hex) {
        replacementColorHex.textContent = hex;
        replacementColorDisplay.style.backgroundColor = hex;
        const rgb = hexToRgb(hex);
        if (rgb) setPickerFromRgb(rgb.r, rgb.g, rgb.b);
    }

    // Init defaults
    setReplacementColor('#ff0000');

    function openPicker() {
        colorPickerModal.classList.add('open');
        renderPicker();
    }

    function closePicker() {
        colorPickerModal.classList.remove('open');
    }

    replacementColorDisplay.addEventListener('click', openPicker);
    replacementColorDisplay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
    });

    replacementColorHex.addEventListener('click', () => {
        const newHex = prompt('Enter hex color (e.g. #ff0000):', replacementColorHex.textContent);
        if (newHex && /^#?[0-9A-Fa-f]{6}$/.test(newHex)) {
            const normalized = newHex.startsWith('#') ? newHex : '#' + newHex;
            setReplacementColor(normalized.toLowerCase());
        }
    });

    closeColorPicker.addEventListener('click', closePicker);
    window.addEventListener('click', (e) => { if (e.target === colorPickerModal) closePicker(); });
    window.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (colorPickerModal.classList.contains('open')) { closePicker(); return; }
        if (isTypingTarget(e.target)) return;
        if (selectedColor) { deselectColor(); e.preventDefault(); }
    });

    // SV square drag
    function svPointerMove(e) {
        const rect = svSquare.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        pickerHsv.s = x / rect.width;
        pickerHsv.v = 1 - (y / rect.height);
        setPickerFromHsv();
    }
    let svDragging = false;
    svSquare.addEventListener('mousedown', (e) => { svDragging = true; svPointerMove(e); });
    window.addEventListener('mousemove', (e) => { if (svDragging) svPointerMove(e); });
    window.addEventListener('mouseup', () => { svDragging = false; });

    // Hue slider drag
    function huePointerMove(e) {
        const rect = colorSpectrum.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        pickerHsv.h = (x / rect.width) * 360;
        setPickerFromHsv();
    }
    let hueDragging = false;
    colorSpectrum.addEventListener('mousedown', (e) => { hueDragging = true; huePointerMove(e); });
    window.addEventListener('mousemove', (e) => { if (hueDragging) huePointerMove(e); });
    window.addEventListener('mouseup', () => { hueDragging = false; });

    // RGB inputs
    [redInput, greenInput, blueInput].forEach(input => {
        input.addEventListener('input', () => {
            const r = clamp(parseInt(redInput.value) || 0, 0, 255);
            const g = clamp(parseInt(greenInput.value) || 0, 0, 255);
            const b = clamp(parseInt(blueInput.value) || 0, 0, 255);
            setPickerFromRgb(r, g, b);
        });
    });

    hexInput.addEventListener('input', () => {
        const v = hexInput.value.replace('#', '');
        if (/^[0-9A-Fa-f]{6}$/.test(v)) {
            const rgb = hexToRgb(v);
            setPickerFromRgb(rgb.r, rgb.g, rgb.b);
        }
    });

    // Quick presets
    quickPresets.querySelectorAll('.preset-swatch').forEach(btn => {
        btn.style.backgroundColor = btn.dataset.color;
        btn.addEventListener('click', () => {
            const rgb = hexToRgb(btn.dataset.color);
            setPickerFromRgb(rgb.r, rgb.g, rgb.b);
        });
    });

    applyColorBtn.addEventListener('click', () => {
        const rgb = hsvToRgb(pickerHsv.h, pickerHsv.s, pickerHsv.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        setReplacementColor(hex);
        closePicker();
    });

    saveColorBtn.addEventListener('click', () => {
        const rgb = hsvToRgb(pickerHsv.h, pickerHsv.s, pickerHsv.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        if (!savedColorItems.includes(hex)) {
            savedColorItems.push(hex);
            persistSavedColors();
            updateSavedColors();
            announceToScreenReader(`Color ${hex} saved`);
        }
    });

    function clamp(v, mn, mx) { return Math.min(Math.max(v, mn), mx); }

    // --- Tolerance slider ---
    toleranceSlider.addEventListener('input', (e) => {
        tolerance = parseInt(e.target.value);
        toleranceValue.textContent = tolerance;
        scheduleMaskUpdate();
    });

    connectedToggle.addEventListener('change', scheduleMaskUpdate);
    showMaskToggle.addEventListener('change', renderMaskPreview);

    // --- Before/after compare (hold Space) ---
    let compareStash = null;
    window.addEventListener('keydown', (e) => {
        if (editorArea.style.display === 'none') return;
        if (e.code === 'Space' && !isComparing && !isTypingTarget(e.target)) {
            e.preventDefault();
            if (originalImageData) {
                isComparing = true;
                compareStash = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
                ctx.putImageData(originalImageData, 0, 0);
                overlayCanvas.style.display = 'none';
                stopAnts();
            }
        }
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') { e.preventDefault(); undoLastChange(); }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && isComparing) {
            isComparing = false;
            if (compareStash) {
                ctx.putImageData(compareStash, 0, 0);
                compareStash = null;
            }
            overlayCanvas.style.display = '';
            if (boundaryPixels && boundaryPixels.length) startAnts();
        }
    });

    function isTypingTarget(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    }

    // --- Back button ---
    function goBackToUpload() {
        editorArea.style.display = 'none';
        sidebar.style.display = 'none';
        uploadArea.style.display = 'flex';
        selectedColor = null;
        selectedPoint = null;
        selectedColorDisplay.style.backgroundColor = '';
        selectedColorHex.textContent = '—';
        replaceColorBtn.disabled = true;
        addToPaletteBtn.disabled = true;
        downloadBtn.disabled = true;
        resetBtn.disabled = true;
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        clearOverlay();
        originalImage = null;
        originalImageData = null;
        imageUpload.value = '';
    }

    function addBackButton() {
        const backButton = document.createElement('button');
        backButton.className = 'action-button secondary back-button';
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> <span>Back</span>';
        backButton.style.marginBottom = '10px';
        backButton.style.width = '100%';
        backButton.addEventListener('click', goBackToUpload);
        const firstSection = sidebar.querySelector('.sidebar-section');
        firstSection.insertBefore(backButton, firstSection.firstChild);
    }
    addBackButton();

    // --- History ---
    function saveHistory() {
        const currentState = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        historyStack.push(currentState);
        if (historyStack.length > maxHistorySize) historyStack.shift();
        undoBtn.disabled = false;
    }

    function undoLastChange() {
        if (historyStack.length > 0) {
            const previousState = historyStack.pop();
            ctx.putImageData(previousState, 0, 0);
            undoBtn.disabled = historyStack.length === 0;
            downloadBtn.disabled = false;
            scheduleMaskUpdate();
            announceToScreenReader('Undone');
        }
    }

    function clearHistory() {
        historyStack = [];
        undoBtn.disabled = true;
    }

    undoBtn.addEventListener('click', undoLastChange);

    // --- Screen reader ---
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.classList.add('sr-only');
        document.body.appendChild(announcement);
        setTimeout(() => {
            announcement.textContent = message;
            setTimeout(() => document.body.removeChild(announcement), 3000);
        }, 100);
    }
});
