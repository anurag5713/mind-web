import axios from 'axios';
import { Dispatch } from '@reduxjs/toolkit';
import { setWeatherData, setLoading, setError } from '../store/slices/dataSourceSlice';
import { updatePolygonColor } from '../store/slices/polygonSlice';
import type { Polygon } from '../store/slices/polygonSlice';
import type { WeatherData, ColorRule } from '../store/slices/dataSourceSlice';

const OPEN_METEO_BASE_URL = 'https://archive-api.open-meteo.com/v1/archive';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const weatherDataCache = new Map<string, { data: OpenMeteoResponse; timestamp: number }>();

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
}

// Generate cache key for weather data
const generateCacheKey = (
  latitude: number, 
  longitude: number, 
  startDate: string, 
  endDate: string
): string => {
  return `${latitude.toFixed(4)}_${longitude.toFixed(4)}_${startDate}_${endDate}`;
};

// Check if cached data is still valid
const isCacheValid = (timestamp: number): boolean => {
  return Date.now() - timestamp < CACHE_DURATION;
};

// Get cached weather data if available and valid
const getCachedWeatherData = (
  latitude: number, 
  longitude: number, 
  startDate: string, 
  endDate: string
): OpenMeteoResponse | null => {
  const cacheKey = generateCacheKey(latitude, longitude, startDate, endDate);
  const cached = weatherDataCache.get(cacheKey);
  
  if (cached && isCacheValid(cached.timestamp)) {
    console.log('Using cached weather data for', cacheKey);
    return cached.data;
  }
  
  // Remove expired cache entry
  if (cached) {
    weatherDataCache.delete(cacheKey);
  }
  
  return null;
};

