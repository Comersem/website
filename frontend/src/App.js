import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { QuoteProvider } from "./context/QuoteContext";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import AdminLogin from "./pages/AdminLogin";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QuoteProvider>
          <div className="App min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/buscar" element={<SearchPage />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </div>
          <Toaster richColors position="top-center" />
        </QuoteProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
