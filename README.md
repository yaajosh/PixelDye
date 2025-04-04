# Color Replacement Tool

This tool allows you to replace specific colors in PNG images with other colors.

## Features

- Upload PNG images
- Select colors in the image by clicking
- Replace selected colors with a new color code
- Download edited images
- Supports transparency (alpha channel)
- Advanced edge smoothing with anti-aliasing
- Color palette for quick access to frequently used colors

## Instructions

1. Upload a PNG image
2. Click on a color in the image that you want to replace
3. Select the new color from the color picker
4. Click "Replace Color"
5. Download the edited image with "Download Image"
6. Use "Reset" to restore the original

## Technical Details

- The tool runs entirely in the browser and doesn't send data to external servers
- It uses the Canvas API to perform image editing
- Color replacement uses advanced Lab color space algorithms for better edge detection
- The color palette is saved in your browser's local storage

## Notes

- The tool only works with PNG images
- Processing very large images may take a few seconds
- Color detection uses a tolerance setting (adjustable via a slider) to recognize similar color tones. Higher values select a wider range of colors.
- Edge smoothing is automatically applied for cleaner transitions.

## Installation

1. Download all files
2. Open `index.html` in your browser

Or open `index.html` directly from the directory.

## License

Free to use and modify.
