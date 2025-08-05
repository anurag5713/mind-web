import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface Polygon {
  id: string;
  name: string;
  points: PolygonPoint[];
  dataSourceId: string;
  color: string;
  value?: number; // Current data value
  isEditing?: boolean;
}

export interface PolygonState {
  polygons: Polygon[];
  isDrawing: boolean;
  selectedPolygonId: string | null;
  drawingPoints: PolygonPoint[];
}

const initialState: PolygonState = {
  polygons: [],
  isDrawing: false,
  selectedPolygonId: null,
  drawingPoints: [],
};

const polygonSlice = createSlice({
  name: 'polygons',
  initialState,
  reducers: {
    startDrawing: (state) => {
      state.isDrawing = true;
      state.drawingPoints = [];
    },
    addDrawingPoint: (state, action: PayloadAction<PolygonPoint>) => {
      state.drawingPoints.push(action.payload);
    },
    finishDrawing: (state, action: PayloadAction<{ name: string; dataSourceId: string }>) => {
      if (state.drawingPoints.length >= 3) {
        const newPolygon: Polygon = {
          id: `polygon_${Date.now()}`,
          name: action.payload.name,
          points: [...state.drawingPoints],
          dataSourceId: action.payload.dataSourceId,
          color: '#3388ff',
        };
        state.polygons.push(newPolygon);
      }
      state.isDrawing = false;
      state.drawingPoints = [];
    },
    cancelDrawing: (state) => {
      state.isDrawing = false;
      state.drawingPoints = [];
    },
    updatePolygon: (state, action: PayloadAction<{ id: string; updates: Partial<Polygon> }>) => {
      const index = state.polygons.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.polygons[index] = { ...state.polygons[index], ...action.payload.updates };
      }
    },
    deletePolygon: (state, action: PayloadAction<string>) => {
      state.polygons = state.polygons.filter(p => p.id !== action.payload);
    },
    selectPolygon: (state, action: PayloadAction<string | null>) => {
      state.selectedPolygonId = action.payload;
    },
    updatePolygonColor: (state, action: PayloadAction<{ id: string; color: string; value?: number }>) => {
      const index = state.polygons.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.polygons[index].color = action.payload.color;
        if (action.payload.value !== undefined) {
          state.polygons[index].value = action.payload.value;
        }
      }
    },
  },
});

export const {
  startDrawing,
  addDrawingPoint,
  finishDrawing,
  cancelDrawing,
  updatePolygon,
  deletePolygon,
  selectPolygon,
  updatePolygonColor,
} = polygonSlice.actions;

export default polygonSlice.reducer; 