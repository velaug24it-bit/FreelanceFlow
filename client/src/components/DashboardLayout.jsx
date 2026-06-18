import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, FolderOpen, FileText, 
  CreditCard, Settings, LogOut, Menu, X 
} from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/projects', icon: FolderOpen, label: 'Projects' },
    { path: '/invoices', icon: FileText, label: 'Invoices' },
    { path: '/payments', icon: CreditCard, label: 'Payments' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-white border-r">
          <div className="flex items-center h-16 px-6 border-b">
            <h1 className="text-xl font-bold text-blue-600">FreelanceFlow</h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            <nav className="px-4 py-4 space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
                >
                  <item.icon size={20} />
                  <span className="ml-3">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-600">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white border-b md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-xl font-bold text-blue-600">FreelanceFlow</h1>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
