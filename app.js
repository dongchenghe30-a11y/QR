// Global Variables
let currentImage = null;
let colorThief = null;
let logoImage = null;
let gradientColors = ['#667eea', '#764ba2'];

// Initialize Application
window.addEventListener('DOMContentLoaded', function() {
    // Wait for external libraries to load
    if (typeof ColorThief !== 'undefined') {
        colorThief = new ColorThief();
    } else {
        console.error('ColorThief library not loaded');
        showToast('Color extraction library not available');
    }
    
    updateGradientPreview();
});

// Fallback: Check if libraries are loaded periodically
function checkLibrariesLoaded() {
    if (typeof ColorThief === 'undefined') {
        console.warn('Waiting for ColorThief library...');
        setTimeout(checkLibrariesLoaded, 500);
    }
    if (typeof QRCode === 'undefined') {
        console.warn('Waiting for QRCode library...');
        setTimeout(checkLibrariesLoaded, 500);
    }
}
checkLibrariesLoaded();

// Tab Navigation
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Show corresponding tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabId}-tab`).classList.add('active');
    });
});

// Image Upload and Preview
const imageUpload = document.getElementById('imageUpload');
const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');
const extractBtn = document.getElementById('extractBtn');

imageUpload.addEventListener('click', () => imageInput.click());
imageUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUpload.classList.add('dragover');
});
imageUpload.addEventListener('dragleave', () => {
    imageUpload.classList.remove('dragover');
});
imageUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUpload.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
    }
});

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageUpload(file);
    }
});

function handleImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImage = new Image();
        currentImage.crossOrigin = 'Anonymous';
        currentImage.onload = () => {
            previewImg.src = currentImage.src;
            imagePreview.style.display = 'block';
            imageUpload.style.display = 'none';
            extractBtn.disabled = false;
        };
        currentImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Color Count Display
document.getElementById('colorCount').addEventListener('input', (e) => {
    document.getElementById('colorCountValue').textContent = e.target.value;
});

// Extract Colors
extractBtn.addEventListener('click', () => {
    if (currentImage) {
        if (typeof ColorThief === 'undefined' || !colorThief) {
            if (typeof ColorThief !== 'undefined') {
                colorThief = new ColorThief();
            } else {
                showToast('Color extraction library not loaded. Please refresh the page.');
                return;
            }
        }
        
        const colorCount = parseInt(document.getElementById('colorCount').value);
        const palette = colorThief.getPalette(currentImage, colorCount);
        displayPalette(palette, 'paletteGrid');
        document.getElementById('extractedPalette').style.display = 'block';
    }
});

function displayPalette(palette, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    palette.forEach(color => {
        const hex = rgbToHex(color[0], color[1], color[2]);
        const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        
        const colorCard = document.createElement('div');
        colorCard.className = 'color-card';
        colorCard.innerHTML = `
            <div class="color-swatch" style="background-color: ${hex};"></div>
            <div class="color-info">
                <div class="color-hex">${hex}</div>
                <div class="color-rgb">${rgb}</div>
            </div>
        `;
        
        colorCard.addEventListener('click', () => {
            navigator.clipboard.writeText(hex);
            showToast(`Color ${hex} copied to clipboard!`);
        });
        
        grid.appendChild(colorCard);
    });
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

// Export Palette
document.getElementById('exportPaletteBtn').addEventListener('click', () => {
    exportPalette('extracted');
});

function exportPalette(source) {
    const gridId = source === 'extracted' ? 'paletteGrid' : 'generatedPaletteGrid';
    const colorCards = document.querySelectorAll(`#${gridId} .color-card`);
    
    if (colorCards.length === 0) {
        showToast('No colors to export!');
        return;
    }
    
    let csvContent = 'Hex,RGB\n';
    colorCards.forEach(card => {
        const hex = card.querySelector('.color-hex').textContent;
        const rgb = card.querySelector('.color-rgb').textContent;
        csvContent += `${hex},${rgb}\n`;
    });
    
    downloadCSV(csvContent, 'color-palette.csv');
    showToast('Palette exported successfully!');
}

// Palette Generation
document.getElementById('genColorCount').addEventListener('input', (e) => {
    document.getElementById('genColorCountValue').textContent = e.target.value;
});

document.getElementById('baseColor').addEventListener('input', (e) => {
    document.getElementById('baseColorHex').textContent = e.target.value;
});

document.getElementById('generatePaletteBtn').addEventListener('click', () => {
    generatePalette();
});

