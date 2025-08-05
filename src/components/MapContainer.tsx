import React, { useCallback, useEffect, useState } from 'react';
import { Button, message } from 'antd';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  startDrawing, 
  addDrawingPoint, 
  finishDrawing, 
  cancelDrawing, 
  selectPolygon,
  deletePolygon 
} from '../store/slices/polygonSlice';
import { fetchWeatherData } from '../services/weatherService';

const MapContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { polygons, isDrawing, selectedPolygonId, drawingPoints } = useAppSelector(state => state.polygons);
  const { selectedDataSourceId, availableDataSources } = useAppSelector(state => state.dataSources);
  const { selectedStartTime, selectedEndTime } = useAppSelector(state => state.timeline);
  const [mapCenter, setMapCenter] = useState({ lat: 51.505, lng: -0.09 }); // London center with clear streets
  const [zoomLevel, setZoomLevel] = useState(13); // Zoom level 13 provides approximately 2 sq. km resolution with clear streets

  const handleStartDrawing = () => {
    if (isDrawing) {
      dispatch(cancelDrawing());
    } else {
      dispatch(startDrawing());
      message.info('Click on the map to add points. Minimum 3 points required.');
    }
  };

  const handlePolygonClick = useCallback((polygonId: string) => {
    dispatch(selectPolygon(polygonId === selectedPolygonId ? null : polygonId));
  }, [dispatch, selectedPolygonId]);

  const handleDeletePolygon = useCallback((polygonId: string, e: React.MouseEvent, skipConfirmation = false) => {
    e.stopPropagation();
    
    const polygonToDelete = polygons.find(p => p.id === polygonId);
    if (!polygonToDelete) return;
    
    if (!skipConfirmation) {
      if (!window.confirm(`Delete polygon "${polygonToDelete.name}"?\n\nThis action cannot be undone.`)) {
        return;
      }
    }
    
    dispatch(deletePolygon(polygonId));
    if (selectedPolygonId === polygonId) {
      dispatch(selectPolygon(null));
    }
    message.success(`Polygon "${polygonToDelete.name}" deleted`);
  }, [dispatch, polygons, selectedPolygonId]);

  const handleDeleteAllPolygons = useCallback(() => {
    if (polygons.length === 0) {
      message.info('No polygons to delete');
      return;
    }
    
    if (window.confirm(`Delete all ${polygons.length} polygon${polygons.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.`)) {
      polygons.forEach(polygon => {
        dispatch(deletePolygon(polygon.id));
      });
      dispatch(selectPolygon(null));
      message.success(`All ${polygons.length} polygons deleted`);
    }
  }, [dispatch, polygons]);

  // Update polygon colors when timeline changes or polygons change
  useEffect(() => {
    const updatePolygonData = async () => {
      const selectedDataSource = availableDataSources.find(ds => ds.id === selectedDataSourceId);
      console.log('🔄 Updating polygon data:', {
        selectedDataSourceId,
        selectedDataSource,
        polygonCount: polygons.length,
        startTime: selectedStartTime,
        endTime: selectedEndTime
      });
      
      if (!selectedDataSource) {
        console.warn('❌ No data source selected');
        return;
      }

      for (const polygon of polygons) {
        try {
          console.log('🌡️ Fetching weather for polygon:', polygon.id, polygon.points);
          await fetchWeatherData(
            polygon, 
            dispatch, 
            selectedStartTime, 
            selectedEndTime, 
            selectedDataSource.colorRules
          );
          console.log('✅ Weather data fetched for polygon:', polygon.id);
        } catch (error) {
          console.error('❌ Error updating polygon data for', polygon.id, ':', error);
        }
      }
    };

    if (polygons.length > 0) {
      updatePolygonData();
    }
  }, [polygons, dispatch, selectedStartTime, selectedEndTime, selectedDataSourceId, availableDataSources]);

  const handleFinishDrawing = () => {
    if (drawingPoints.length >= 3) {
      const polygonName = `Polygon ${Date.now()}`;
      dispatch(finishDrawing({ name: polygonName, dataSourceId: selectedDataSourceId || 'temperature' }));
      message.success('Polygon created successfully!');
    } else {
      message.warning('A polygon needs at least 3 points');
    }
  };

  const handleCancelDrawing = () => {
    dispatch(cancelDrawing());
    message.info('Drawing cancelled');
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Convert pixel coordinates to lat/lng for 2 sq. km resolution
      const { latDelta, lngDelta } = getCoordinateDeltas(mapCenter.lat);
      
      // Calculate click position relative to map center
      const relativeX = (x / rect.width - 0.5) * 2; // -1 to 1
      const relativeY = (y / rect.height - 0.5) * 2; // -1 to 1
      
      const lat = Math.max(-85, Math.min(85, mapCenter.lat - (relativeY * latDelta)));
      const lng = Math.max(-180, Math.min(180, mapCenter.lng + (relativeX * lngDelta)));
      
      const point = { lat, lng };
      dispatch(addDrawingPoint(point));
      
      console.log('🎯 Click at:', { x: x.toFixed(0), y: y.toFixed(0) }, '→ Coords:', { lat: lat.toFixed(4), lng: lng.toFixed(4) });
    }
  };

  // Lock zoom functionality as per requirements - zoom locked at 2 sq. km resolution
  const LOCKED_ZOOM_LEVEL = 13; // Zoom level 13 provides approximately 2 sq. km resolution with clear streets
  
  // Helper function to calculate coordinate deltas for 2 sq. km resolution
  const getCoordinateDeltas = useCallback((centerLat: number) => {
    const kmPerDegreeAtLat = 111.32 * Math.cos(centerLat * Math.PI / 180);
    return {
      latDelta: 0.6 / 111.32, // About 0.6 km in latitude degrees
      lngDelta: 0.6 / kmPerDegreeAtLat // About 0.6 km in longitude degrees
    };
  }, []);
  
  const handleZoomIn = () => {
    // Zoom is locked as per requirements - no action needed
  };

  const handleZoomOut = () => {
    // Zoom is locked as per requirements - no action needed
  };

  const handleCenterReset = useCallback(() => {
    setMapCenter({ lat: 51.505, lng: -0.09 }); // London center with clear streets
    setZoomLevel(LOCKED_ZOOM_LEVEL); // Maintain locked zoom level
  }, []);

  // Mouse drag functionality
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartCenter, setDragStartCenter] = useState({ lat: 0, lng: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isDrawing) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragStartCenter(mapCenter);
      e.preventDefault();
      e.stopPropagation();
    }
  };



  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Zoom is locked as per requirements - no action needed
  };

  // Double-click to zoom in quickly
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isDrawing) {
      e.preventDefault();
      e.stopPropagation();
      setZoomLevel(prev => Math.min(prev + 3, 18)); // Fast zoom in
    }
  };

  // Add global mouse event listeners for better drag handling
  React.useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging && !isDrawing) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        // Fixed sensitivity for locked 2 sq. km resolution
        const sensitivity = 0.001; // Fixed sensitivity for consistent dragging
        const newCenter = {
          lat: dragStartCenter.lat - (deltaY * sensitivity),
          lng: dragStartCenter.lng - (deltaX * sensitivity)
        };
        
        setMapCenter(newCenter);
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });
      document.addEventListener('mouseup', handleGlobalMouseUp, { passive: true });
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, dragStartCenter, zoomLevel, isDrawing]);

  // Keyboard navigation and shortcuts for faster movement
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keyboard shortcuts if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const moveStep = 0.01;
      
      switch (e.key) {
        case '+':
        case '=':
          e.preventDefault();
          // Zoom is locked as per requirements - no action needed
          break;
        case '-':
          e.preventDefault();
          // Zoom is locked as per requirements - no action needed
          break;
        case 'ArrowUp':
          if (!isDrawing) {
            e.preventDefault();
            setMapCenter(prev => ({ ...prev, lat: prev.lat + moveStep }));
          }
          break;
        case 'ArrowDown':
          if (!isDrawing) {
            e.preventDefault();
            setMapCenter(prev => ({ ...prev, lat: prev.lat - moveStep }));
          }
          break;
        case 'ArrowLeft':
          if (!isDrawing) {
            e.preventDefault();
            setMapCenter(prev => ({ ...prev, lng: prev.lng - moveStep }));
          }
          break;
        case 'ArrowRight':
          if (!isDrawing) {
            e.preventDefault();
            setMapCenter(prev => ({ ...prev, lng: prev.lng + moveStep }));
          }
          break;
        case 'Home':
          e.preventDefault();
          handleCenterReset();
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (selectedPolygonId) {
            const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);
            if (selectedPolygon) {
              handleDeletePolygon(selectedPolygonId, e as any, false);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (isDrawing) {
            dispatch(cancelDrawing());
          } else if (selectedPolygonId) {
            dispatch(selectPolygon(null));
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, handleCenterReset, selectedPolygonId, polygons, handleDeletePolygon, dispatch]);



  // Throttled map center for better performance during dragging
  const [throttledMapCenter, setThrottledMapCenter] = useState(mapCenter);
  const [throttledZoomLevel, setThrottledZoomLevel] = useState(zoomLevel);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setThrottledMapCenter(mapCenter);
      setThrottledZoomLevel(zoomLevel);
    }, isDragging ? 100 : 50); // Longer delay while dragging

    return () => clearTimeout(timer);
  }, [mapCenter, zoomLevel, isDragging]);

  // Generate OpenStreetMap iframe URL with locked zoom for 2 sq. km resolution
  const mapUrl = React.useMemo(() => {
    // Calculate bbox for approximately 2 sq. km area using helper function
    const { latDelta, lngDelta } = getCoordinateDeltas(throttledMapCenter.lat);
    
    const bbox = {
      west: Math.max(-180, throttledMapCenter.lng - lngDelta),
      south: Math.max(-85, throttledMapCenter.lat - latDelta),
      east: Math.min(180, throttledMapCenter.lng + lngDelta),
      north: Math.min(85, throttledMapCenter.lat + latDelta)
    };
    
    // Use OpenStreetMap embed with locked zoom for 2 sq. km resolution
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}&layer=mapnik`;
  }, [throttledMapCenter.lat, throttledMapCenter.lng, getCoordinateDeltas]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {/* Drawing controls */}
      {isDrawing && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 1000,
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
            Drawing Mode ({drawingPoints.length} points)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              size="small" 
              type="primary" 
              onClick={handleFinishDrawing}
              disabled={drawingPoints.length < 3}
            >
              Finish
            </Button>
            <Button size="small" onClick={handleCancelDrawing}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Main controls */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 1000,
        background: 'white',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
      }}>
        <Button 
          type={isDrawing ? "default" : "primary"}
          onClick={handleStartDrawing}
          style={{ marginBottom: '8px', width: '140px' }}
        >
          {isDrawing ? 'Cancel Drawing' : 'Draw Polygon'}
        </Button>
        
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
          {polygons.length} polygon{polygons.length !== 1 ? 's' : ''} created
        </div>
        
        {polygons.length > 0 && (
          <Button 
            danger
            size="small"
            onClick={handleDeleteAllPolygons}
            style={{ 
              marginBottom: '8px', 
              width: '140px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '4px' 
            }}
          >
            🗑️ Delete All ({polygons.length})
          </Button>
        )}
        
        <div style={{ fontSize: '10px', color: '#999', lineHeight: '1.3' }}>
          💡 <strong>Quick Tips:</strong><br/>
          • Shift+Scroll: Fast zoom<br/>
          • Double-click: Zoom in<br/>
          • Right-click point: Delete polygon<br/>
          • Delete/Backspace: Delete selected<br/>
          • Escape: Cancel/Deselect<br/>
          • Arrow keys: Pan map<br/>
          • +/- keys: Zoom<br/>
          • Home: Reset view
        </div>
      </div>

      {/* Zoom Controls - Bottom Right Corner */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '16px',
        zIndex: 1000
      }}>
        <div style={{
          background: 'white',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Button 
            size="small"
            onClick={handleZoomIn}
            style={{ 
              width: '40px', 
              height: '40px', 
              padding: 0, 
              fontSize: '18px', 
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '6px 6px 0 0'
            }}
            title="Zoom In (Locked)"
          >
            +
          </Button>
          <div style={{
            height: '1px',
            background: '#d9d9d9'
          }} />
          <Button 
            size="small"
            onClick={handleZoomOut}
            style={{ 
              width: '40px', 
              height: '40px', 
              padding: 0, 
              fontSize: '18px', 
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '0 0 6px 6px'
            }}
            title="Zoom Out (Locked)"
          >
            −
          </Button>
        </div>
      </div>

      {/* Navigation Controls - Bottom Center Right */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        right: '70px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px'
      }}>
        {/* Quick Navigation */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <Button 
            size="small"
            onClick={() => {
              setMapCenter({ lat: 0.0, lng: 0.0 }); // Equator center
              // Zoom level remains locked at 2 sq. km resolution
            }}
            style={{ 
              width: '40px', 
              height: '30px', 
              padding: 0, 
              fontSize: '12px',
              border: 'none',
              borderRadius: '6px 6px 0 0'
            }}
            title="Equator View (2 sq. km)"
          >
            🌍
          </Button>
          <div style={{ height: '1px', background: '#d9d9d9' }} />
          <Button 
            size="small"
            onClick={handleCenterReset}
            style={{ 
              width: '40px', 
              height: '30px', 
              padding: 0, 
              fontSize: '12px',
              border: 'none',
              borderRadius: '0 0 6px 6px'
            }}
            title="Reset to London Center"
          >
            🏠
          </Button>
        </div>

        {/* Resolution Indicator */}
        <div style={{
          background: 'white',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: '4px 6px',
          fontSize: '9px',
          color: '#666',
          textAlign: 'center',
          minWidth: '40px',
          lineHeight: '1.2'
        }}>
          <div>🔒 2km²</div>
          <div style={{ fontSize: '8px', opacity: 0.7 }}>locked</div>
        </div>
      </div>

      {/* Map container with iframe */}
      <div style={{ height: '100%', width: '100%', position: 'relative' }}>
        {/* Interactive overlay for drawing and dragging */}
        <div 
          onClick={handleMapClick}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onWheel={handleWheel}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: isDrawing ? 500 : 1,
            cursor: isDrawing ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
            backgroundColor: isDrawing ? 'rgba(255, 120, 0, 0.1)' : 'transparent',
            userSelect: 'none'
          }}
        />

        {/* OpenStreetMap iframe */}
        <iframe
          src={mapUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px'
          }}
          title="OpenStreetMap"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />

        {/* Drawing points overlay */}
        {drawingPoints.map((point, index) => {
          // Consistent coordinate calculation for 2 sq. km resolution
          const { latDelta, lngDelta } = getCoordinateDeltas(mapCenter.lat);
          
          const relativeX = (point.lng - mapCenter.lng) / lngDelta; // -1 to 1 range
          const relativeY = (mapCenter.lat - point.lat) / latDelta; // -1 to 1 range
          
          const pixelX = (relativeX / 2 + 0.5) * 100; // Convert to 0-100%
          const pixelY = (relativeY / 2 + 0.5) * 100; // Convert to 0-100%
          
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: `${pixelX}%`,
                top: `${pixelY}%`,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ff7800',
                border: '3px solid white',
                transform: 'translate(-50%, -50%)',
                zIndex: 600,
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}
            />
          );
        })}

        {/* Drawing polygon preview */}
        {isDrawing && drawingPoints.length > 1 && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 580
            }}
          >
            {/* Show connecting lines for 2+ points */}
            <polyline
              points={drawingPoints.map(point => {
                const { latDelta, lngDelta } = getCoordinateDeltas(mapCenter.lat);
                
                const relativeX = (point.lng - mapCenter.lng) / lngDelta;
                const relativeY = (mapCenter.lat - point.lat) / latDelta;
                
                const pixelX = (relativeX / 2 + 0.5) * 100;
                const pixelY = (relativeY / 2 + 0.5) * 100;
                return `${pixelX}%,${pixelY}%`;
              }).join(' ')}
              fill="none"
              stroke="#ff7800"
              strokeWidth="3"
              strokeDasharray="8,4"
              opacity="0.8"
            />
            
            {/* Show filled polygon for 3+ points */}
            {drawingPoints.length > 2 && (
              <polygon
                points={drawingPoints.map(point => {
                  const { latDelta, lngDelta } = getCoordinateDeltas(mapCenter.lat);
                  
                  const relativeX = (point.lng - mapCenter.lng) / lngDelta;
                  const relativeY = (mapCenter.lat - point.lat) / latDelta;
                  
                  const pixelX = (relativeX / 2 + 0.5) * 100;
                  const pixelY = (relativeY / 2 + 0.5) * 100;
                  return `${pixelX}%,${pixelY}%`;
                }).join(' ')}
                fill="rgba(255, 120, 0, 0.2)"
                stroke="#ff7800"
                strokeWidth="2"
                strokeDasharray="5,5"
                strokeOpacity="0.9"
              />
            )}
          </svg>
        )}

        {/* Existing polygons overlay */}
        {polygons.map((polygon) => (
          <div key={polygon.id}>
            {/* Polygon outline connecting all points */}
            {polygon.points.length >= 2 && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 540
                }}
              >
                {/* Connecting lines for all polygons */}
                <polyline
                  points={polygon.points.map(point => {
                    const { latDelta, lngDelta } = getCoordinateDeltas(mapCenter.lat);
                    
                    const relativeX = (point.lng - mapCenter.lng) / lngDelta;
                    const relativeY = (mapCenter.lat - point.lat) / latDelta;
                    
                    const pixelX = (relativeX / 2 + 0.5) * 100;
                    const pixelY = (relativeY / 2 + 0.5) * 100;
                    return `${pixelX}%,${pixelY}%`;
                  }).join(' ')}
                  fill="none"
                  stroke={polygon.color}
                  strokeWidth={selectedPolygonId === polygon.id ? "4" : "3"}
                  opacity={selectedPolygonId === polygon.id ? "1" : "0.8"}
                  strokeDasharray={polygon.points.length < 3 ? "6,3" : "none"}
                />
                
                {/* Filled polygon for 3+ points */}
                {polygon.points.length > 2 && (
                  <polygon
                    points={polygon.points.map(point => {
                      const { latDelta, lngDelta } = getCoordinateDeltas(mapCenter.lat);
                      
                      const relativeX = (point.lng - mapCenter.lng) / lngDelta;
                      const relativeY = (mapCenter.lat - point.lat) / latDelta;
                      
                      const pixelX = (relativeX / 2 + 0.5) * 100;
                      const pixelY = (relativeY / 2 + 0.5) * 100;
                      return `${pixelX}%,${pixelY}%`;
                    }).join(' ')}
                    fill={`${polygon.color}30`}
                    stroke="none"
                    opacity={selectedPolygonId === polygon.id ? "0.4" : "0.2"}
                  />
                )}
              </svg>
            )}
            
            {/* Polygon points */}
            {polygon.points.map((point, index) => {
              const { latDelta, lngDelta } = getCoordinateDeltas(mapCenter.lat);
              
              const relativeX = (point.lng - mapCenter.lng) / lngDelta;
              const relativeY = (mapCenter.lat - point.lat) / latDelta;
              
              const pixelX = (relativeX / 2 + 0.5) * 100;
              const pixelY = (relativeY / 2 + 0.5) * 100;
              
              return (
                <div
                  key={`${polygon.id}-${index}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePolygonClick(polygon.id);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeletePolygon(polygon.id, e as any, false);
                  }}
                  style={{
                    position: 'absolute',
                    left: `${pixelX}%`,
                    top: `${pixelY}%`,
                    width: selectedPolygonId === polygon.id ? '14px' : '11px',
                    height: selectedPolygonId === polygon.id ? '14px' : '11px',
                    borderRadius: '50%',
                    background: polygon.color,
                    border: selectedPolygonId === polygon.id ? '3px solid white' : '2px solid rgba(255,255,255,0.9)',
                    transform: 'translate(-50%, -50%)',
                    zIndex: 550,
                    cursor: 'pointer',
                    boxShadow: selectedPolygonId === polygon.id ? '0 4px 8px rgba(0,0,0,0.4)' : '0 2px 4px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  title={`Point ${index + 1} - Right-click to delete polygon`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected polygon info */}
      {selectedPolygonId && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 1000,
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          minWidth: '200px'
        }}>
          {(() => {
            const selectedPolygon = polygons.find(p => p.id === selectedPolygonId);
            return selectedPolygon ? (
              <>
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                  {selectedPolygon.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>{selectedPolygon.points.length} points</strong>
                  </div>
                  
                  {selectedPolygon.value !== undefined && selectedPolygon.value !== null && !isNaN(selectedPolygon.value) ? (
                    <div style={{ marginBottom: '8px', padding: '8px 12px', background: '#f0f8ff', borderRadius: '6px', border: '1px solid #d4e9ff' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                        🌡️ {selectedPolygon.value.toFixed(1)}°C
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                        Average temperature
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: '8px', padding: '8px 12px', background: '#fff3cd', borderRadius: '6px', fontSize: '11px', border: '1px solid #ffeaa7' }}>
                      <div style={{ color: '#d4850c' }}>⚠️ Loading weather data...</div>
                      <div style={{ marginTop: '4px', fontSize: '10px', color: '#666' }}>
                        Check console for details
                      </div>
                    </div>
                  )}
                  
                  <div style={{ fontSize: '10px', color: '#999', marginBottom: '4px' }}>
                    Data source: <span style={{ color: '#666' }}>{selectedDataSourceId || 'None'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Button 
                    size="small" 
                    danger 
                    onClick={(e) => {
                      handleDeletePolygon(selectedPolygon.id, e as any, false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    🗑️ Delete
                  </Button>
                  <Button 
                    size="small" 
                    onClick={() => dispatch(selectPolygon(null))}
                  >
                    ✕ Close
                  </Button>
                </div>
                
                <div style={{ 
                  marginTop: '8px', 
                  fontSize: '10px', 
                  color: '#999', 
                  textAlign: 'center',
                  borderTop: '1px solid #f0f0f0',
                  paddingTop: '6px'
                }}>
                  💡 Tip: Right-click any point to delete this polygon
                </div>
              </>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default MapContainer; 