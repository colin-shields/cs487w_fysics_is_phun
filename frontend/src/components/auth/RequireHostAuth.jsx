import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getHostCode } from "../../utils/hostAuth";

export default function RequireHostAuth() {
  if (!getHostCode()) {
    return <Navigate to="/host/login" replace />;
  }
  return <Outlet />; // Render child routes if authenticated
}
