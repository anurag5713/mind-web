import React, { useCallback, useEffect, useRef } from 'react';
import { MapContainer as LeafletMap, TileLayer, Polygon, useMapEvents } from 'react-leaflet';
import { Button, message } from 'antd';
import L from 'leaflet';
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

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const DrawingHandler: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isDrawing, drawingPoints } = useAppSelector(state => state.polygons);
  const { selectedDataSourceId } = useAppSelector(state => state.dataSources);

  useMapEvents({
    click: (e) => {
      if (isDrawing) {
        const point = { lat: e.latlng.lat, lng: e.latlng.lng };
        dispatch(addDrawingPoint(point));
      }
    },
  });

  const handleFinishDrawing = () => {
    if (drawingPoints.length >= 3) {
      const polygonName = `Polygon ${Date.now()}`;
      dispatch(finishDrawing({ name: polygonName, dataSourceId: selectedDataSourceId }));
      message.success('Polygon created successfully!');
    } else {
      message.warning('A polygon needs at least 3 points');
    }
  };

  const handleCancelDrawing = () => {
    dispatch(cancelDrawing());
    message.info('Drawing cancelled');
  };

  return (
    <>
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
      
      {/* Render drawing points as temporary polygon */}
      {isDrawing && drawingPoints.length > 2 && (
        <Polygon
          positions={drawingPoints.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: '#ff7800',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.3,
            dashArray: '5, 5'
          }}
        />
      )}
    </>
  );
};

const MapContainer: React.FC = () => {
  const dispatch = useAppDispatch();
  const { polygons, isDrawing, selectedPolygonId } = useAppSelector(state => state.polygons);
  const { selectedDataSourceId } = useAppSelector(state => state.dataSources);
  const mapRef = useRef<L.Map>(null);

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

  const handleDeletePolygon = useCallback((polygonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(deletePolygon(polygonId));
    message.success('Polygon deleted');
  }, [dispatch]);

  // Update polygon colors when timeline changes
  useEffect(() => {
    const updatePolygonData = async () => {
      for (const polygon of polygons) {
        try {
          await fetchWeatherData(polygon, dispatch);
        } catch (error) {
          console.error('Error updating polygon data:', error);
        }
      }
    };

    if (polygons.length > 0) {
      updatePolygonData();
    }
  }, [polygons, dispatch]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
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
          style={{ marginBottom: '8px' }}
        >
          {isDrawing ? 'Cancel Drawing' : 'Draw Polygon'}
        </Button>
        <div style={{ fontSize: '12px', color: '#666' }}>
          {polygons.length} polygon{polygons.length !== 1 ? 's' : ''} created
        </div>
      </div>

      <LeafletMap
        ref={mapRef}
        center={[51.505, -0.09]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <DrawingHandler />
        
        {polygons.map((polygon) => (
          <Polygon
            key={polygon.id}
            positions={polygon.points.map(p => [p.lat, p.lng])}
            pathOptions={{
              color: polygon.color,
              weight: selectedPolygonId === polygon.id ? 3 : 2,
              opacity: 0.8,
              fillOpacity: selectedPolygonId === polygon.id ? 0.5 : 0.3,
            }}
            eventHandlers={{
              click: () => handlePolygonClick(polygon.id),
              contextmenu: (e) => handleDeletePolygon(polygon.id, e as any),
            }}
          >
            {/* You can add popup content here if needed */}
          </Polygon>
        ))}
      </LeafletMap>

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
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {selectedPolygon.points.length} points
                  {selectedPolygon.value !== undefined && (
                    <div>Current value: {selectedPolygon.value.toFixed(1)}°C</div>
                  )}
                </div>
                <Button 
                  size="small" 
                  danger 
                  onClick={(e) => handleDeletePolygon(selectedPolygon.id, e)}
                >
                  Delete Polygon
                </Button>
              </>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

export default MapContainer; 