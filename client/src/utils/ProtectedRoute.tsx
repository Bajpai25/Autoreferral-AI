import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { checkLogin } from "./auth";

export interface ProtectedRouteProps {
  children: ReactNode; 
}

const ProtectedRoute = ({ children }:ProtectedRouteProps) => {
  const [isAuthorized, setIsAuthorized] = useState<any>(null); // null = loading
  const location = useLocation();

  useEffect(() => {
    const verify = async () => {
      // 1. Check if token is in URL (from your redirect)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');

      if (urlToken) {
        sessionStorage.setItem("authToken", urlToken);
        // Clean URL immediately
        window.history.replaceState({}, document.title, location.pathname);
      }

      // 2. Validate token (URL token or existing session token)
      const isValid = await checkLogin();
      setIsAuthorized(isValid);
    };

    verify();
  }, [location.pathname]);

  if (isAuthorized === null) return 
  <div>Loading...</div>;
  // console.log(isAuthorized);

  return isAuthorized ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;