// Cache weather data
const cacheWeatherData = (
  latitude: number, 
  longitude: number, 
  startDate: string, 
  endDate: string, 
  data: OpenMeteoResponse
): void => {
  const cacheKey = generateCacheKey(latitude, longitude, startDate, endDate);
  weatherDataCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  console.log('Cached weather data for', cacheKey);
  
  // Clean up old cache entries (keep only last 50 entries)
  if (weatherDataCache.size > 50) {
    const entries = Array.from(weatherDataCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 10 entries
    for (let i = 0; i < 10; i++) {
      weatherDataCache.delete(entries[i][0]);
    }
  }
};

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

// Format date for API (YYYY-MM-DD format)
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Validate date range for Open-Meteo API (max 30 days for archive data)
const validateDateRange = (startDate: Date, endDate: Date): { isValid: boolean; adjustedStart?: Date; adjustedEnd?: Date; message?: string } => {
  const now = new Date();
  const maxRangeDays = 30;
  const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

  // Check if dates are too far in the future
  if (startDate > now) {
    return {
      isValid: false,
      adjustedStart: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      adjustedEnd: now,
      message: 'Start date cannot be in the future. Adjusted to last 24 hours.'
    };
  }

  // Check if range is too large
  if (rangeDays > maxRangeDays) {
    return {
      isValid: false,
      adjustedStart: new Date(endDate.getTime() - maxRangeDays * 24 * 60 * 60 * 1000),
      adjustedEnd: endDate,
      message: `Date range too large (${rangeDays} days). Maximum is ${maxRangeDays} days. Adjusted range to fit.`
    };
  }

  // Check if dates are too old (Open-Meteo archive goes back to 1940)
  const oldestDate = new Date('1940-01-01');
  if (startDate < oldestDate) {
    return {
      isValid: false,
      adjustedStart: oldestDate,
      adjustedEnd: endDate,
      message: `Start date too old. Adjusted to ${formatDateForAPI(oldestDate)}.`
    };
  }

  return { isValid: true };
};

// Apply color rules to determine polygon color
export const applyColorRules = (value: number, colorRules: ColorRule[]): string => {
  console.log(`🔍 Applying color rules:`, { value, rulesCount: colorRules?.length });
  
  if (!colorRules || colorRules.length === 0) {
    console.log(`⚪ No color rules, using default color`);
    return '#3388ff'; // Default color
  }

  // Sort rules by value to apply them in order (ascending)
  const sortedRules = [...colorRules].sort((a, b) => a.value - b.value);
  console.log(`📊 Sorted rules:`, sortedRules.map(r => `${r.operator} ${r.value} = ${r.color}`));
  
  // Apply rules in order - last matching rule wins
  let matchedColor = '#3388ff'; // Default color
  
  for (const rule of sortedRules) {
    let matches = false;
    
    switch (rule.operator) {
      case '<':
        matches = value < rule.value;
        break;
      case '<=':
        matches = value <= rule.value;
        break;
      case '=':
        matches = Math.abs(value - rule.value) < 0.1;
        break;
      case '>=':
        matches = value >= rule.value;
        break;
      case '>':
        matches = value > rule.value;
        break;
    }
    
    console.log(`🔄 Rule ${rule.operator} ${rule.value}: ${value} ${rule.operator} ${rule.value} = ${matches} -> ${matches ? rule.color : 'no change'}`);
    
    if (matches) {
      matchedColor = rule.color;
    }
  }
  
  console.log(`🎨 Final color: ${matchedColor}`);
  return matchedColor;
};

// Calculate average value for time range
export const calculateAverageValue = (
  data: number[], 
  timeArray: string[], 
  startTime: Date, 
  endTime: Date
): number => {
  const values: number[] = [];
  
  console.log('🔢 Calculating average for:', {
    dataLength: data.length,
    timeArrayLength: timeArray.length,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    sampleData: data.slice(0, 5),
    sampleTimes: timeArray.slice(0, 5)
  });
  
  timeArray.forEach((timeStr, index) => {
    const time = new Date(timeStr);
    if (time >= startTime && time <= endTime && data[index] !== null && data[index] !== undefined) {
      values.push(data[index]);
    }
  });
  
  console.log('📊 Values found in time range:', values.length, 'values:', values.slice(0, 5));
  
  if (values.length === 0) {
    console.warn('⚠️ No values found in time range, using most recent data');
    // If no values in time range, use the most recent available data
    const validData = data.filter(val => val !== null && val !== undefined);
    if (validData.length > 0) {
      const recent = validData[validData.length - 1];
      console.log('🔄 Using most recent value:', recent);
      return recent;
    }
    return 0;
  }
  
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  console.log('🌡️ Calculated average temperature:', average.toFixed(2) + '°C');
  return average;
};

// Fetch weather data for a polygon (with caching)
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
    
    // Default to last 7 days if no time range provided (better data availability)
    const endDate = selectedEndTime || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    const startDate = selectedStartTime || new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days before yesterday
    
    console.log('📅 Using date range:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      isCustomRange: !!(selectedStartTime && selectedEndTime)
    });
    
    // Validate and adjust date range if necessary
    const validation = validateDateRange(startDate, endDate);
    const actualStartDate = validation.adjustedStart || startDate;
    const actualEndDate = validation.adjustedEnd || endDate;
    
    if (!validation.isValid && validation.message) {
      console.warn('Date range adjusted:', validation.message);
    }
    
    const startDateStr = formatDateForAPI(actualStartDate);
    const endDateStr = formatDateForAPI(actualEndDate);
    
    // Check cache first
    let data = getCachedWeatherData(
      parseFloat(centroid.lat.toFixed(4)), 
      parseFloat(centroid.lng.toFixed(4)), 
      startDateStr, 
      endDateStr
    );
    
    // Fetch from API if not cached
    if (!data) {
      const params = {
        latitude: centroid.lat.toFixed(4),
        longitude: centroid.lng.toFixed(4),
        start_date: startDateStr,
        end_date: endDateStr,
        hourly: 'temperature_2m',
        timezone: 'auto'
      };
      
      console.log('Fetching weather data from API:', params);
      
      const response = await axios.get<OpenMeteoResponse>(OPEN_METEO_BASE_URL, { 
        params,
        timeout: 10000 // 10 second timeout
      });
      data = response.data;
      
      // Cache the response
      cacheWeatherData(
        parseFloat(centroid.lat.toFixed(4)), 
        parseFloat(centroid.lng.toFixed(4)), 
        startDateStr, 
        endDateStr, 
        data
      );
    }
    
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
        actualStartDate,
        actualEndDate
      );
      
      // Apply color rules if provided
      const color = applyColorRules(averageValue, colorRules || []);
      dispatch(updatePolygonColor({ 
        id: polygon.id, 
        color, 
        value: averageValue 
      }));
      
      console.log(`🎨 Color Rules Applied:`, {
        polygonName: polygon.name,
        temperature: `${averageValue.toFixed(1)}°C`,
        colorRules: colorRules?.map(r => `${r.operator} ${r.value} = ${r.color}`),
        appliedColor: color,
        rulesCount: colorRules?.length || 0
      });
    } else {
      throw new Error('Invalid response format from Open-Meteo API');
    }
    
  } catch (error) {
    console.error('Error fetching weather data:', error);
    let errorMessage = 'Failed to fetch weather data';
    
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 429) {
        errorMessage = 'API rate limit exceeded. Please try again later.';
      } else if (error.response?.status && error.response.status >= 500) {
        errorMessage = 'Weather service temporarily unavailable.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please check your connection.';
      } else if (error.response?.data?.reason) {
        errorMessage = `API Error: ${error.response.data.reason}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
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

// Clear cache (utility function)
export const clearWeatherDataCache = (): void => {
  weatherDataCache.clear();
  console.log('Weather data cache cleared');
};

// Get cache statistics (utility function)
export const getCacheStats = (): { size: number; entries: Array<{ key: string; age: number }> } => {
  const now = Date.now();
  const entries = Array.from(weatherDataCache.entries()).map(([key, value]) => ({
    key,
    age: Math.round((now - value.timestamp) / 1000) // age in seconds
  }));
  
  return {
    size: weatherDataCache.size,
    entries
  };
}; 