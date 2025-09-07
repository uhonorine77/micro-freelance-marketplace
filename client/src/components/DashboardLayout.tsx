// client/src/components/DashboardLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet /> 
      </main>
    </div>
  );
};

export default DashboardLayout;