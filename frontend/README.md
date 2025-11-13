# GoodRoad - Video Submission & Validation Module

**Developer:** Wijerathna P. G. S. P. (IT22148872)  
**Component:** Video Submission and Validation Module  
**Tech Stack:** React (Frontend), Python/Django (Backend - simulated)

## 🎨 Design Theme

- **Color Palette:** Light Gray, Red, and White
- **UI Framework:** Tailwind CSS
- **Icons:** Lucide React

## ✨ Features

1. **Video Upload with Validation**
   - MP4 format validation
   - File size limit (50MB)
   - Duration validation (< 2 minutes)
   - Real-time metadata extraction

2. **Metadata Form**
   - Violation Type selection
   - Location (GPS/Road)
   - Date & Time captured
   - TIN Number
   - Bank Account details
   - Additional notes

3. **Deep Fake Detection Visualization**
   - "System Analyzing" phase display
   - Simulated MesoNet AI processing
   - Progress indicators
   - Confidence scoring

4. **Submission Dashboard**
   - Track all submissions
   - Real-time status updates
   - Authentic vs. Rejected classification
   - Detailed submission metadata

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
# Create optimized production build
npm run build
```

The `build` folder will contain the production-ready files.

### Serve Production Build Locally

```bash
# Install serve globally (if not already installed)
npm install -g serve

# Serve the build folder
serve -s build
```

## 📁 Project Structure

```
goodroad-frontend/
├── public/
│   └── index.html
├── src/
│   ├── App.js          # Main application component
│   ├── index.js        # Entry point
│   ├── index.css       # Global styles with Tailwind
│   └── ...
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
└── package.json
```

## 🔧 Key Components

### Video Upload Validation
- Format check: Only MP4 files accepted
- Size validation: Maximum 50MB
- Duration validation: Must be less than 2 minutes
- Client-side metadata extraction

### Deep Fake Detection Simulation
- Simulates Python/Django backend processing
- Three-stage workflow:
  1. Upload & validation
  2. System Analyzing (MesoNet AI)
  3. Confidence scoring & result

### Dashboard Features
- Real-time status tracking
- Submission history
- Authentic clip counter
- AI check statistics

## 🎯 Usage

1. **Submit a Video:**
   - Click "Report Violation" in the navigation
   - Upload an MP4 video file (< 2 minutes, < 50MB)
   - Fill in all required metadata fields
   - Click "Submit Report"

2. **View Dashboard:**
   - Click "My Dashboard" in the navigation
   - See all submissions with their status
   - Monitor deep fake detection progress
   - View confidence scores for verified/rejected videos

## 🔗 Integration Notes

This frontend is designed to integrate with a Python/Django backend that:
- Handles video file uploads
- Runs MesoNet AI for deep fake detection
- Returns confidence scores
- Manages submission status

Currently, the backend is **simulated** for demonstration purposes. Replace the `simulateDeepFakeAnalysis` function in `App.js` with actual API calls when connecting to your Django backend.

## 📝 Available Scripts

- `npm start` - Runs development server
- `npm run build` - Creates production build
- `npm test` - Runs test suite
- `npm run eject` - Ejects from Create React App (one-way operation)

## 🎨 Customization

### Tailwind Configuration
Edit `tailwind.config.js` to customize:
- Colors (brand red, gray, slate)
- Animations (progress-indeterminate, pulse-soft)
- Shadows and other design tokens

### Theme Colors
The app uses:
- **Red:** `#dc2626` (bg-red-600)
- **Gray:** `#f9fafb` (bg-gray-50)
- **White:** Standard white backgrounds

## 📦 Dependencies

- `react` - UI library
- `react-dom` - React DOM rendering
- `tailwindcss` - Utility-first CSS framework
- `lucide-react` - Icon library
- `postcss` & `autoprefixer` - CSS processing

## 🐛 Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Clear node_modules and reinstall if needed
- Check Node.js version compatibility

### Tailwind Not Working
- Verify `tailwind.config.js` content paths are correct
- Ensure `@tailwind` directives are in `src/index.css`
- Restart the development server after config changes

## 📄 License

This project is part of the GoodRoad system for SLIIT Y4 S1.

---

**Note:** This is a frontend-only implementation with simulated backend functionality for demonstration purposes.
