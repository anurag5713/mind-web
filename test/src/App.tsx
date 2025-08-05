import React from 'react';
import { Layout } from 'antd';
import TimelineSlider from './components/TimelineSlider';
import MapContainer from './components/MapContainer';
import DataSourceSidebar from './components/DataSourceSidebar';
import './App.css';

const { Header, Content, Sider } = Layout;

const App: React.FC = () => {
  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ padding: '0 24px', background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Geospatial Dashboard
          </h1>
        </div>
      </Header>
      
      <Layout>
        <Content style={{ padding: '24px', background: '#f0f2f5' }}>
          <div style={{ marginBottom: '24px', background: '#fff', padding: '16px', borderRadius: '8px' }}>
            <TimelineSlider />
          </div>
          
          <div style={{ height: 'calc(100vh - 200px)', background: '#fff', borderRadius: '8px', overflow: 'hidden' }}>
            <MapContainer />
          </div>
        </Content>
        
        <Sider 
          width={350} 
          style={{ 
            background: '#fff', 
            borderLeft: '1px solid #f0f0f0',
            overflow: 'auto'
          }}
        >
          <DataSourceSidebar />
        </Sider>
      </Layout>
    </Layout>
  );
};

export default App; 