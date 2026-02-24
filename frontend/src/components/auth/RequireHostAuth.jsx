import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { isHostLoggedIn } from "../../utils/hostAuth";

export default function RequireHostAuth() {
  if (!isHostLoggedIn()) {
    return <Navigate to="/host/login" replace />;
  }
  return <Outlet />; // Render child routes if authenticated
}