function generatePalette() {
    const method = document.getElementById('paletteMethod').value;
    const baseColor = document.getElementById('baseColor').value;
    const count = parseInt(document.getElementById('genColorCount').value);
    
    const palette = generateColorPalette(method, baseColor, count);
    displayPalette(palette, 'generatedPaletteGrid');
    document.getElementById('generatedPaletteDisplay').style.display = 'block';
}

function generateColorPalette(method, hexColor, count) {
    const hsl = hexToHSL(hexColor);
    let hue = hsl.h;
    let sat = hsl.s;
    let light = hsl.l;
    
    const palette = [];
    
    switch (method) {
        case 'complementary':
            palette.push(hslToHex(hue, sat, light));
            palette.push(hslToHex((hue + 180) % 360, sat, light));
            for (let i = 2; i < count; i++) {
                const t = (i - 1) / (count - 1);
                const h = hue + t * 180;
                palette.push(hslToHex(h % 360, sat, light));
            }
            break;
            
        case 'analogous':
            const startHue = hue - (count - 1) * 15;
            for (let i = 0; i < count; i++) {
                palette.push(hslToHex((startHue + i * 30 + 360) % 360, sat, light));
            }
            break;
            
        case 'triadic':
            palette.push(hslToHex(hue, sat, light));
            palette.push(hslToHex((hue + 120) % 360, sat, light));
            palette.push(hslToHex((hue + 240) % 360, sat, light));
            for (let i = 3; i < count; i++) {
                palette.push(hslToHex((hue + i * 60) % 360, sat, light));
            }
            break;
            
        case 'split-complementary':
            palette.push(hslToHex(hue, sat, light));
            palette.push(hslToHex((hue + 150) % 360, sat, light));
            palette.push(hslToHex((hue + 210) % 360, sat, light));
            for (let i = 3; i < count; i++) {
                const t = (i - 3) / (count - 2);
                const h = hue + 150 + t * 60;
                palette.push(hslToHex(h % 360, sat, light));
            }
            break;
            
        case 'tetradic':
            palette.push(hslToHex(hue, sat, light));
            palette.push(hslToHex((hue + 90) % 360, sat, light));
            palette.push(hslToHex((hue + 180) % 360, sat, light));
            palette.push(hslToHex((hue + 270) % 360, sat, light));
            for (let i = 4; i < count; i++) {
                palette.push(hslToHex((hue + i * 45) % 360, sat, light));
            }
            break;
            
        case 'monochromatic':
            for (let i = 0; i < count; i++) {
                const l = Math.min(90, Math.max(10, light + (i - Math.floor(count / 2)) * 15));
                palette.push(hslToHex(hue, sat, l));
            }
            break;
    }
    
    return palette.slice(0, count);
}

function hexToHSL(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function randomizeColors() {
    const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    document.getElementById('baseColor').value = randomColor;
    document.getElementById('baseColorHex').textContent = randomColor;
    generatePalette();
}

// Gradient Builder
function addGradientColor() {
    const newColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    gradientColors.push(newColor);
    updateGradientColorsUI();
    updateGradientPreview();
}

function updateGradientColorsUI() {
    const container = document.getElementById('gradientColors');
    container.innerHTML = '';
    gradientColors.forEach((color, index) => {
        const input = document.createElement('input');
        input.type = 'color';
        input.value = color;
        input.addEventListener('input', (e) => {
            gradientColors[index] = e.target.value;
            updateGradientPreview();
        });
        container.appendChild(input);
    });
}

document.getElementById('gradientColors').addEventListener('input', (e) => {
    if (e.target.type === 'color') {
        const index = Array.from(document.getElementById('gradientColors').children).indexOf(e.target);
        gradientColors[index] = e.target.value;
        updateGradientPreview();
    }
});

document.getElementById('gradientDirection').addEventListener('change', updateGradientPreview);

function updateGradientPreview() {
    const direction = document.getElementById('gradientDirection').value;
    const preview = document.getElementById('gradientPreview');
    
    if (direction === 'circle') {
        preview.style.background = `radial-gradient(circle, ${gradientColors.join(', ')})`;
    } else {
        preview.style.background = `linear-gradient(${direction}, ${gradientColors.join(', ')})`;
    }
    
    updateGradientCode();
}

function updateGradientCode() {
    const direction = document.getElementById('gradientDirection').value;
    const code = document.getElementById('gradientCode');
    
    if (direction === 'circle') {
        code.textContent = `background: radial-gradient(circle, ${gradientColors.join(', ')});`;
    } else {
        code.textContent = `background: linear-gradient(${direction}, ${gradientColors.join(', ')});`;
    }
}

function applyGradient() {
    updateGradientPreview();
    showToast('Gradient applied!');
}

function copyGradientCode() {
    const code = document.getElementById('gradientCode').textContent;
    navigator.clipboard.writeText(code);
    showToast('Gradient code copied to clipboard!');
}

// QR Code Type Selection
document.getElementById('qrType').addEventListener('change', (e) => {
    const type = e.target.value;
    document.querySelectorAll('.qr-input').forEach(input => {
        input.classList.remove('active');
    });
    document.getElementById(`qr${type.charAt(0).toUpperCase() + type.slice(1)}Input`).classList.add('active');
});

// Logo Upload
const logoUpload = document.getElementById('logoUpload');
const logoInput = document.getElementById('logoInput');
const logoPreview = document.getElementById('logoPreview');
const logoImg = document.getElementById('logoImg');

logoUpload.addEventListener('click', () => logoInput.click());
logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleLogoUpload(file);
    }
});

function handleLogoUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        logoImage = new Image();
        logoImage.onload = () => {
            logoImg.src = logoImage.src;
            logoPreview.style.display = 'inline-flex';
            logoUpload.style.display = 'none';
        };
        logoImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeLogo() {
    logoImage = null;
    logoPreview.style.display = 'none';
    logoUpload.style.display = 'inline-block';
    logoInput.value = '';
}

// Artistic Mode Toggle
document.getElementById('artisticMode').addEventListener('change', (e) => {
    document.getElementById('artisticOptions').style.display = e.target.checked ? 'grid' : 'none';
});

// QR Size Display
document.getElementById('qrSize').addEventListener('input', (e) => {
    document.getElementById('qrSizeValue').textContent = e.target.value + 'px';
});

// Generate QR Code
document.getElementById('generateQRBtn').addEventListener('click', generateQRCode);

function generateQRCode() {
    const type = document.getElementById('qrType').value;
    let qrData = '';
    
    switch (type) {
        case 'url':
            qrData = document.getElementById('urlValue').value;
            if (!qrData) {
                showToast('Please enter a URL');
                return;
            }
            break;
            
        case 'text':
            qrData = document.getElementById('textValue').value;
            if (!qrData) {
                showToast('Please enter text');
                return;
            }
            break;
            
        case 'contact':
            const name = document.getElementById('contactName').value;
            const phone = document.getElementById('contactPhone').value;
            const email = document.getElementById('contactEmail').value;
            const org = document.getElementById('contactOrg').value;
            const address = document.getElementById('contactAddress').value;
            
            if (!name && !phone && !email) {
                showToast('Please enter at least contact name, phone, or email');
                return;
            }
            
            qrData = `BEGIN:VCARD
VERSION:3.0
FN:${name}
ORG:${org}
TEL:${phone}
EMAIL:${email}
ADR:${address}
END:VCARD`;
            break;
            
        case 'wifi':
            const ssid = document.getElementById('wifiSSID').value;
            const password = document.getElementById('wifiPassword').value;
            const security = document.getElementById('wifiSecurity').value;
            const hidden = document.getElementById('wifiHidden').checked;
            
            if (!ssid) {
                showToast('Please enter WiFi network name');
                return;
            }
            
            qrData = `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`;
            break;
    }
    
    const size = parseInt(document.getElementById('qrSize').value);
    const color = document.getElementById('qrColor').value;
    const bgColor = document.getElementById('qrBgColor').value;
    const artisticMode = document.getElementById('artisticMode').checked;
    
    const canvas = document.getElementById('qrCanvas');
    
    if (typeof QRCode === 'undefined') {
        showToast('QR code library not loaded. Please refresh the page.');
        return;
    }
    
    const options = {
        width: size,
        margin: 2,
        color: {
            dark: color,
            light: bgColor
        }
    };
    
    QRCode.toCanvas(canvas, qrData, options, (error) => {
        if (error) {
            console.error(error);
            showToast('Error generating QR code');
            return;
        }
        
        // Add logo if uploaded
        if (logoImage && !artisticMode) {
            addLogoToQR(canvas);
        }
        
        // Add artistic background if enabled
        if (artisticMode) {
            addArtisticBackground(canvas);
        }
        
        document.getElementById('qrResult').style.display = 'block';
    });
}

