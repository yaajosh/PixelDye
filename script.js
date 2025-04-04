document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const imageUpload = document.getElementById('imageUpload');
    const uploadArea = document.getElementById('uploadArea');
    const editorArea = document.getElementById('editorArea');
    const imageCanvas = document.getElementById('imageCanvas');
    const canvasContainer = document.getElementById('canvasContainer');
    const ctx = imageCanvas.getContext('2d');
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
    const redInput = document.getElementById('redInput');
    const greenInput = document.getElementById('greenInput');
    const blueInput = document.getElementById('blueInput');
    const hexInput = document.getElementById('hexInput');
    const closeColorPicker = document.getElementById('closeColorPicker');
    const savedColorsPanel = document.getElementById('savedColorsPanel');
    const saveColorBtn = document.getElementById('saveColorBtn');
    const applyColorBtn = document.getElementById('applyColorBtn');
    const sidebar = document.getElementById('sidebar');
    const workspace = document.querySelector('.workspace');
    const toleranceSlider = document.getElementById('toleranceSlider');
    const toleranceValue = document.getElementById('toleranceValue');

    // Variables
    let originalImage = null;
    let selectedColor = null;
    let tolerance = 15; // Color similarity tolerance (default value)
    let scale = 1; // Current zoom level
    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let viewPosition = { x: 0, y: 0 };
    
    // Initialize UI state
    editorArea.style.display = 'none';
    
    // Load saved colors from localStorage or create empty array
    let savedColorItems = JSON.parse(localStorage.getItem('savedColors')) || [];
    
    // Load theme from localStorage
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.checked = currentTheme === 'dark';
    
    // Update saved colors
    updateSavedColors();

    // Theme toggle event
    themeToggle.addEventListener('change', function() {
        if(this.checked) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    // Color input event
    replacementColorHex.addEventListener('click', () => {
        const newHex = prompt('Enter hex color code (e.g. #ff0000):', replacementColorHex.textContent);
        if (newHex && /^#[0-9A-Fa-f]{6}$/.test(newHex)) {
            replacementColorHex.textContent = newHex;
        }
    });

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length) {
            imageUpload.files = e.dataTransfer.files;
            handleImageUpload(e.dataTransfer.files[0]);
        }
    });

    // Image upload event
    imageUpload.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleImageUpload(e.target.files[0]);
        }
    });

    // Handle image upload
    function handleImageUpload(file) {
        if (!file || !file.type.match('image/png')) {
            alert('Please select a PNG file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Adjust canvas size
                imageCanvas.width = img.width;
                imageCanvas.height = img.height;
                
                // Draw image
                ctx.drawImage(img, 0, 0);
                
                // Save original image
                originalImage = new Image();
                originalImage.src = img.src;
                
                // Show editor area and sidebar, hide upload area
                uploadArea.style.display = 'none';
                editorArea.style.display = 'block';
                sidebar.style.display = 'flex';
                
                // Add classes for animations
                editorArea.classList.add('fade-in');
                workspace.classList.add('workspace-with-sidebar');
                
                // Add zoom controls
                addZoomControls();
                
                // Setup pan/zoom functionality
                setupCanvasInteraction();
                
                // Enable reset button
                resetBtn.disabled = false;
                
                // Set cursor style
                imageCanvas.style.cursor = 'crosshair';
                
                // Center the image
                centerImage();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Add zoom controls
    function addZoomControls() {
        // Create zoom controls container if it doesn't exist
        if (!document.querySelector('.zoom-controls')) {
            const zoomControls = document.createElement('div');
            zoomControls.className = 'zoom-controls';
            
            const zoomInBtn = document.createElement('button');
            zoomInBtn.className = 'zoom-btn';
            zoomInBtn.innerHTML = '<i class="fas fa-plus"></i>';
            zoomInBtn.setAttribute('aria-label', 'Zoom in');
            
            const zoomOutBtn = document.createElement('button');
            zoomOutBtn.className = 'zoom-btn';
            zoomOutBtn.innerHTML = '<i class="fas fa-minus"></i>';
            zoomOutBtn.setAttribute('aria-label', 'Zoom out');
            
            const resetZoomBtn = document.createElement('button');
            resetZoomBtn.className = 'zoom-btn';
            resetZoomBtn.innerHTML = '<i class="fas fa-expand"></i>';
            resetZoomBtn.setAttribute('aria-label', 'Reset zoom');
            
            zoomControls.appendChild(zoomInBtn);
            zoomControls.appendChild(zoomOutBtn);
            zoomControls.appendChild(resetZoomBtn);
            
            editorArea.appendChild(zoomControls);
            
            // Add event listeners
            zoomInBtn.addEventListener('click', () => {
                scale *= 1.2;
                applyTransform();
            });
            
            zoomOutBtn.addEventListener('click', () => {
                scale = Math.max(0.1, scale / 1.2);
                applyTransform();
            });
            
            resetZoomBtn.addEventListener('click', () => {
                scale = 1;
                viewPosition = { x: 0, y: 0 };
                applyTransform();
            });
        }
    }

    // Setup canvas interaction for pan and zoom
    function setupCanvasInteraction() {
        // Mouse wheel zoom
        canvasContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Get mouse position relative to canvas
            const rect = canvasContainer.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Zoom in or out
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            
            // Calculate new scale
            const newScale = scale * zoomFactor;
            
            // Limit scale
            if (newScale >= 0.1 && newScale <= 10) {
                // Adjust position to zoom toward mouse position
                viewPosition.x = mouseX - (mouseX - viewPosition.x) * zoomFactor;
                viewPosition.y = mouseY - (mouseY - viewPosition.y) * zoomFactor;
                
                scale = newScale;
                applyTransform();
            }
        });
        
        // Mouse drag to pan
        canvasContainer.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                isDragging = true;
                dragStart.x = e.clientX - viewPosition.x;
                dragStart.y = e.clientY - viewPosition.y;
                canvasContainer.style.cursor = 'grabbing';
            }
        });
        
        canvasContainer.addEventListener('mousemove', (e) => {
            if (isDragging) {
                viewPosition.x = e.clientX - dragStart.x;
                viewPosition.y = e.clientY - dragStart.y;
                applyTransform();
            }
        });
        
        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                canvasContainer.style.cursor = 'default';
            }
        });
        
        // Double click to reset view
        canvasContainer.addEventListener('dblclick', () => {
            scale = 1;
            viewPosition = { x: 0, y: 0 };
            applyTransform();
        });
    }

    // Apply transform to canvas
    function applyTransform() {
        imageCanvas.style.transform = `translate(${viewPosition.x}px, ${viewPosition.y}px) scale(${scale})`;
        imageCanvas.style.transformOrigin = '0 0';
    }

    // Select color from image
    imageCanvas.addEventListener('click', (e) => {
        if (!originalImage || isDragging) return;
        
        // Get position in canvas
        const rect = imageCanvas.getBoundingClientRect();
        const scaleX = imageCanvas.width / (rect.width * scale);
        const scaleY = imageCanvas.height / (rect.height * scale);
        
        const x = Math.floor(((e.clientX - rect.left) / scale) * scaleX);
        const y = Math.floor(((e.clientY - rect.top) / scale) * scaleY);
        
        // Ensure coordinates are within bounds
        if (x < 0 || x >= imageCanvas.width || y < 0 || y >= imageCanvas.height) {
            return;
        }
        
        // Get pixel data
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        
        // Save selected color
        selectedColor = {
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2],
            a: pixelData[3]
        };
        
        // Update UI
        const hexColor = rgbaToHex(selectedColor.r, selectedColor.g, selectedColor.b);
        selectedColorDisplay.style.backgroundColor = hexColor;
        selectedColorHex.textContent = hexColor;
        
        // Enable buttons
        replaceColorBtn.disabled = false;
        addToPaletteBtn.disabled = false;
        
        // Announce the selected color for screen readers
        announceToScreenReader(`Selected color ${hexColor}`);
    });

    // Replace color
    replaceColorBtn.addEventListener('click', () => {
        if (!selectedColor || !originalImage) return;
        
        // Get replacement color
        const newColor = hexToRgb(replacementColorHex.textContent);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        const data = imageData.data;
        
        // Convert selected color to Lab color space
        const selectedLab = rgbToLab(selectedColor.r, selectedColor.g, selectedColor.b);
        
        // Replace colors
        for (let i = 0; i < data.length; i += 4) {
            // Skip transparent pixels
            if (data[i + 3] === 0) continue;
            
            // Convert current pixel to Lab
            const pixelLab = rgbToLab(data[i], data[i + 1], data[i + 2]);
            
            // Calculate color difference
            const colorDiff = deltaE(selectedLab, pixelLab);
            
            // Replace if within tolerance
            if (colorDiff <= tolerance) {
                // Calculate alpha factor for smooth anti-aliasing
                // Alpha is 1 (full replacement) if colorDiff is 0
                // Alpha approaches 0 (no replacement) as colorDiff approaches tolerance
                const alphaFactor = Math.max(0, 1 - (colorDiff / tolerance));
                
                // Apply new color with anti-aliasing
                data[i] = Math.round(data[i] * (1 - alphaFactor) + newColor.r * alphaFactor);
                data[i + 1] = Math.round(data[i + 1] * (1 - alphaFactor) + newColor.g * alphaFactor);
                data[i + 2] = Math.round(data[i + 2] * (1 - alphaFactor) + newColor.b * alphaFactor);
            }
        }
        
        // Update canvas
        ctx.putImageData(imageData, 0, 0);
        
        // Enable download button
        downloadBtn.disabled = false;
        
        // Announce when color is replaced
        announceToScreenReader('Color replaced successfully');
    });

    // Reset image
    resetBtn.addEventListener('click', () => {
        if (originalImage) {
            // Reset canvas
            imageCanvas.width = originalImage.width;
            imageCanvas.height = originalImage.height;
            ctx.drawImage(originalImage, 0, 0);
            
            // Reset zoom and position
            scale = 1;
            viewPosition = { x: 0, y: 0 };
            applyTransform();
            
            // Reset selected color
            selectedColor = null;
            selectedColorDisplay.style.backgroundColor = '';
            selectedColorHex.textContent = '-';
            
            // Disable buttons
            replaceColorBtn.disabled = true;
            addToPaletteBtn.disabled = true;
            
            // Announce reset
            announceToScreenReader('Image has been reset');
        }
    });

    // Download image
    downloadBtn.addEventListener('click', () => {
        if (!originalImage) return;
        
        // Create download link
        const link = document.createElement('a');
        link.download = 'pixeldye_image.png';
        link.href = imageCanvas.toDataURL('image/png');
        link.click();
    });

    // Add to saved colors
    addToPaletteBtn.addEventListener('click', () => {
        if (!selectedColor) return;
        
        const hexColor = rgbaToHex(selectedColor.r, selectedColor.g, selectedColor.b);
        
        // Check if color already exists
        if (!savedColorItems.includes(hexColor)) {
            savedColorItems.push(hexColor);
            updateSavedColors();
            
            // Save to localStorage
            localStorage.setItem('savedColors', JSON.stringify(savedColorItems));
            
            // Announce color saved
            announceToScreenReader(`Color ${hexColor} saved to palette`);
        }
    });

    // Edit hex value
    replacementColorHex.addEventListener('click', () => {
        const newHex = prompt('Enter hex color code (e.g. #ff0000):', replacementColorHex.textContent);
        if (newHex && /^#[0-9A-Fa-f]{6}$/.test(newHex)) {
            replacementColorHex.textContent = newHex;
        }
    });

    // Update saved colors
    function updateSavedColors() {
        // Update the saved colors in the sidebar
        savedColorsPanel.innerHTML = '';
        
        savedColorItems.forEach(color => {
            const colorItem = document.createElement('div');
            colorItem.className = 'saved-color-item';
            colorItem.style.backgroundColor = color;
            colorItem.setAttribute('data-color', color);
            colorItem.title = color;
            
            // Click to select color
            colorItem.addEventListener('click', () => {
                // Update the text value
                replacementColorHex.textContent = color;
                
                // Update the color display
                replacementColorDisplay.style.backgroundColor = color;
                
                // Also update the color picker values in case it's opened later
                const rgb = hexToRgb(color);
                if (rgb) {
                    // Store these values for the color picker
                    redInput.value = rgb.r;
                    greenInput.value = rgb.g;
                    blueInput.value = rgb.b;
                    hexInput.value = color.substring(1);
                    colorPreviewLarge.style.backgroundColor = color;
                }
                
                // Provide feedback
                announceToScreenReader(`Selected color ${color}`);
            });
            
            // Right-click to remove
            colorItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const index = savedColorItems.indexOf(color);
                if (index > -1) {
                    savedColorItems.splice(index, 1);
                    updateSavedColors();
                    
                    // Save to localStorage
                    localStorage.setItem('savedColors', JSON.stringify(savedColorItems));
                }
            });
            
            savedColorsPanel.appendChild(colorItem);
        });
        
        // Add message if no colors
        if (savedColorItems.length === 0) {
            const message = document.createElement('div');
            message.className = 'no-colors-message';
            message.textContent = 'No saved colors yet';
            savedColorsPanel.appendChild(message);
        }
    }

    // Helper functions
    function rgbaToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    function hexToRgb(hex) {
        // Remove the # if present
        hex = hex.replace(/^#/, '');
        
        // Parse the hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        
        // Check if the parsing was successful
        if (isNaN(r) || isNaN(g) || isNaN(b)) {
            return null;
        }
        
        return { r, g, b };
    }

    // Lab color space conversion functions
    function rgbToLab(r, g, b) {
        // RGB to XYZ
        r = r / 255;
        g = g / 255;
        b = b / 255;
        
        r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        r *= 100;
        g *= 100;
        b *= 100;
        
        const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
        const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
        const z = r * 0.0193 + g * 0.1192 + b * 0.9505;
        
        // XYZ to Lab
        const xRef = 95.047;
        const yRef = 100.0;
        const zRef = 108.883;
        
        let xNorm = x / xRef;
        let yNorm = y / yRef;
        let zNorm = z / zRef;
        
        xNorm = xNorm > 0.008856 ? Math.pow(xNorm, 1/3) : (7.787 * xNorm) + (16 / 116);
        yNorm = yNorm > 0.008856 ? Math.pow(yNorm, 1/3) : (7.787 * yNorm) + (16 / 116);
        zNorm = zNorm > 0.008856 ? Math.pow(zNorm, 1/3) : (7.787 * zNorm) + (16 / 116);
        
        const l = (116 * yNorm) - 16;
        const a = 500 * (xNorm - yNorm);
        const bValue = 200 * (yNorm - zNorm);
        
        return {l, a, b: bValue};
    }

    // Calculate color difference in Lab color space (Delta E)
    function deltaE(lab1, lab2) {
        return Math.sqrt(
            Math.pow(lab1.l - lab2.l, 2) +
            Math.pow(lab1.a - lab2.a, 2) +
            Math.pow(lab1.b - lab2.b, 2)
        );
    }

    // Add announcements for screen readers
    function announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.classList.add('sr-only');
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            announcement.textContent = message;
            
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 3000);
        }, 100);
    }

    // Initialize color picker
    replacementColorDisplay.style.backgroundColor = '#ff0000';
    colorPreviewLarge.style.backgroundColor = '#ff0000';
    colorSpectrumSelector.style.left = '0%';

    // Update the color picker positioning and behavior

    // Make sure the color picker is properly centered
    function showColorPicker() {
        colorPickerModal.style.display = 'block';
        
        // Ensure the modal is centered in the viewport
        const viewportHeight = window.innerHeight;
        const modalHeight = colorPickerModal.offsetHeight;
        
        // If the modal is too tall for the viewport, adjust its max-height
        if (modalHeight > viewportHeight * 0.9) {
            colorPickerModal.style.maxHeight = `${viewportHeight * 0.9}px`;
            colorPickerModal.style.overflowY = 'auto';
        }
        
        updateSavedColors();
    }

    // Replace the click event with our new function
    replacementColorDisplay.addEventListener('click', showColorPicker);

    // Update the saved colors grid to match the reference image
    function updateSavedColorsGrid() {
        savedColorsPanel.innerHTML = '';
        
        savedColorItems.forEach(color => {
            const colorItem = document.createElement('div');
            colorItem.className = 'saved-color-item';
            colorItem.style.backgroundColor = color;
            colorItem.setAttribute('data-color', color);
            colorItem.title = color;
            
            // Click to select color
            colorItem.addEventListener('click', () => {
                const rgb = hexToRgb(color);
                updateColorInputs(rgb.r, rgb.g, rgb.b);
                colorPreviewLarge.style.backgroundColor = color;
                
                // Also update the main interface color
                replacementColorHex.textContent = color;
                replacementColorDisplay.style.backgroundColor = color;
            });
            
            // Right-click to remove
            colorItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const index = savedColorItems.indexOf(color);
                if (index > -1) {
                    savedColorItems.splice(index, 1);
                    updateSavedColors();
                    updateSavedColorsGrid();
                    
                    // Save to localStorage
                    localStorage.setItem('savedColors', JSON.stringify(savedColorItems));
                }
            });
            
            savedColorsPanel.appendChild(colorItem);
        });
        
        // Add message if no colors
        if (savedColorItems.length === 0) {
            const message = document.createElement('div');
            message.className = 'no-colors-message';
            message.textContent = 'No saved colors yet';
            savedColorsPanel.appendChild(message);
        }
    }

    // Update the color inputs to match the reference image
    function updateColorInputs(r, g, b, updateHex = true) {
        redInput.value = r;
        greenInput.value = g;
        blueInput.value = b;
        
        if (updateHex) {
            hexInput.value = rgbToHex(r, g, b).substring(1);
        }
        
        colorPreviewLarge.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }

    // Open color picker
    replacementColorDisplay.addEventListener('click', () => {
        colorPickerModal.style.display = 'block';
        updateSavedColorsGrid();
    });

    // Close color picker
    closeColorPicker.addEventListener('click', () => {
        colorPickerModal.style.display = 'none';
    });

    // Close when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === colorPickerModal) {
            colorPickerModal.style.display = 'none';
        }
    });

    // Color spectrum interaction
    colorSpectrum.addEventListener('click', (e) => {
        const rect = colorSpectrum.getBoundingClientRect();
        const position = (e.clientX - rect.left) / rect.width;
        
        // Update selector position
        colorSpectrumSelector.style.left = `${position * 100}%`;
        
        // Get color from spectrum
        const hue = position * 360;
        const color = hslToRgb(hue / 360, 1, 0.5);
        
        // Update inputs and preview
        updateColorInputs(color.r, color.g, color.b);
    });

    // RGB input events
    redInput.addEventListener('input', updateFromRgbInputs);
    greenInput.addEventListener('input', updateFromRgbInputs);
    blueInput.addEventListener('input', updateFromRgbInputs);

    // Hex input event
    hexInput.addEventListener('input', () => {
        const hex = hexInput.value;
        if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
            const rgb = hexToRgb(`#${hex}`);
            updateColorInputs(rgb.r, rgb.g, rgb.b, false);
        }
    });

    // Apply color button
    applyColorBtn.addEventListener('click', () => {
        const r = parseInt(redInput.value);
        const g = parseInt(greenInput.value);
        const b = parseInt(blueInput.value);
        const hex = rgbToHex(r, g, b);
        
        replacementColorHex.textContent = hex;
        replacementColorDisplay.style.backgroundColor = hex;
        
        colorPickerModal.style.display = 'none';
    });

    // Save color button
    saveColorBtn.addEventListener('click', () => {
        const r = parseInt(redInput.value);
        const g = parseInt(greenInput.value);
        const b = parseInt(blueInput.value);
        const hex = rgbToHex(r, g, b);
        
        // Check if color already exists
        if (!savedColorItems.includes(hex)) {
            savedColorItems.push(hex);
            updateSavedColors();
            updateSavedColorsGrid();
            
            // Save to localStorage
            localStorage.setItem('savedColors', JSON.stringify(savedColorItems));
            
            // Announce color saved
            announceToScreenReader(`Color ${hex} saved to palette`);
        }
    });

    // Update from RGB inputs
    function updateFromRgbInputs() {
        const r = clamp(parseInt(redInput.value) || 0, 0, 255);
        const g = clamp(parseInt(greenInput.value) || 0, 0, 255);
        const b = clamp(parseInt(blueInput.value) || 0, 0, 255);
        
        redInput.value = r;
        greenInput.value = g;
        blueInput.value = b;
        
        const hex = rgbToHex(r, g, b);
        hexInput.value = hex.substring(1);
        
        colorPreviewLarge.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
    }

    // Helper function to clamp values
    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // HSL to RGB conversion
    function hslToRgb(h, s, l) {
        let r, g, b;

        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };

            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    // RGB to Hex conversion (improved version)
    function rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    // Add a function to handle going back to upload screen
    function goBackToUpload() {
        // Hide editor area and sidebar
        editorArea.style.display = 'none';
        sidebar.style.display = 'none';
        
        // Show upload area
        uploadArea.style.display = 'flex';
        
        // Remove workspace sidebar class
        workspace.classList.remove('workspace-with-sidebar');
        
        // Reset selected color
        selectedColor = null;
        selectedColorDisplay.style.backgroundColor = '';
        selectedColorHex.textContent = '-';
        
        // Disable buttons
        replaceColorBtn.disabled = true;
        addToPaletteBtn.disabled = true;
        downloadBtn.disabled = true;
        resetBtn.disabled = true;
        
        // Clear canvas
        ctx.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
        originalImage = null;
    }

    // Add a back button to the sidebar
    function addBackButton() {
        const backButton = document.createElement('button');
        backButton.className = 'action-button secondary back-button';
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i> <span>Back</span>';
        backButton.addEventListener('click', goBackToUpload);
        
        // Add to the first section of the sidebar
        const firstSection = sidebar.querySelector('.sidebar-section');
        firstSection.insertBefore(backButton, firstSection.firstChild);
    }

    // Call this function after DOM content is loaded
    addBackButton();

    // Add event listener for tolerance slider
    toleranceSlider.addEventListener('input', (e) => {
        tolerance = parseInt(e.target.value);
        toleranceValue.textContent = tolerance;
    });
}); 