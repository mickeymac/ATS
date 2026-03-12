import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Failed to fetch profile', error);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = jwtDecode(token);
          // Check if token is expired
          if (decoded.exp * 1000 < Date.now()) {
            logout();
          } else {
            // Fetch full profile to get profile_image and permissions
            const profile = await fetchUserProfile();
            if (profile) {
              setUser({ 
                email: profile.email || decoded.sub, 
                role: profile.role || decoded.role,
                name: profile.name,
                profile_image: profile.profile_image,
                permissions: profile.permissions || {}
              });
            } else {
              setUser({ email: decoded.sub, role: decoded.role, permissions: {} });
            }
          }
        } catch {
          logout();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);
      const response = await api.post('/auth/login', params);
      const { access_token, role } = response.data;
      localStorage.setItem('token', access_token);
      // Fetch profile to get full user data including profile_image and permissions
      const profile = await fetchUserProfile();
      if (profile) {
        setUser({ 
          email: profile.email || email, 
          role: profile.role || role,
          name: profile.name,
          profile_image: profile.profile_image,
          permissions: profile.permissions || {}
        });
      } else {
        setUser({ email, role, permissions: {} });
      }
      return { success: true };
    } catch (error) {
      console.error('Login failed', error);
      const errorMessage = error.response?.data?.detail || 'Network error. Please try again.';
      return { success: false, error: errorMessage };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      await api.post('/auth/register', { name, email, password, role });
      return true;
    } catch (error) {
      console.error('Registration failed', error);
      throw error;
    }
  };

  const updateUser = (userData) => {
    if (userData) {
      setUser(prev => ({
        ...prev,
        email: userData.email || prev?.email,
        name: userData.name || prev?.name,
        role: userData.role || prev?.role,
        profile_image: userData.profile_image || prev?.profile_image,
        permissions: userData.permissions || prev?.permissions || {}
      }));
    }
  };

  // Update permissions only (used by socket events)
  const updatePermissions = useCallback((newPermissions) => {
    setUser(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        permissions: newPermissions
      };
    });
  }, []);

  // Helper function to check if user has a specific permission
  const hasPermission = (permission) => {
    if (!user) return false;
    // Admin always has all permissions
    if (user.role === 'admin') return true;
    return user.permissions?.[permission] === true;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, updateUser, updatePermissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
