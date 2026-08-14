import {  useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { checkLogin } from "./auth";

interface PublicRouteProps {
  children: ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const verify = async () => {
      const isValid = await checkLogin();
      setIsAuthorized(isValid);
    };
    verify();
  }, []);

  if (isAuthorized === null) return
  <div>Loading...</div> ;

  // If authorized, don't show the Login/Landing page, send to Dashboard
  return isAuthorized ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

export default PublicRoute;