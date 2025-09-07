// client/src/pages/auth/CheckEmail.tsx
import React from "react";
import { useLocation, Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import { MailCheck } from "lucide-react";

const CheckEmail: React.FC = () => {
  const location = useLocation();
  const state = location.state as { message: string; details: string } | null;

  const message = state?.message || "Check your email";
  const details =
    state?.details || "We have sent instructions to your email address.";

  return (
    <AuthLayout title={message}>
      <div className="text-center">
        <MailCheck className="mx-auto h-16 w-16 text-green-500" />
        <p className="mt-4 text-gray-700 dark:text-gray-300">{details}</p>
        <div className="mt-6">
          <Link
            to="/login"
            className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CheckEmail;