function addLogoToQR(canvas) {
    const ctx = canvas.getContext('2d');
    const logoSize = canvas.width * 0.2;
    const logoX = (canvas.width - logoSize) / 2;
    const logoY = (canvas.height - logoSize) / 2;
    
    // Clear center area for logo
    ctx.clearRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);
    
    // Draw white background for logo
    ctx.fillStyle = document.getElementById('qrBgColor').value;
    ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);
    
    // Draw logo
    ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);
}

function addArtisticBackground(canvas) {
    const ctx = canvas.getContext('2d');
    const pattern = document.getElementById('bgPattern').value;
    const patternColor = document.getElementById('patternColor').value;
    
    // Create temporary canvas for background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Draw artistic pattern
    tempCtx.fillStyle = patternColor;
    
    switch (pattern) {
        case 'geometric':
            drawGeometricPattern(tempCtx, canvas.width, canvas.height);
            break;
        case 'waves':
            drawWavePattern(tempCtx, canvas.width, canvas.height);
            break;
        case 'dots':
            drawDotPattern(tempCtx, canvas.width, canvas.height);
            break;
        case 'gradient':
            const gradient = tempCtx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, patternColor);
            gradient.addColorStop(1, '#ffffff');
            tempCtx.fillStyle = gradient;
            tempCtx.fillRect(0, 0, canvas.width, canvas.height);
            break;
    }
    
    // Composite: Draw background first, then QR code on top
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;
    const resultCtx = resultCanvas.getContext('2d');
    
    // Draw background
    resultCtx.drawImage(tempCanvas, 0, 0);
    
    // Draw QR code on top with some transparency
    resultCtx.globalAlpha = 0.9;
    resultCtx.drawImage(canvas, 0, 0);
    
    // Update the displayed canvas
    canvas.width = resultCanvas.width;
    canvas.height = resultCanvas.height;
    canvas.getContext('2d').drawImage(resultCanvas, 0, 0);
}

function drawGeometricPattern(ctx, width, height) {
    const size = 40;
    for (let x = 0; x < width; x += size) {
        for (let y = 0; y < height; y += size) {
            if ((x + y) % (size * 2) === 0) {
                ctx.fillRect(x, y, size, size);
            }
        }
    }
}

