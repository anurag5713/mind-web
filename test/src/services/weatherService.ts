import axios from 'axios';
import { Dispatch } from '@reduxjs/toolkit';
import { setWeatherData, setLoading, setError } from '../store/slices/dataSourceSlice';
import { updatePolygonColor } from '../store/slices/polygonSlice';
import type { Polygon } from '../store/slices/polygonSlice';
import type { WeatherData, ColorRule } from '../store/slices/dataSourceSlice';

const OPEN_METEO_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
}

// Calculate polygon centroid
export const getPolygonCentroid = (points: Array<{lat: number, lng: number}>) => {
  let lat = 0;
  let lng = 0;
  
  points.forEach(point => {
    lat += point.lat;
    lng += point.lng;
  });
  
  return {
    lat: lat / points.length,
    lng: lng / points.length
  };
};

// Format date for API
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Apply color rules to determine polygon color
export const applyColorRules = (value: number, colorRules: ColorRule[]): string => {
  // Sort rules by value to apply them in order
  const sortedRules = [...colorRules].sort((a, b) => a.value - b.value);
  
  for (const rule of sortedRules) {
    switch (rule.operator) {
      case '<':
        if (value < rule.value) return rule.color;
        break;
      case '<=':
        if (value <= rule.value) return rule.color;
        break;
      case '=':
        if (Math.abs(value - rule.value) < 0.1) return rule.color;
        break;
      case '>=':
        if (value >= rule.value) return rule.color;
        break;
      case '>':
        if (value > rule.value) return rule.color;
        break;
    }
  }
  
  // Default color if no rules match
  return '#3388ff';
};

// Calculate average value for time range
export const calculateAverageValue = (
  data: number[], 
  timeArray: string[], 
  startTime: Date, 
  endTime: Date
): number => {
  const values: number[] = [];
  
  timeArray.forEach((timeStr, index) => {
    const time = new Date(timeStr);
    if (time >= startTime && time <= endTime && data[index] !== null && data[index] !== undefined) {
      values.push(data[index]);
    }
  });
  
  if (values.length === 0) return 0;
  
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

// Fetch weather data for a polygon
export const fetchWeatherData = async (
  polygon: Polygon, 
  dispatch: Dispatch,
  selectedStartTime?: Date,
  selectedEndTime?: Date,
  colorRules?: ColorRule[]
): Promise<void> => {
  try {
    dispatch(setLoading(true));
    dispatch(setError(null));
    
    const centroid = getPolygonCentroid(polygon.points);
    
    // Default to last 24 hours if no time range provided
    const endDate = selectedEndTime || new Date();
    const startDate = selectedStartTime || new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    const params = {
      latitude: centroid.lat.toFixed(4),
      longitude: centroid.lng.toFixed(4),
      start_date: formatDateForAPI(startDate),
      end_date: formatDateForAPI(endDate),
      hourly: 'temperature_2m',
      timezone: 'auto'
    };
    
    const response = await axios.get<OpenMeteoResponse>(OPEN_METEO_BASE_URL, { params });
    const data = response.data;
    
    if (data.hourly && data.hourly.temperature_2m && data.hourly.time) {
      const weatherData: WeatherData = {
        latitude: data.latitude,
        longitude: data.longitude,
        time: data.hourly.time,
        temperature_2m: data.hourly.temperature_2m
      };
      
      // Store the raw weather data
      dispatch(setWeatherData({ polygonId: polygon.id, data: weatherData }));
      
      // Calculate average value for the selected time range
      const averageValue = calculateAverageValue(
        data.hourly.temperature_2m,
        data.hourly.time,
        startDate,
        endDate
      );
      
      // Apply color rules if provided
      if (colorRules && colorRules.length > 0) {
        const color = applyColorRules(averageValue, colorRules);
        dispatch(updatePolygonColor({ 
          id: polygon.id, 
          color, 
          value: averageValue 
        }));
      } else {
        // Update with just the value
        dispatch(updatePolygonColor({ 
          id: polygon.id, 
          color: polygon.color, 
          value: averageValue 
        }));
      }
    }
    
  } catch (error) {
    console.error('Error fetching weather data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch weather data';
    dispatch(setError(errorMessage));
  } finally {
    dispatch(setLoading(false));
  }
};

// Fetch weather data for multiple polygons
export const fetchWeatherDataForPolygons = async (
  polygons: Polygon[],
  dispatch: Dispatch,
  selectedStartTime: Date,
  selectedEndTime: Date,
  colorRules: ColorRule[]
): Promise<void> => {
  const promises = polygons.map(polygon => 
    fetchWeatherData(polygon, dispatch, selectedStartTime, selectedEndTime, colorRules)
  );
  
  try {
    await Promise.all(promises);
  } catch (error) {
    console.error('Error fetching weather data for multiple polygons:', error);
  }
};

// Mock data function for testing (optional)
export const getMockWeatherData = (polygon: Polygon): WeatherData => {
  const centroid = getPolygonCentroid(polygon.points);
  const now = new Date();
  const timeArray: string[] = [];
  const temperatureArray: number[] = [];
  
  // Generate 24 hours of mock data
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    timeArray.push(time.toISOString());
    
    // Generate mock temperature based on location and time
    const baseTemp = 15 + Math.sin(centroid.lat * Math.PI / 180) * 10;
    const hourVariation = Math.sin((23 - i) * Math.PI / 12) * 5;
    const randomVariation = (Math.random() - 0.5) * 4;
    
    temperatureArray.push(baseTemp + hourVariation + randomVariation);
  }
  
  return {
    latitude: centroid.lat,
    longitude: centroid.lng,
    time: timeArray,
    temperature_2m: temperatureArray
  };
}; 