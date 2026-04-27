import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

console.log("🚀 UniLife Hub starting...");

try {
  const rootElement = document.getElementById("root");
  
  if (!rootElement) {
    throw new Error("Root element not found");
  }

  console.log("✅ Root element found, rendering app...");

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  console.log("✅ App rendered successfully");
} catch (error) {
  console.error("❌ Failed to render app:", error);
  
  // Fallback error display
  document.body.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; padding: 20px;">
      <div style="max-width: 500px; padding: 40px; background: white; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center;">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h1 style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 10px;">Failed to Load Application</h1>
        <p style="color: #64748b; margin-bottom: 20px;">${error.message}</p>
        <button onclick="window.location.reload()" style="background: linear-gradient(135deg, #4f46e5, #2563eb); color: white; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer;">
          Reload Page
        </button>
      </div>
    </div>
  `;
}