function drawWavePattern(ctx, width, height) {
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
        const y = height / 2 + Math.sin(x * 0.05) * 50;
        if (x === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
}

function drawDotPattern(ctx, width, height) {
    const spacing = 20;
    for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Download QR Code
function downloadQR(format) {
    const canvas = document.getElementById('qrCanvas');
    
    if (format === 'png') {
        const link = document.createElement('a');
        link.download = 'qrcode.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } else if (format === 'svg') {
        // Generate SVG from canvas
        const size = parseInt(document.getElementById('qrSize').value);
        const type = document.getElementById('qrType').value;
        let qrData = '';
        
        if (typeof QRCode === 'undefined') {
            showToast('QR code library not loaded. Please refresh the page.');
            return;
        }
        
        switch (type) {
            case 'url':
                qrData = document.getElementById('urlValue').value;
                break;
            case 'text':
                qrData = document.getElementById('textValue').value;
                break;
            case 'contact':
                const name = document.getElementById('contactName').value;
                const phone = document.getElementById('contactPhone').value;
                const email = document.getElementById('contactEmail').value;
                const org = document.getElementById('contactOrg').value;
                const address = document.getElementById('contactAddress').value;
                qrData = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${org}\nTEL:${phone}\nEMAIL:${email}\nADR:${address}\nEND:VCARD`;
                break;
            case 'wifi':
                const ssid = document.getElementById('wifiSSID').value;
                const password = document.getElementById('wifiPassword').value;
                const security = document.getElementById('wifiSecurity').value;
                const hidden = document.getElementById('wifiHidden').checked;
                qrData = `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`;
                break;
        }
        
        QRCode.toString(qrData, { type: 'svg', width: size }, (err, svgString) => {
            if (err) {
                showToast('Error generating SVG');
                return;
            }
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const link = document.createElement('a');
            link.download = 'qrcode.svg';
            link.href = URL.createObjectURL(blob);
            link.click();
        });
    }
    
    showToast(`QR code downloaded as ${format.toUpperCase()}`);
}

// Batch Processing
const csvUpload = document.getElementById('csvUpload');
const csvInput = document.getElementById('csvInput');
const processBatchBtn = document.getElementById('processBatchBtn');

csvUpload.addEventListener('click', () => csvInput.click());
csvUpload.addEventListener('dragover', (e) => {
    e.preventDefault();
    csvUpload.classList.add('dragover');
});
csvUpload.addEventListener('dragleave', () => {
    csvUpload.classList.remove('dragover');
});
csvUpload.addEventListener('drop', (e) => {
    e.preventDefault();
    csvUpload.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
        handleCSVUpload(file);
    }
});

csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleCSVUpload(file);
    }
});

function handleCSVUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const csvData = e.target.result;
        processBatchCSV(csvData);
    };
    reader.readAsText(file);
}

function processBatchCSV(csvData) {
    const lines = csvData.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const qrCodes = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length && values[0]) {
            qrCodes.push({
                name: values[0],
                url: values[1] || '',
                data: values[1] || ''
            });
        }
    }
    
    if (qrCodes.length > 0) {
        window.batchQRData = qrCodes;
        processBatchBtn.disabled = false;
        showToast(`Loaded ${qrCodes.length} QR codes from CSV`);
    } else {
        showToast('No valid QR codes found in CSV');
    }
}

processBatchBtn.addEventListener('click', () => {
    if (window.batchQRData && window.batchQRData.length > 0) {
        generateBatchQRCodes();
    }
});

document.getElementById('batchQRSize').addEventListener('input', (e) => {
    document.getElementById('batchQRSizeValue').textContent = e.target.value + 'px';
});

function generateBatchQRCodes() {
    const size = parseInt(document.getElementById('batchQRSize').value);
    const color = document.getElementById('batchQRColor').value;
    const batchGrid = document.getElementById('batchGrid');
    batchGrid.innerHTML = '';
    
    if (typeof QRCode === 'undefined') {
        showToast('QR code library not loaded. Please refresh the page.');
        return;
    }
    
    window.batchQRData.forEach((item, index) => {
        const canvas = document.createElement('canvas');
        canvas.id = `batch-qr-${index}`;
        
        const options = {
            width: size,
            margin: 2,
            color: {
                dark: color,
                light: '#ffffff'
            }
        };
        
        QRCode.toCanvas(canvas, item.data || item.url, options, (error) => {
            if (error) {
                console.error(error);
                return;
            }
            
            const qrItem = document.createElement('div');
            qrItem.className = 'batch-qr-item';
            qrItem.innerHTML = `
                <canvas id="batch-canvas-${index}" width="${size}" height="${size}"></canvas>
                <p>${item.name}</p>
            `;
            
            qrItem.querySelector('canvas').getContext('2d').drawImage(canvas, 0, 0);
            batchGrid.appendChild(qrItem);
        });
    });
    
    document.getElementById('batchResults').style.display = 'block';
}

function downloadTemplate() {
    const template = 'Name,URL/Data\nExample 1,https://example.com/page1\nExample 2,https://example.com/page2\nExample 3,https://example.com/page3';
    downloadCSV(template, 'qr-template.csv');
    showToast('Template downloaded!');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const link = document.createElement('a');
    link.download = filename;
    link.href = URL.createObjectURL(blob);
    link.click();
}

function downloadAllQR() {
    if (typeof JSZip === 'undefined') {
        showToast('JSZip library not loaded. Please refresh the page.');
        return;
    }
    
    const zip = new JSZip();
    const size = parseInt(document.getElementById('batchQRSize').value);
    const color = document.getElementById('batchQRColor').value;
    
    window.batchQRData.forEach((item, index) => {
        const canvas = document.createElement('canvas');
        
        const options = {
            width: size,
            margin: 2,
            color: {
                dark: color,
                light: '#ffffff'
            }
        };
        
        QRCode.toCanvas(canvas, item.data || item.url, options, (error) => {
            if (error) {
                console.error(error);
                return;
            }
            
            canvas.toBlob((blob) => {
                zip.file(`${item.name.replace(/[^a-z0-9]/gi, '_')}.png`, blob);
                
                if (index === window.batchQRData.length - 1) {
                    zip.generateAsync({ type: 'blob' }).then((content) => {
                        const link = document.createElement('a');
                        link.download = 'qrcodes.zip';
                        link.href = URL.createObjectURL(content);
                        link.click();
                        showToast('All QR codes downloaded!');
                    });
                }
            });
        });
    });
}

// Toast Notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
