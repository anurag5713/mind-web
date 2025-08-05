# Geospatial Dashboard

A comprehensive React/TypeScript dashboard for visualizing dynamic weather data over interactive maps with timeline controls and polygon-based analysis.

## 🚀 Features

### ✅ Core Features (All Implemented)

#### 📅 Timeline Slider (Step 1)
- **30-day window** with hourly resolution
- **Dual-ended range slider** for selecting time periods
- **Single point mode** for specific hour selection
- **Quick selection buttons** (Last Hour, Last 6 Hours, Last 24 Hours)
- **Visual time display** with formatted dates and times

#### 🗺️ Interactive Map (Step 2)
- **Leaflet-based mapping** with OpenStreetMap tiles
- **Map controls**: pan, move, center reset
- **Fixed resolution** at 2 sq. km level
- **Polygon persistence** during map navigation

#### 🖍️ Polygon Drawing Tools (Step 3)
- **Interactive polygon creation** with click-to-add points
- **3-12 point limit** validation
- **Real-time polygon preview** during drawing
- **Drawing mode controls** with finish/cancel options
- **Auto data source assignment** to polygons

#### 🎛️ Data Source Sidebar (Step 4)
- **Temperature data source** integration
- **Color rule configuration** with operator support (`<`, `<=`, `=`, `>=`, `>`)
- **Visual color picker** for rule customization
- **Dynamic rule management** (add/edit/delete)
- **Real-time legend** display

#### 🎨 Dynamic Polygon Coloring (Step 5)
- **Real-time data fetching** from Open-Meteo API
- **Automatic color application** based on rules
- **Value averaging** for time ranges
- **Instant visual updates** when timeline changes

#### 🌡️ Open-Meteo API Integration (Step 6)
- **Weather data fetching** with latitude/longitude queries
- **Temperature field** (`temperature_2m`) support
- **Date range validation** and adjustment
- **Error handling** with user-friendly messages

#### ⚡ Performance Optimizations
- **Smart caching system** (5-minute cache duration)
- **Automatic cache cleanup** (max 50 entries)
- **Rate limiting protection**
- **Request timeout handling** (10 seconds)

### 🎁 Bonus Features (Implemented)

#### ✏️ Polygon Editing
- **Rename polygons** through modal interface
- **Edit button** in polygon list
- **Real-time updates** across the application

#### 📊 Enhanced UI/UX
- **Loading states** with spinners and progress indicators
- **Error alerts** with dismiss functionality
- **Tooltips and legends** for better guidance
- **Responsive design** with modern Ant Design components
- **Visual feedback** for user interactions

#### 💾 Advanced Data Management
- **State persistence** during session
- **Multiple polygon support** with individual tracking
- **Data source switching** with automatic re-coloring
- **Cache statistics** and management utilities

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Redux Toolkit
- **UI Framework**: Ant Design 5
- **Mapping**: Leaflet + React-Leaflet
- **Styling**: CSS3 + Ant Design themes
- **API**: Open-Meteo Weather API
- **Build Tool**: Create React App
- **Range Slider**: react-range

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd mind-web
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`.

## 📖 Usage Guide

### Creating Polygons
1. Click **"Draw Polygon"** button on the map
2. Click on the map to add points (minimum 3, maximum 12)
3. Click **"Finish"** to complete the polygon
4. The polygon will automatically fetch weather data and apply colors

### Using the Timeline
1. Use the **range slider** to select time periods
2. Toggle between **single point** and **range mode**
3. Use **quick selection buttons** for common time ranges
4. Watch polygons update colors automatically

### Configuring Data Sources
1. Select data source from the **sidebar dropdown**
2. Add **color rules** with operators and values
3. Choose colors using the **color picker**
4. View the **legend** for current rules

### Managing Polygons
1. Click polygons on the map to **select/deselect**
2. Use the **edit button** in the sidebar to rename
3. **Right-click** polygons to delete them
4. View polygon details in the **info panel**

## 🏗️ Architecture

### State Management
- **Redux Toolkit** for centralized state
- **Three main slices**: timeline, polygons, dataSources
- **Typed hooks** for type-safe state access

### Component Structure
```
src/
├── components/
│   ├── MapContainer.tsx      # Main map with Leaflet
│   ├── TimelineSlider.tsx    # Range slider controls
│   └── DataSourceSidebar.tsx # Data management panel
├── services/
│   └── weatherService.ts     # API integration & caching
├── store/
│   ├── slices/              # Redux state slices
│   ├── hooks.ts             # Typed Redux hooks
│   └── index.ts             # Store configuration
└── App.tsx                  # Main application layout
```

### Data Flow
1. **User interacts** with timeline or creates polygons
2. **Redux state updates** trigger useEffect hooks
3. **Weather service** fetches data (with caching)
4. **Color rules applied** and polygons updated
5. **UI reflects changes** immediately

## 🎯 API Integration

### Open-Meteo Weather API
- **Endpoint**: `https://archive-api.open-meteo.com/v1/archive`
- **Parameters**: latitude, longitude, date range, hourly temperature
- **Rate limiting**: Handled with timeout and error messages
- **Caching**: 5-minute cache to optimize requests

### Sample API Call
```javascript
const params = {
  latitude: "51.5074",
  longitude: "-0.1278", 
  start_date: "2024-01-01",
  end_date: "2024-01-02",
  hourly: "temperature_2m",
  timezone: "auto"
};
```

## 🔧 Performance Features

### Caching System
- **In-memory cache** with timestamp validation
- **Automatic cleanup** when cache grows large
- **Geographic precision** for cache keys
- **Cache statistics** available for debugging

### Optimization Strategies
- **Debounced API calls** to prevent excessive requests
- **Smart re-renders** with React.memo and useCallback
- **Efficient state updates** with Redux Toolkit
- **Loading states** to improve perceived performance

## 🐛 Error Handling

### User-Friendly Messages
- **Network timeouts**: "Request timeout. Please check your connection."
- **Rate limiting**: "API rate limit exceeded. Please try again later."
- **Server errors**: "Weather service temporarily unavailable."
- **Invalid data**: "Invalid response format from Open-Meteo API"

### Graceful Degradation
- **Fallback colors** when rules don't match
- **Default time ranges** when invalid dates provided
- **Error boundaries** to prevent application crashes

## 🧪 Development

### Available Scripts
- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Code Quality
- **TypeScript** for type safety
- **ESLint** for code quality
- **Consistent formatting** with Prettier
- **Component documentation** with JSDoc

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

---

**Built with ❤️ using React, TypeScript, and modern web technologies.** 