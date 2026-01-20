# Free Color Palette Generator & Extractor

A comprehensive web application for extracting colors from images, generating color palettes, and creating beautiful, customizable QR codes.

## Features

### 🎨 Color Extraction
- Extract dominant colors from uploaded images
- Support for JPG, PNG, and WebP formats
- Adjustable number of colors to extract (3-20)
- Click any color to copy it to clipboard
- Export palettes as CSV

### 🌈 Color Palette Generation
- Multiple generation methods:
  - Complementary
  - Analogous
  - Triadic
  - Split Complementary
  - Tetradic
  - Monochromatic
- Customizable base color
- Adjustable number of colors
- Randomize button for quick inspiration

### 🎯 Gradient Builder
- Create multi-color gradients
- Support for linear and radial gradients
- Adjustable direction and angles
- Copy CSS code with one click
- Add unlimited colors to gradient

### 📱 QR Code Generator
- **Multiple Input Types:**
  - URLs
  - Plain text
  - Contact cards (vCard format)
  - WiFi network credentials

- **Branding Options:**
  - Upload custom logos
  - Customize QR code colors
  - Set background colors

- **AI Artistic Mode:**
  - Geometric patterns
  - Wave patterns
  - Dot patterns
  - Gradient backgrounds

### 📦 Batch Processing
- Upload CSV files for bulk QR code generation
- Perfect for events, exhibitions, and campaigns
- Download all QR codes as a ZIP file
- Customizable size and colors for batch generation

### 📥 Export Options
- Download QR codes as PNG or SVG
- Export color palettes as CSV
- High-quality output for print and digital use

## Technologies Used

- **HTML5**: Structure and semantics
- **CSS3**: Modern styling with gradients and animations
- **Vanilla JavaScript**: Core functionality
- **QRCode.js**: QR code generation
- **Color Thief**: Color extraction from images
- **JSZip**: ZIP file creation for batch downloads

## Deployment to Cloudflare Pages

### Method 1: Direct Upload (Recommended)

1. Go to [Cloudflare Pages](https://pages.cloudflare.com/)
2. Click "Create a project"
3. Select "Upload assets" or "Direct upload"
4. Upload the following files:
   - `index.html`
   - `styles.css`
   - `app.js`

5. Click "Deploy site"

### Method 2: Git Integration

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to Cloudflare Pages
3. Click "Create a project"
4. Connect your Git account
5. Select the repository
6. Configure build settings (not required for static sites)
7. Click "Save and Deploy"

### Build Settings (if using a build process)

Since this is a static site, no build process is required. If you want to use a custom domain or additional settings:

```yaml
build:
  command: echo "No build command required"
  output_directory: /
```

## Usage

### Extracting Colors
1. Go to the "Extract Colors" tab
2. Upload an image by clicking or dragging
3. Adjust the number of colors using the slider
4. Click "Extract Colors"
5. Click any color to copy it
6. Export palette as CSV

### Generating Palettes
1. Go to the "Generate Palette" tab
2. Select a generation method
3. Choose a base color
4. Set the number of colors
5. Click "Generate Palette"
6. Use "Randomize" for different variations

### Creating QR Codes
1. Go to the "QR Code Generator" tab
2. Select QR code type (URL, Text, Contact, WiFi)
3. Enter your data
4. Customize branding (logo, colors)
5. Enable artistic mode if desired
6. Set the size
7. Click "Generate QR Code"
8. Download as PNG or SVG

### Batch Processing
1. Go to the "Batch Processing" tab
2. Download the CSV template
3. Fill in your data (Name, URL/Data)
4. Upload the CSV file
5. Adjust batch settings
6. Click "Process Batch"
7. Download all QR codes as ZIP

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

This project is open source and available under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the GitHub repository.
