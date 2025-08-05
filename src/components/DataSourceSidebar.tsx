import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Select, 
  Button, 
  Space, 
  Divider, 
  Input, 
  InputNumber, 
  ColorPicker, 
  List,
  Tag,
  Popconfirm,
  Card,
  Alert,
  Spin,
  Modal,
  message
} from 'antd';
import { PlusOutlined, DeleteOutlined, LoadingOutlined, EditOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  setSelectedDataSource, 
  addColorRule, 
  updateColorRule, 
  deleteColorRule 
} from '../store/slices/dataSourceSlice';
import { selectPolygon, updatePolygon, deletePolygon } from '../store/slices/polygonSlice';
import { fetchWeatherData } from '../services/weatherService';
import type { ColorRule } from '../store/slices/dataSourceSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const DataSourceSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { availableDataSources, selectedDataSourceId, isLoading, error } = useAppSelector(state => state.dataSources);
  const { polygons, selectedPolygonId } = useAppSelector(state => state.polygons);
  const { selectedStartTime, selectedEndTime } = useAppSelector(state => state.timeline);
  
  const [newRule, setNewRule] = useState<Partial<ColorRule>>({
    operator: '>',
    value: 0,
    color: '#1890ff'
  });

  const [editingPolygon, setEditingPolygon] = useState<{ id: string; name: string } | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const selectedDataSource = availableDataSources.find(ds => ds.id === selectedDataSourceId);

  // Update polygon colors when color rules change
  useEffect(() => {
    const updatePolygonColors = async () => {
      if (!selectedDataSource || polygons.length === 0) {
        console.log('🚫 Skipping polygon color update:', {
          hasDataSource: !!selectedDataSource,
          polygonCount: polygons.length
        });
        return;
      }

      console.log('🔄 Updating polygon colors with rules:', {
        dataSource: selectedDataSource.name,
        colorRules: selectedDataSource.colorRules,
        polygonCount: polygons.length,
        timeRange: { selectedStartTime, selectedEndTime }
      });

      for (const polygon of polygons) {
        try {
          console.log(`🔄 Fetching weather for polygon: ${polygon.name}`);
          await fetchWeatherData(
            polygon, 
            dispatch, 
            selectedStartTime, 
            selectedEndTime, 
            selectedDataSource.colorRules
          );
        } catch (error) {
          console.error('Error updating polygon colors:', error);
        }
      }
    };

    updatePolygonColors();
  }, [selectedDataSource?.colorRules, selectedDataSource, polygons, dispatch, selectedStartTime, selectedEndTime]);

  const handleAddRule = () => {
    if (selectedDataSource && newRule.operator && newRule.value !== undefined && newRule.color) {
      const rule: ColorRule = {
        id: `rule_${Date.now()}`,
        operator: newRule.operator as ColorRule['operator'],
        value: newRule.value,
        color: newRule.color
      };
      dispatch(addColorRule({ dataSourceId: selectedDataSource.id, rule }));
      setNewRule({ operator: '>', value: 0, color: '#1890ff' });
    }
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<ColorRule>) => {
    if (selectedDataSource) {
      dispatch(updateColorRule({ 
        dataSourceId: selectedDataSource.id, 
        ruleId, 
        updates 
      }));
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    if (selectedDataSource) {
      dispatch(deleteColorRule({ 
        dataSourceId: selectedDataSource.id, 
        ruleId 
      }));
    }
  };

  const handleEditPolygon = (polygonId: string, currentName: string) => {
    setEditingPolygon({ id: polygonId, name: currentName });
    setEditModalVisible(true);
  };

  const handleSavePolygonEdit = () => {
    if (editingPolygon) {
      dispatch(updatePolygon({ 
        id: editingPolygon.id, 
        updates: { name: editingPolygon.name } 
      }));
      setEditModalVisible(false);
      setEditingPolygon(null);
      message.success('Polygon name updated');
    }
  };

  const handleDeletePolygon = (polygonId: string, polygonName: string) => {
    dispatch(deletePolygon(polygonId));
    if (selectedPolygonId === polygonId) {
      dispatch(selectPolygon(null));
    }
    message.success(`Polygon "${polygonName}" deleted`);
  };

  const getOperatorSymbol = (operator: ColorRule['operator']) => {
    switch (operator) {
      case '=': return '=';
      case '<': return '<';
      case '>': return '>';
      case '<=': return '≤';
      case '>=': return '≥';
      default: return operator;
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {/* Loading Indicator */}
      {isLoading && (
        <div style={{ padding: '16px', textAlign: 'center' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} />} />
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary">Fetching weather data...</Text>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div style={{ padding: '16px' }}>
          <Alert
            message="Weather Data Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => dispatch({ type: 'dataSources/setError', payload: null })}
          />
        </div>
      )}

      {/* Data Source Selection */}
      <div className="sidebar-section">
        <Title level={4}>Data Source</Title>
        <Select
          style={{ width: '100%' }}
          value={selectedDataSourceId}
          onChange={(value) => dispatch(setSelectedDataSource(value))}
          disabled={isLoading}
        >
          {availableDataSources.map(ds => (
            <Option key={ds.id} value={ds.id}>
              {ds.name} ({ds.unit})
            </Option>
          ))}
        </Select>
      </div>

      {/* Color Rules */}
      {selectedDataSource && (
        <div className="sidebar-section">
          <Title level={4}>Color Rules</Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Define how data values are colored on the map
          </Text>
          
          <div style={{ marginTop: '16px' }}>
            {selectedDataSource.colorRules.map((rule) => (
              <div key={rule.id} className="color-rule-item">
                <div 
                  className="color-preview" 
                  style={{ backgroundColor: rule.color }}
                />
                <Select
                  size="small"
                  value={rule.operator}
                  onChange={(value) => handleUpdateRule(rule.id, { operator: value })}
                  style={{ width: '60px' }}
                >
                  <Option value="<">&lt;</Option>
                  <Option value="<=">&le;</Option>
                  <Option value="=">=</Option>
                  <Option value=">=">&ge;</Option>
                  <Option value=">">&gt;</Option>
                </Select>
                <InputNumber
                  size="small"
                  value={rule.value}
                  onChange={(value) => handleUpdateRule(rule.id, { value: value || 0 })}
                  style={{ width: '80px' }}
                />
                <ColorPicker
                  size="small"
                  value={rule.color}
                  onChange={(color) => handleUpdateRule(rule.id, { color: color.toHexString() })}
                />
                <Popconfirm
                  title="Delete this rule?"
                  onConfirm={() => handleDeleteRule(rule.id)}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                </Popconfirm>
              </div>
            ))}
          </div>

          {/* Add New Rule */}
          <Card size="small" style={{ marginTop: '16px' }}>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Add New Rule</Text>
            <Space wrap>
              <Select
                size="small"
                value={newRule.operator}
                onChange={(value) => setNewRule({ ...newRule, operator: value })}
                style={{ width: '60px' }}
              >
                <Option value="<">&lt;</Option>
                <Option value="<=">&le;</Option>
                <Option value="=">=</Option>
                <Option value=">=">&ge;</Option>
                <Option value=">">&gt;</Option>
              </Select>
              <InputNumber
                size="small"
                value={newRule.value}
                onChange={(value) => setNewRule({ ...newRule, value: value || 0 })}
                style={{ width: '80px' }}
                placeholder="Value"
              />
              <ColorPicker
                size="small"
                value={newRule.color}
                onChange={(color) => setNewRule({ ...newRule, color: color.toHexString() })}
              />
              <Button 
                size="small" 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddRule}
              >
                Add
              </Button>
            </Space>
          </Card>
        </div>
      )}

      <Divider />

      {/* Polygon List */}
      <div className="sidebar-section">
        <Title level={4}>Polygons ({polygons.length})</Title>
        
        {polygons.length === 0 ? (
          <Text type="secondary">
            No polygons created yet. Click "Draw Polygon" on the map to start.
          </Text>
        ) : (
          <List
            size="small"
            dataSource={polygons}
            renderItem={(polygon) => (
              <List.Item
                className={`polygon-list-item ${selectedPolygonId === polygon.id ? 'selected' : ''}`}
                onClick={() => dispatch(selectPolygon(
                  selectedPolygonId === polygon.id ? null : polygon.id
                ))}
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: selectedPolygonId === polygon.id ? '#f0f8ff' : 'transparent',
                  border: selectedPolygonId === polygon.id ? '1px solid #d4e9ff' : '1px solid transparent',
                  borderRadius: '6px',
                  marginBottom: '4px',
                  padding: '8px 12px',
                  transition: 'all 0.2s ease'
                }}
                actions={[
                  <Button
                    key="edit"
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditPolygon(polygon.id, polygon.name);
                    }}
                    title="Edit polygon name"
                  />,
                  <Popconfirm
                    key="delete"
                    title={`Delete polygon "${polygon.name}"?`}
                    description="This action cannot be undone."
                    onConfirm={(e) => {
                      e?.stopPropagation();
                      handleDeletePolygon(polygon.id, polygon.name);
                    }}
                    onCancel={(e) => e?.stopPropagation()}
                    okText="Delete"
                    cancelText="Cancel"
                    okType="danger"
                  >
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      title="Delete polygon"
                    />
                  </Popconfirm>
                ]}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: polygon.color,
                        borderRadius: '50%'
                      }}
                    />
                    <Text strong>{polygon.name}</Text>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>📍 {polygon.points.length} point{polygon.points.length !== 1 ? 's' : ''}</span>
                      {polygon.value !== undefined && polygon.value !== null && !isNaN(polygon.value) ? (
                        <Tag color="blue" style={{ margin: 0 }}>
                          🌡️ {polygon.value.toFixed(1)}{selectedDataSource?.unit || '°C'}
                        </Tag>
                      ) : (
                        <Tag color="orange" style={{ margin: 0 }}>
                          ⏳ Loading data...
                        </Tag>
                      )}
                      {selectedPolygonId === polygon.id && (
                        <Tag color="green" style={{ margin: 0 }}>
                          ✓ Selected
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Legend */}
      {selectedDataSource && selectedDataSource.colorRules.length > 0 && (
        <div className="sidebar-section">
          <Title level={4}>Legend</Title>
          <div>
            {[...selectedDataSource.colorRules]
              .sort((a, b) => a.value - b.value)
              .map((rule, index) => (
                <div key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div 
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: rule.color,
                      borderRadius: '2px'
                    }}
                  />
                  <Text style={{ fontSize: '12px' }}>
                    {getOperatorSymbol(rule.operator)} {rule.value} {selectedDataSource.unit}
                  </Text>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Edit Polygon Modal */}
      <Modal
        title="Edit Polygon"
        open={editModalVisible}
        onOk={handleSavePolygonEdit}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingPolygon(null);
        }}
        okText="Save"
        cancelText="Cancel"
      >
        <div style={{ marginBottom: '16px' }}>
          <Text>Polygon Name:</Text>
          <Input
            value={editingPolygon?.name || ''}
            onChange={(e) => setEditingPolygon(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="Enter polygon name"
            style={{ marginTop: '8px' }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default DataSourceSidebar; 