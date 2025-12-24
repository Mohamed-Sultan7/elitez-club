import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const adminEmails = [
  "ichrakchraibi5@gmail.com",
  "mohamed.sultan.7744@gmail.com",
  "toparabg@gmail.com",
];

const ProtectionLoader = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const isAdmin = !!(user && adminEmails.includes(user.email));
    const existing = document.getElementById("hamody-protection");
    if (!isAdmin && !existing) {
      const script = document.createElement("script");
      script.id = "hamody-protection";
      script.src = "https://protection.hamody.dev/protection.js?v=" + new Date().getTime();
      document.head.appendChild(script);
    }
    if (isAdmin && existing) {
      existing.remove();
      (document as any).oncontextmenu = null;
      (document as any).onkeydown = null;
      (document as any).oncopy = null;
      (document as any).oncut = null;
      (document as any).onpaste = null;
      (document as any).ondragstart = null;
    }
  }, [user, loading]);

  return null;
};

export default ProtectionLoader;
