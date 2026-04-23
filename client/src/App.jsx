import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import AppRoutes from "./app/routes";

console.log("🎯 App component rendering...");

export default function App() {
  console.log("✅ App component loaded");
  
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 2500,
            style: {
              borderRadius: "14px",
              padding: "14px 16px",
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}