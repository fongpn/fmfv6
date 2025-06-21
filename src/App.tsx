import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './pages/Dashboard';
import { SystemSettings } from './pages/SystemSettings';
import { useAuthStore } from './store/authStore';

function App() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<SystemSettings />} />
          <Route path="/members" element={<div>Members - Coming Soon</div>} />
          <Route path="/checkin" element={<div>Check-In - Coming Soon</div>} />
          <Route path="/membership-plans" element={<div>Membership Plans - Coming Soon</div>} />
          <Route path="/coupon-templates" element={<div>Coupon Templates - Coming Soon</div>} />
          <Route path="/pos" element={<div>POS & Inventory - Coming Soon</div>} />
          <Route path="/sales" element={<div>Sales - Coming Soon</div>} />
          <Route path="/shifts" element={<div>Shifts - Coming Soon</div>} />
          <Route path="/staff" element={<div>Staff Management - Coming Soon</div>} />
          <Route path="/network-access" element={<div>Network Access - Coming Soon</div>} />
          <Route path="/data" element={<div>Data Management - Coming Soon</div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
