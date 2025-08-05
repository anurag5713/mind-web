import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { Button, Space, Typography, Switch, Slider } from 'antd';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setSelectedTimeRange, setSelectedTime, toggleRangeMode } from '../store/slices/timelineSlice';

const { Text } = Typography;

const TimelineSlider: React.FC = () => {
  const dispatch = useAppDispatch();
  const { startTime, endTime, selectedStartTime, selectedEndTime, isRangeMode } = useAppSelector(
    (state) => state.timeline
  );
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Memoize timestamps to prevent unnecessary re-renders
  const timestamps = useMemo(() => ({
    start: startTime.getTime(),
    end: endTime.getTime(),
    selectedStart: selectedStartTime.getTime(),
    selectedEnd: selectedEndTime.getTime()
  }), [startTime, endTime, selectedStartTime, selectedEndTime]);
  
  // Simple initialization
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSliderChange = useCallback((value: number | number[]) => {
    try {
      console.log('📅 Timeline change:', { isRangeMode, value });
      
      if (isRangeMode && Array.isArray(value)) {
        const [start, end] = value;
        dispatch(setSelectedTimeRange({
          start: new Date(start),
          end: new Date(end)
        }));
      } else if (!isRangeMode && typeof value === 'number') {
        dispatch(setSelectedTime(new Date(value)));
      }
    } catch (error) {
      console.warn('Timeline change error:', error);
    }
  }, [dispatch, isRangeMode]);

  // Get slider values based on mode
  const sliderValue = useMemo(() => {
    if (isRangeMode) {
      return [timestamps.selectedStart, timestamps.selectedEnd];
    } else {
      return timestamps.selectedStart;
    }
  }, [isRangeMode, timestamps.selectedStart, timestamps.selectedEnd]);

  // Ensure we have valid values and component is initialized
  if (!isInitialized || timestamps.start >= timestamps.end) {
    return (
      <div className="timeline-container">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Text type="secondary">Loading timeline...</Text>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-container">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Timeline Control</Text>
        <Space>
          <Text style={{ color: !isRangeMode ? '#1890ff' : '#666' }}>📍 Single Point</Text>
          <Switch 
            checked={isRangeMode} 
            onChange={() => {
              console.log('🔄 Switching range mode:', !isRangeMode);
              dispatch(toggleRangeMode());
            }}
            style={{ margin: '0 4px' }}
          />
          <Text style={{ color: isRangeMode ? '#1890ff' : '#666' }}>📊 Range</Text>
        </Space>
      </div>

      <div style={{ margin: '20px 0', padding: '0 20px' }}>
        {isRangeMode ? (
          <Slider
            range
            value={sliderValue as number[]}
            min={timestamps.start}
            max={timestamps.end}
            step={900000} // 15 minutes in milliseconds
            onChange={handleSliderChange}
            tooltip={{
              formatter: (value?: number) => value ? formatDate(value) : ''
            }}
          />
        ) : (
          <Slider
            value={sliderValue as number}
            min={timestamps.start}
            max={timestamps.end}
            step={900000} // 15 minutes in milliseconds
            onChange={handleSliderChange}
            tooltip={{
              formatter: (value?: number) => value ? formatDate(value) : ''
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div>
          <Text type="secondary">Start: </Text>
          <Text>{formatDate(timestamps.start)}</Text>
        </div>
        <div>
          <Text type="secondary">End: </Text>
          <Text>{formatDate(timestamps.end)}</Text>
        </div>
      </div>

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Text strong>
          Selected: {formatDate(Array.isArray(sliderValue) ? sliderValue[0] : sliderValue)}
          {isRangeMode && Array.isArray(sliderValue) && sliderValue[0] !== sliderValue[1] && 
            ` - ${formatDate(sliderValue[1])}`
          }
        </Text>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button 
          size="small" 
          onClick={() => {
            const now = new Date(Math.min(Date.now(), timestamps.end));
            const oneHourAgo = new Date(Math.max(now.getTime() - 60 * 60 * 1000, timestamps.start));
            console.log('⏰ Setting Last Hour:', { start: oneHourAgo, end: now, isRangeMode });
            if (isRangeMode) {
              dispatch(setSelectedTimeRange({ start: oneHourAgo, end: now }));
            } else {
              dispatch(setSelectedTime(now));
            }
          }}
        >
          ⏰ Last Hour
        </Button>
        <Button 
          size="small" 
          onClick={() => {
            const now = new Date(Math.min(Date.now(), timestamps.end));
            const sixHoursAgo = new Date(Math.max(now.getTime() - 6 * 60 * 60 * 1000, timestamps.start));
            console.log('⏰ Setting Last 6 Hours:', { start: sixHoursAgo, end: now, isRangeMode });
            if (isRangeMode) {
              dispatch(setSelectedTimeRange({ start: sixHoursAgo, end: now }));
            } else {
              dispatch(setSelectedTime(now));
            }
          }}
        >
          📊 Last 6 Hours
        </Button>
        <Button 
          size="small" 
          onClick={() => {
            const now = new Date(Math.min(Date.now(), timestamps.end));
            const oneDayAgo = new Date(Math.max(now.getTime() - 24 * 60 * 60 * 1000, timestamps.start));
            console.log('⏰ Setting Last 24 Hours:', { start: oneDayAgo, end: now, isRangeMode });
            if (isRangeMode) {
              dispatch(setSelectedTimeRange({ start: oneDayAgo, end: now }));
            } else {
              dispatch(setSelectedTime(now));
            }
          }}
        >
          📅 Last 24 Hours
        </Button>
      </div>
    </div>
  );
};

export default TimelineSlider; 