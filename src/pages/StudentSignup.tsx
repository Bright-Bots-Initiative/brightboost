import { Navigate } from "react-router-dom";

/** Preserve bookmarked links to the former public registration form. */
export default function StudentSignup() {
  return <Navigate to="/class-login" replace />;
}
