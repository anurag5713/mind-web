import React, { useState } from 'react';
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
  Card
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { 
  setSelectedDataSource, 
  addColorRule, 
  updateColorRule, 
  deleteColorRule 
} from '../store/slices/dataSourceSlice';
import { selectPolygon } from '../store/slices/polygonSlice';
import type { ColorRule } from '../store/slices/dataSourceSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const DataSourceSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { availableDataSources, selectedDataSourceId } = useAppSelector(state => state.dataSources);
  const { polygons, selectedPolygonId } = useAppSelector(state => state.polygons);
  
  const [newRule, setNewRule] = useState<Partial<ColorRule>>({
    operator: '>',
    value: 0,
    color: '#1890ff'
  });

  const selectedDataSource = availableDataSources.find(ds => ds.id === selectedDataSourceId);

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
      {/* Data Source Selection */}
      <div className="sidebar-section">
        <Title level={4}>Data Source</Title>
        <Select
          style={{ width: '100%' }}
          value={selectedDataSourceId}
          onChange={(value) => dispatch(setSelectedDataSource(value))}
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
                style={{ cursor: 'pointer' }}
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
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                    {polygon.points.length} points
                    {polygon.value !== undefined && (
                      <Tag color="blue" style={{ marginLeft: '8px' }}>
                        {polygon.value.toFixed(1)}{selectedDataSource?.unit}
                      </Tag>
                    )}
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
    </div>
  );
};

export default DataSourceSidebar; 