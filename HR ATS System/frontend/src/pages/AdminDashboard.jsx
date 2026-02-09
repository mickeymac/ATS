import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const { logout, user } = useAuth();
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'hr' });

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/');
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/', newUser);
      setShowCreateUser(false);
      fetchUsers();
      alert('User created successfully');
    } catch (error) {
      console.error("Error creating user", error);
      alert('Failed to create user');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600" />
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">Welcome, {user.email}</span>
          <button onClick={logout} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">User Management</h2>
          <button 
            onClick={() => setShowCreateUser(true)}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          >
            + Create HR/Admin
          </button>
        </div>
        <table className="min-w-full text-left">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} className="border-b">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3 uppercase text-xs font-bold text-gray-600">{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded w-96">
            <h2 className="text-xl font-bold mb-4">Create User</h2>
            <form onSubmit={handleCreateUser}>
              <input 
                placeholder="Name" 
                className="w-full border p-2 mb-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={newUser.name}
                onChange={e => setNewUser({...newUser, name: e.target.value})}
                required
              />
              <input 
                type="email"
                placeholder="Email" 
                className="w-full border p-2 mb-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={newUser.email}
                onChange={e => setNewUser({...newUser, email: e.target.value})}
                required
              />
              <input 
                type="password"
                placeholder="Password" 
                className="w-full border p-2 mb-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={newUser.password}
                onChange={e => setNewUser({...newUser, password: e.target.value})}
                required
              />
              <select
                className="w-full border p-2 mb-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newUser.role}
                onChange={e => setNewUser({...newUser, role: e.target.value})}
              >
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
                <option value="candidate">Candidate</option>
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateUser(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
