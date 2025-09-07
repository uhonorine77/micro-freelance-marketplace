import React, { ReactNode } from "react";
import { Briefcase } from "lucide-react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({
  title,
  subtitle,
  children,
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {}
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-block" aria-label="Home">
            <Briefcase className="mx-auto h-12 w-auto text-indigo-600" />
          </Link>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            {title}
          </h2>
          {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        </div>
        <div className="bg-white p-8 shadow-sm border border-gray-200 rounded-lg animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
