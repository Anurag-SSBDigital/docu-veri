import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const { session } = useAuth();
//   return session ? <>{children}</> : <Navigate to="/login" />;
// };

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { session, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return session ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
