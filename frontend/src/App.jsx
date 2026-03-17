import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { NextUIProvider } from '@nextui-org/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Jobs from './pages/Jobs';
import Applications from './pages/Applications';
import MyUploads from './pages/MyUploads';
import Review from './pages/Review';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Permissions from './pages/Permissions';
import Unauthorized from './pages/Unauthorized';
import ProtectedRoute from './components/ProtectedRoute';

// Bridge component to connect socket events to auth context
function SocketAuthBridge() {
  const { subscribe, isConnected } = useSocket();
  const { updatePermissions } = useAuth();

  useEffect(() => {
    if (!isConnected) return;

    // Listen for permission updates
    const unsubscribe = subscribe('permission:updated', (data) => {
      console.log('[SocketAuthBridge] Permission updated:', data);
      if (data?.permissions) {
        updatePermissions(data.permissions);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isConnected, subscribe, updatePermissions]);

  return null; // This component only handles side effects
}

function App() {
  return (
    <NextUIProvider>
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <SocketAuthBridge />
            <ToastProvider>
              <Router>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Navigate to="/login" replace />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/jobs" element={<Jobs />} />
                    <Route path="/applications" element={<Applications />} />
                    <Route path="/my-uploads" element={<MyUploads />} />
                    <Route path="/review" element={<Review />} />
                    <Route path="/users" element={<Users />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/permissions" element={<Permissions />} />
                  </Route>

                  <Route path="/unauthorized" element={<Unauthorized />} />
                </Routes>
              </Router>
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </NextUIProvider>
  );
}

export default App;
