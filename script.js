document.addEventListener('DOMContentLoaded', () => {
    // DOM-Elemente
    const imageUpload = document.getElementById('imageUpload');
    const imageCanvas = document.getElementById('imageCanvas');
    const ctx = imageCanvas.getContext('2d');
    const colorSection = document.getElementById('colorSection');
    const selectedColorDisplay = document.getElementById('selectedColorDisplay');
    const selectedColorHex = document.getElementById('selectedColorHex');
    const replacementColor = document.getElementById('replacementColor');
    const replacementColorHex = document.getElementById('replacementColorHex');
    const replaceColorBtn = document.getElementById('replaceColorBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const resetBtn = document.getElementById('resetBtn');
    const colorPalette = document.getElementById('colorPalette');
    const addToPaletteBtn = document.getElementById('addToPaletteBtn');
    const antiAliasCheckbox = document.getElementById('antiAliasCheckbox');

    // Variablen
    let originalImage = null;
    let selectedColor = null;
    let tolerance = 15; // Toleranzwert für Farbähnlichkeit
    let antiAlias = true; // Standard: Anti-Aliasing aktiviert
    
    // Farbpalette aus localStorage laden oder leeres Array erstellen
    let colorPaletteItems = JSON.parse(localStorage.getItem('colorPalette')) || [];
    
    // Palette beim Laden der Seite aktualisieren
    updateColorPalette();

    // Eventlistener für Farb-Input
    replacementColor.addEventListener('input', () => {
        replacementColorHex.textContent = replacementColor.value;
    });

    // Bild hochladen
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.match('image/png')) {
            alert('Please select a PNG file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Canvas-Größe anpassen
                imageCanvas.width = img.width;
                imageCanvas.height = img.height;
                
                // Bild zeichnen
                ctx.drawImage(img, 0, 0);
                
                // Originalbild speichern
                originalImage = new Image();
                originalImage.src = img.src;
                
                // Farb-Sektion aktivieren
                colorSection.classList.add('active');
                
                // Buttons aktivieren
                resetBtn.disabled = false;
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    // Farbe aus dem Bild auswählen
    imageCanvas.addEventListener('click', (e) => {
        if (!originalImage) return;
        
        // Position im Canvas bestimmen
        const rect = imageCanvas.getBoundingClientRect();
        const scaleX = imageCanvas.width / rect.width;
        const scaleY = imageCanvas.height / rect.height;
        
        const x = Math.floor((e.clientX - rect.left) * scaleX);
        const y = Math.floor((e.clientY - rect.top) * scaleY);
        
        // Pixel-Daten auslesen
        const pixelData = ctx.getImageData(x, y, 1, 1).data;
        
        // Farbe speichern
        selectedColor = {
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2],
            a: pixelData[3]
        };
        
        // Farbanzeige aktualisieren
        const hexColor = rgbaToHex(selectedColor.r, selectedColor.g, selectedColor.b);
        selectedColorDisplay.style.backgroundColor = hexColor;
        selectedColorHex.textContent = hexColor;
        
        // Buttons aktivieren
        replaceColorBtn.disabled = false;
        addToPaletteBtn.disabled = false;
    });

    // Farbe ersetzen
    replaceColorBtn.addEventListener('click', () => {
        if (!selectedColor || !originalImage) return;
        
        // Bildpixel bearbeiten
        const imageData = ctx.getImageData(0, 0, imageCanvas.width, imageCanvas.height);
        const data = imageData.data;
        
        // Zielfarbe aus dem Input holen
        const targetColor = hexToRgb(replacementColor.value);
        
        // Erweiterte Toleranz für Anti-Aliasing
        const edgeTolerance = tolerance * 4; // Noch größerer Bereich für Kanten
        
        // Konvertiere RGB zu Lab-Farbraum für bessere Farbdifferenzberechnung
        const selectedLab = rgbToLab(selectedColor.r, selectedColor.g, selectedColor.b);
        const targetLab = rgbToLab(targetColor.r, targetColor.g, targetColor.b);
        
        // Jeden Pixel durchgehen
        for (let i = 0; i < data.length; i += 4) {
            // Aktueller Pixel
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];
            
            if (a === 0) continue; // Transparente Pixel überspringen
            
            // Konvertiere aktuellen Pixel zu Lab
            const pixelLab = rgbToLab(r, g, b);
            
            // Berechne Farbdifferenz im Lab-Farbraum (wahrnehmungsgetreuer)
            const colorDiff = deltaE(selectedLab, pixelLab);
            
            // Exakte Übereinstimmung innerhalb der Toleranz
            if (colorDiff <= tolerance) {
                // Farbe vollständig ersetzen
                data[i] = targetColor.r;
                data[i + 1] = targetColor.g;
                data[i + 2] = targetColor.b;
            } 
            // Verbesserte Kantenbehandlung für Anti-Aliasing
            else if (antiAlias && colorDiff <= edgeTolerance) {
                // Berechne Mischfaktor mit verbesserter Kurve
                // Verwende eine Sigmoid-ähnliche Funktion für weichere Übergänge
                const normalizedDiff = (colorDiff - tolerance) / (edgeTolerance - tolerance);
                const blendFactor = 1 - (Math.tanh(normalizedDiff * 2) + 1) / 2;
                
                // Mische die Farben mit verbessertem Algorithmus
                data[i] = Math.round(r * (1 - blendFactor) + targetColor.r * blendFactor);
                data[i + 1] = Math.round(g * (1 - blendFactor) + targetColor.g * blendFactor);
                data[i + 2] = Math.round(b * (1 - blendFactor) + targetColor.b * blendFactor);
            }
        }
        
        // Bearbeitetes Bild zeichnen
        ctx.putImageData(imageData, 0, 0);
        
        // Download-Button aktivieren
        downloadBtn.disabled = false;
    });

    // Bild zurücksetzen
    resetBtn.addEventListener('click', () => {
        if (!originalImage) return;
        
        // Canvas-Größe anpassen
        imageCanvas.width = originalImage.width;
        imageCanvas.height = originalImage.height;
        
        // Originalbild neu zeichnen
        ctx.drawImage(originalImage, 0, 0);
        
        // Farbauswahl zurücksetzen
        selectedColor = null;
        selectedColorDisplay.style.backgroundColor = '';
        selectedColorHex.textContent = '-';
        
        // Buttons aktualisieren
        replaceColorBtn.disabled = true;
        downloadBtn.disabled = true;
    });

    // Bild herunterladen
    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = 'bearbeitetes-bild.png';
        link.href = imageCanvas.toDataURL('image/png');
        link.click();
    });

    // Hilfsfunktionen
    function rgbaToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    // Anti-Aliasing-Checkbox-Event
    antiAliasCheckbox.addEventListener('change', () => {
        antiAlias = antiAliasCheckbox.checked;
    });

    // Farbpalette-Funktionen
    addToPaletteBtn.addEventListener('click', () => {
        // Statt der ausgewählten Farbe die Ersatzfarbe zur Palette hinzufügen
        const hexColor = replacementColor.value;
        
        // Prüfen, ob die Farbe bereits in der Palette ist
        if (!colorPaletteItems.includes(hexColor)) {
            colorPaletteItems.push(hexColor);
            updateColorPalette();
            
            // Palette im localStorage speichern
            localStorage.setItem('colorPalette', JSON.stringify(colorPaletteItems));
        }
    });

    function updateColorPalette() {
        // Palette leeren
        colorPalette.innerHTML = '';
        
        // Farben hinzufügen
        colorPaletteItems.forEach(color => {
            const colorItem = document.createElement('div');
            colorItem.className = 'palette-color';
            colorItem.style.backgroundColor = color;
            colorItem.setAttribute('data-color', color);
            colorItem.title = color;
            
            // Event zum Auswählen der Farbe
            colorItem.addEventListener('click', () => {
                replacementColor.value = color;
                replacementColorHex.textContent = color;
            });
            
            // Event zum Entfernen mit Rechtsklick
            colorItem.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const index = colorPaletteItems.indexOf(color);
                if (index > -1) {
                    colorPaletteItems.splice(index, 1);
                    updateColorPalette();
                    
                    // Aktualisierte Palette im localStorage speichern
                    localStorage.setItem('colorPalette', JSON.stringify(colorPaletteItems));
                }
            });
            
            colorPalette.appendChild(colorItem);
        });
    }

    // Manuelle Hex-Eingabe
    replacementColorHex.addEventListener('click', () => {
        const newHex = prompt('Enter hex color code (e.g. #ff0000):', replacementColorHex.textContent);
        if (newHex && /^#[0-9A-Fa-f]{6}$/.test(newHex)) {
            replacementColor.value = newHex;
            replacementColorHex.textContent = newHex;
        }
    });

    // Lab-Farbraum Konvertierungsfunktionen
    function rgbToLab(r, g, b) {
        // RGB zu XYZ
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
        
        // XYZ zu Lab
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

    // Berechnet die Farbdifferenz im Lab-Farbraum (Delta E)
    function deltaE(lab1, lab2) {
        return Math.sqrt(
            Math.pow(lab1.l - lab2.l, 2) +
            Math.pow(lab1.a - lab2.a, 2) +
            Math.pow(lab1.b - lab2.b, 2)
        );
    }
}); 