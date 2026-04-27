import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingState from "./common/LoadingState";

export default function ProtectedRoute({ children, roles = [] }) {
  const { user, bootLoading, routeByRole } = useAuth();

  if (bootLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState compact />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length && !roles.includes(user.role)) {
    return <Navigate to={routeByRole(user.role)} replace />;
  }

  return children;
}