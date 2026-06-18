import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// User Pages
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardEnhanced from './pages/DashboardEnhanced';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import Projects from './pages/Projects';
import ProjectForm from './pages/ProjectForm';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import KanbanBoard from './pages/KanbanBoard';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import SubscriptionPlans from './pages/SubscriptionPlans';
import Marketplace from './pages/Marketplace';
import ConnectsShop from './pages/ConnectsShop';
import RazorpayCheckout from './pages/RazorpayCheckout';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminFreelancers from './pages/AdminFreelancers';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Admin Routes - NO NAVBAR */}
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/admin-freelancers" element={<AdminFreelancers />} />
            
            {/* User Routes - WITH NAVBAR */}
            <Route path="/" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <DashboardEnhanced />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/pricing" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Pricing />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/marketplace" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Marketplace />
                </>
              </ProtectedRoute>
            } />

            // Add this route if you want a dedicated active projects page
<Route path="/marketplace/active" element={
    <ProtectedRoute>
        <>
            <Navbar />
            <Marketplace tab="active" />
        </>
    </ProtectedRoute>
} />
            
            <Route path="/subscription" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <SubscriptionPlans />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/connects" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ConnectsShop />
                </>
              </ProtectedRoute>
            } />

            <Route path="/checkout" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <RazorpayCheckout />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/clients" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Clients />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/clients/new" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ClientForm />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/clients/:id/edit" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ClientForm />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/projects" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Projects />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/projects/new" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ProjectForm />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/invoices" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Invoices />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/invoices/new" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <InvoiceForm />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/kanban" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <KanbanBoard />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/expenses" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Expenses />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/reports" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Reports />
                </>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Settings />
                </>
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
