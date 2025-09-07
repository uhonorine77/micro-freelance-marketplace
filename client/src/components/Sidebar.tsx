// client/src/components/Sidebar.tsx
import React from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";
import {
  LayoutDashboard,
  Briefcase,
  PlusCircle,
  Bell,
  User,
  Shield,
  LogOut,
  Settings,
  UserCheck,
} from "lucide-react";

const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();

  const commonLinks = [
    { to: "/dashboard", icon: LayoutDashboard, text: "Dashboard" },
    { to: "/notifications", icon: Bell, text: "Notifications" },
  ];

  const clientLinks = [
    ...commonLinks,
    { to: "/tasks/my-projects", icon: Briefcase, text: "My Projects" },
    { to: "/tasks/new", icon: PlusCircle, text: "Post a Project" },
  ];

  const freelancerLinks = [
    ...commonLinks,
    { to: "/tasks/browse", icon: Briefcase, text: "Browse Projects" },
    { to: "/tasks/my-bids", icon: UserCheck, text: "My Bids" },
  ];

  const adminLinks = [{ to: "/admin", icon: Shield, text: "Admin Dashboard" }];

  const links =
    user?.role === UserRole.client
      ? clientLinks
      : user?.role === UserRole.freelancer
      ? freelancerLinks
      : commonLinks;
  const bottomLinks = user?.role === UserRole.admin ? adminLinks : [];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? "bg-indigo-600 text-white shadow-md"
        : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
    }`;

  if (!user) return null;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      <div className="h-16 flex items-center justify-center border-b border-gray-200">
        <Link to="/dashboard" className="flex items-center space-x-2">
          <Briefcase className="h-8 w-8 text-indigo-600" />
          <span className="text-xl font-bold text-gray-800">FreelanceHub</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} className={navLinkClass}>
            <link.icon className="h-5 w-5 mr-3" />
            <span className="font-medium">{link.text}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 pb-6 mt-auto">
        {bottomLinks.length > 0 && (
          <nav className="space-y-2 mb-6 pt-6 border-t">
            {bottomLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={navLinkClass}>
                <link.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{link.text}</span>
              </NavLink>
            ))}
          </nav>
        )}
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <img
              src={
                user.avatarUrl ||
                `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}`
              }
              alt="User Avatar"
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="ml-3">
              <p className="font-semibold text-sm text-gray-800">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user.role}</p>
            </div>
          </div>
          <div className="flex items-center justify-around mt-4 text-gray-500">
            <Link to="/profile" className="hover:text-indigo-600">
              <User className="h-5 w-5" />
            </Link>
            <Link to="/settings" className="hover:text-indigo-600">
              <Settings className="h-5 w-5" />
            </Link>
            <button onClick={logout} className="hover:text-red-600">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
