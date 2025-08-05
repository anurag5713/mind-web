import { configureStore } from '@reduxjs/toolkit';
import timelineReducer from './slices/timelineSlice';
import polygonReducer from './slices/polygonSlice';
import dataSourceReducer from './slices/dataSourceSlice';

export const store = configureStore({
  reducer: {
    timeline: timelineReducer,
    polygons: polygonReducer,
    dataSources: dataSourceReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 