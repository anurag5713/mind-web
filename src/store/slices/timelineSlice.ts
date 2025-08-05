import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TimelineState {
  startTime: Date;
  endTime: Date;
  selectedStartTime: Date;
  selectedEndTime: Date;
  isRangeMode: boolean; // true for dual-ended, false for single point
}

const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

const initialState: TimelineState = {
  startTime: thirtyDaysAgo,
  endTime: now,
  selectedStartTime: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
  selectedEndTime: now,
  isRangeMode: true,
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    setSelectedTimeRange: (state, action: PayloadAction<{ start: Date; end: Date }>) => {
      state.selectedStartTime = action.payload.start;
      state.selectedEndTime = action.payload.end;
    },
    setSelectedTime: (state, action: PayloadAction<Date>) => {
      state.selectedStartTime = action.payload;
      state.selectedEndTime = action.payload;
    },
    toggleRangeMode: (state) => {
      state.isRangeMode = !state.isRangeMode;
      if (!state.isRangeMode) {
        state.selectedEndTime = state.selectedStartTime;
      }
    },
    setTimelineWindow: (state, action: PayloadAction<{ start: Date; end: Date }>) => {
      state.startTime = action.payload.start;
      state.endTime = action.payload.end;
    },
  },
});

export const { setSelectedTimeRange, setSelectedTime, toggleRangeMode, setTimelineWindow } = timelineSlice.actions;
export default timelineSlice.reducer; 