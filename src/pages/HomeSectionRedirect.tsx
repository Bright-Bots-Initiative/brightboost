import { useEffect } from "react";
import { Navigate } from "react-router-dom";

interface HomeSectionRedirectProps {
  sectionId: string;
}

const HomeSectionRedirect = ({ sectionId }: HomeSectionRedirectProps) => {
  useEffect(() => {
    sessionStorage.setItem("bb-home-scroll", sectionId);
  }, [sectionId]);

  return <Navigate to="/" replace />;
};

export default HomeSectionRedirect;
