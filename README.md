# PixelDye — Color Replacement Tool

Browser-based tool to swap specific colors in an image. Runs entirely client-side — no uploads, no servers.

## Features

- **Pick a color by clicking** on the image (3×3 area sampling, robust against anti-aliased edges)
- **Full color picker**: SV (saturation/brightness) square + hue slider + RGB/HEX inputs + quick presets (white, black, grays, primary hues)
- **Live selection preview**: before you hit Replace, matching pixels are highlighted in cyan on a pulsing overlay so you can see exactly what will change
- **Connected-region mode** (optional): only replace pixels that touch the click point (flood fill)
- **Perceptual color matching** using CIE Lab + ΔE2000, with smoothstep falloff for cleaner edges than linear blending
- **Tolerance slider** to widen/narrow the match
- **PNG, JPG, WebP** support for upload and download (JPG auto-composites onto white since it has no alpha)
- **Saved palette** with localStorage persistence, hover-X to delete
- **Before/after comparison**: hold <kbd>Space</kbd> to flash the original
- **Undo** (Cmd/Ctrl+Z) up to 10 steps
- **Zoom / pan**: scroll to zoom, drag to pan, double-click or Fit button to refit
- **Light / dark theme** toggle, persisted

## Usage

1. Open `index.html` in a browser (or just drop the folder on a static host like GitHub Pages)
2. Drop or select an image (PNG / JPG / WebP)
3. Click on a color in the image
4. The matching region appears highlighted in cyan — adjust **Tolerance** until the highlight covers what you want
5. Click the **New** swatch to pick a replacement color, then **Replace**
6. Pick **Format** (Match source / PNG / JPG / WebP) and **Download**

### Tips

- Holding <kbd>Space</kbd> swaps to the original temporarily — great for checking your work
- Toggle **Only connected region** to restrict replacement to one shape (useful when many things in the image share the same color)
- Right-click a saved palette swatch (or hover and click its X) to remove it
- <kbd>Cmd/Ctrl+Z</kbd> undoes the last replace

## Tech

- Pure HTML / CSS / vanilla JS, no build step
- Canvas API for pixel-level editing
- CIEDE2000 implementation for perceptually-uniform color difference
- localStorage for theme + palette

## License

Free to use and modify.
