import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { setAdminToken } from "@/lib/adminApiClient";
import { supabase } from "@/api/supabaseClient";

export default function AdminGuard({ children }) {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (user && user.role === "admin") {
      setChecked(true);
      return;
    }

    if (sessionStorage.getItem("bb_admin_email")) {
      setChecked(true);
      return;
    }

    // If no user yet, try to get session directly from supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user?.user_metadata?.role;
        if (role === "admin" || sessionStorage.getItem("bb_admin_email")) {
          if (session.access_token) setAdminToken(session.access_token);
          setChecked(true);
        } else {
          navigate("/admin");
        }
      } else if (sessionStorage.getItem("bb_admin_email")) {
        setChecked(true);
      } else {
        navigate("/admin");
      }
    }).catch(() => {
      if (sessionStorage.getItem("bb_admin_email")) setChecked(true);
      else navigate("/admin");
    });
  }, [user, isLoadingAuth, navigate]);

  if (!checked) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
      <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return children;
}