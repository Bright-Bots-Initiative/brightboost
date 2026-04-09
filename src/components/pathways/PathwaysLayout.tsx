/**
 * Pathways Layout — mature, clean shell for secondary-age (14-17) users.
 * Dark mode default with light toggle. Indigo/teal palette.
 */
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Home, Compass, User, Users, LogOut, Moon, Sun, BookOpen } from "lucide-react";

export default function PathwaysLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, setDark] = useState(true);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const shell = dark ? "bg-slate-950 text-slate-100" : "bg-white text-slate-900";
  const sidebar = dark ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200";
  const navActive = dark ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500" : "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-500";
  const navIdle = dark ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100";

  const isFacilitator = user?.role === "teacher";

  return (
    <div className={`min-h-screen flex ${shell} transition-colors`}>
      {/* Sidebar */}
      <nav className={`hidden md:flex flex-col w-56 border-r ${sidebar} shrink-0`}>
        <div className="p-4 border-b border-slate-800">
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Bright Boost</p>
          <p className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Pathways
          </p>
        </div>

        <div className="flex-1 py-4 space-y-1 px-2">
          <SidebarLink to="/pathways" icon={<Home className="w-4 h-4" />} label="Home" activeClass={navActive} idleClass={navIdle} end />
          <SidebarLink to="/pathways/tracks" icon={<Compass className="w-4 h-4" />} label="Tracks" activeClass={navActive} idleClass={navIdle} />
          <SidebarLink to="/pathways/profile" icon={<User className="w-4 h-4" />} label="Profile" activeClass={navActive} idleClass={navIdle} />
          {isFacilitator && (
            <>
              <SidebarLink to="/pathways/facilitator" icon={<Users className="w-4 h-4" />} label="Dashboard" activeClass={navActive} idleClass={navIdle} />
              <SidebarLink to="/pathways/facilitator/resources" icon={<BookOpen className="w-4 h-4" />} label="Resources" activeClass={navActive} idleClass={navIdle} />
            </>
          )}
        </div>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <button onClick={() => setDark((d) => !d)} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${navIdle}`}>
            {dark ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            {dark ? "Light Mode" : "Dark Mode"}
          </button>
          <button onClick={handleLogout} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs ${navIdle}`}>
            <LogOut className="w-3 h-3" /> Sign Out
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        {/* Mobile top bar */}
        <div className={`md:hidden flex items-center justify-between px-4 py-3 border-b ${sidebar}`}>
          <p className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            Pathways
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setDark((d) => !d)} className="p-1.5">
              {dark ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        <div className={`md:hidden fixed bottom-0 inset-x-0 flex items-center justify-around py-2 border-t ${sidebar}`}>
          <MobileNavLink to="/pathways" icon={<Home className="w-5 h-5" />} label="Home" dark={dark} end />
          <MobileNavLink to="/pathways/tracks" icon={<Compass className="w-5 h-5" />} label="Tracks" dark={dark} />
          <MobileNavLink to="/pathways/profile" icon={<User className="w-5 h-5" />} label="Profile" dark={dark} />
          {isFacilitator && (
            <MobileNavLink to="/pathways/facilitator" icon={<Users className="w-5 h-5" />} label="Manage" dark={dark} />
          )}
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ to, icon, label, activeClass, idleClass, end }: { to: string; icon: React.ReactNode; label: string; activeClass: string; idleClass: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? activeClass : idleClass}`}>
      {icon}
      {label}
    </NavLink>
  );
}

function MobileNavLink({ to, icon, label, dark, end }: { to: string; icon: React.ReactNode; label: string; dark: boolean; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-0.5 text-[10px] font-medium ${isActive ? (dark ? "text-indigo-400" : "text-indigo-600") : (dark ? "text-slate-500" : "text-slate-400")}`}>
      {icon}
      {label}
    </NavLink>
  );
}
