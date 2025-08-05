import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ColorRule {
  id: string;
  operator: '=' | '<' | '>' | '<=' | '>=';
  value: number;
  color: string;
}

export interface DataSource {
  id: string;
  name: string;
  field: string; // e.g., 'temperature_2m'
  unit: string;
  colorRules: ColorRule[];
  isActive: boolean;
}

export interface WeatherData {
  latitude: number;
  longitude: number;
  time: string[];
  temperature_2m: number[];
}

export interface DataSourceState {
  availableDataSources: DataSource[];
  selectedDataSourceId: string;
  weatherData: Record<string, WeatherData>; // keyed by polygon ID
  isLoading: boolean;
  error: string | null;
}

const defaultColorRules: ColorRule[] = [
  { id: 'rule1', operator: '<', value: 10, color: '#0000ff' },
  { id: 'rule2', operator: '>=', value: 10, color: '#00ff00' },
  { id: 'rule3', operator: '>=', value: 25, color: '#ff0000' },
];

const initialState: DataSourceState = {
  availableDataSources: [
    {
      id: 'temperature',
      name: 'Temperature (2m)',
      field: 'temperature_2m',
      unit: '°C',
      colorRules: defaultColorRules,
      isActive: true,
    },
  ],
  selectedDataSourceId: 'temperature',
  weatherData: {},
  isLoading: false,
  error: null,
};

const dataSourceSlice = createSlice({
  name: 'dataSources',
  initialState,
  reducers: {
    setSelectedDataSource: (state, action: PayloadAction<string>) => {
      state.selectedDataSourceId = action.payload;
    },
    addColorRule: (state, action: PayloadAction<{ dataSourceId: string; rule: ColorRule }>) => {
      const dataSource = state.availableDataSources.find(ds => ds.id === action.payload.dataSourceId);
      if (dataSource) {
        dataSource.colorRules.push(action.payload.rule);
      }
    },
    updateColorRule: (state, action: PayloadAction<{ dataSourceId: string; ruleId: string; updates: Partial<ColorRule> }>) => {
      const dataSource = state.availableDataSources.find(ds => ds.id === action.payload.dataSourceId);
      if (dataSource) {
        const rule = dataSource.colorRules.find(r => r.id === action.payload.ruleId);
        if (rule) {
          Object.assign(rule, action.payload.updates);
        }
      }
    },
    deleteColorRule: (state, action: PayloadAction<{ dataSourceId: string; ruleId: string }>) => {
      const dataSource = state.availableDataSources.find(ds => ds.id === action.payload.dataSourceId);
      if (dataSource) {
        dataSource.colorRules = dataSource.colorRules.filter(r => r.id !== action.payload.ruleId);
      }
    },
    setWeatherData: (state, action: PayloadAction<{ polygonId: string; data: WeatherData }>) => {
      state.weatherData[action.payload.polygonId] = action.payload.data;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setSelectedDataSource,
  addColorRule,
  updateColorRule,
  deleteColorRule,
  setWeatherData,
  setLoading,
  setError,
} = dataSourceSlice.actions;

export default dataSourceSlice.reducer; 