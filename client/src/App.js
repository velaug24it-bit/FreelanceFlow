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
import ManageProject from './pages/ManageProject';
import ProjectForm from './pages/ProjectForm';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import Contracts from './pages/Contracts';
import KanbanBoard from './pages/KanbanBoard';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import NotificationSettings from './pages/NotificationSettings';
import Pricing from './pages/Pricing';
import SubscriptionPlans from './pages/SubscriptionPlans';
import Marketplace from './pages/Marketplace';
import FreelancerProfile from './pages/FreelancerProfile';
import ConnectsShop from './pages/ConnectsShop';
import RazorpayCheckout from './pages/RazorpayCheckout';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminFreelancers from './pages/AdminFreelancers';

// Extra Authentication Pages
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerification from './pages/EmailVerification';
import OAuthRedirect from './pages/OAuthRedirect';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/verify-email/:token" element={<EmailVerification />} />
            <Route path="/oauth-redirect" element={<OAuthRedirect />} />
            <Route path="/freelancers/:id" element={<FreelancerProfile />} />
            
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

            <Route path="/marketplace/projects/:id" element={
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
            <Route path="/projects/:id/edit" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ProjectForm />
                </>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ManageProject />
                </>
              </ProtectedRoute>
            } />
            <Route path="/projects/:id/manage" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <ManageProject />
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
            <Route path="/invoices/:id" element={
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
            <Route path="/contracts" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Contracts />
                </>
              </ProtectedRoute>
            } />
            <Route path="/contracts/:id" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <Contracts />
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
            <Route path="/settings/notifications" element={
              <ProtectedRoute>
                <>
                  <Navbar />
                  <NotificationSettings />
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
