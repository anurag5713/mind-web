import React, { useCallback } from 'react';
import { Button, Space, Typography, Switch } from 'antd';
import { Range } from 'react-range';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { setSelectedTimeRange, setSelectedTime, toggleRangeMode } from '../store/slices/timelineSlice';

const { Text } = Typography;

const TimelineSlider: React.FC = () => {
  const dispatch = useAppDispatch();
  const { startTime, endTime, selectedStartTime, selectedEndTime, isRangeMode } = useAppSelector(
    (state) => state.timeline
  );

  const startTimestamp = startTime.getTime();
  const endTimestamp = endTime.getTime();
  const selectedStartTimestamp = selectedStartTime.getTime();
  const selectedEndTimestamp = selectedEndTime.getTime();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRangeChange = useCallback((values: number[]) => {
    const [start, end] = values;
    if (isRangeMode) {
      dispatch(setSelectedTimeRange({
        start: new Date(start),
        end: new Date(end)
      }));
    } else {
      dispatch(setSelectedTime(new Date(start)));
    }
  }, [dispatch, isRangeMode]);

  const getRenderTrack = useCallback(({ props, children }: any) => (
    <div
      onMouseDown={props.onMouseDown}
      onTouchStart={props.onTouchStart}
      style={{
        ...props.style,
        height: '6px',
        width: '100%',
        backgroundColor: '#ddd',
        borderRadius: '3px',
        cursor: 'pointer'
      }}
    >
      {children}
    </div>
  ), []);

  const getRenderThumb = useCallback(({ props, isDragged }: any) => (
    <div
      {...props}
      style={{
        ...props.style,
        height: '20px',
        width: '20px',
        backgroundColor: isDragged ? '#1890ff' : '#52c41a',
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        cursor: 'pointer',
        outline: 'none'
      }}
    />
  ), []);

  // Ensure values are within bounds and valid
  const clampedStartTimestamp = Math.max(startTimestamp, Math.min(selectedStartTimestamp, endTimestamp));
  const clampedEndTimestamp = Math.max(startTimestamp, Math.min(selectedEndTimestamp, endTimestamp));
  
  const values = isRangeMode 
    ? [clampedStartTimestamp, clampedEndTimestamp]
    : [clampedStartTimestamp];

  return (
    <div className="timeline-container">
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong>Timeline Control</Text>
        <Space>
          <Text>Single Point</Text>
          <Switch 
            checked={isRangeMode} 
            onChange={() => dispatch(toggleRangeMode())}
          />
          <Text>Range</Text>
        </Space>
      </div>

      <div style={{ margin: '20px 0', padding: '0 10px' }}>
        {startTimestamp < endTimestamp && (
          <Range
            key={isRangeMode ? 'range' : 'single'} // Force re-render on mode change
            values={values}
            step={3600000} // 1 hour in milliseconds
            min={startTimestamp}
            max={endTimestamp}
            onChange={handleRangeChange}
            renderTrack={getRenderTrack}
            renderThumb={getRenderThumb}
            allowOverlap={false}
          />
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
        <div>
          <Text type="secondary">Start: </Text>
          <Text>{formatDate(startTimestamp)}</Text>
        </div>
        <div>
          <Text type="secondary">End: </Text>
          <Text>{formatDate(endTimestamp)}</Text>
        </div>
      </div>

      <div style={{ marginTop: '12px', textAlign: 'center' }}>
        <Text strong>
          Selected: {formatDate(clampedStartTimestamp)}
          {isRangeMode && clampedStartTimestamp !== clampedEndTimestamp && 
            ` - ${formatDate(clampedEndTimestamp)}`
          }
        </Text>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
        <Button 
          size="small" 
          onClick={() => {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            if (isRangeMode) {
              dispatch(setSelectedTimeRange({ start: oneHourAgo, end: now }));
            } else {
              dispatch(setSelectedTime(now));
            }
          }}
        >
          Last Hour
        </Button>
        <Button 
          size="small" 
          onClick={() => {
            const now = new Date();
            const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
            if (isRangeMode) {
              dispatch(setSelectedTimeRange({ start: sixHoursAgo, end: now }));
            } else {
              dispatch(setSelectedTime(now));
            }
          }}
        >
          Last 6 Hours
        </Button>
        <Button 
          size="small" 
          onClick={() => {
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            if (isRangeMode) {
              dispatch(setSelectedTimeRange({ start: oneDayAgo, end: now }));
            } else {
              dispatch(setSelectedTime(now));
            }
          }}
        >
          Last 24 Hours
        </Button>
      </div>
    </div>
  );
};

export default TimelineSlider; 