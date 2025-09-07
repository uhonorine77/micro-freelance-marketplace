// client/src/pages/Login.tsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../contexts/AuthContext";
import { useMutation } from "react-query";
import { authApi } from "../services/api";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { toast } from "react-toastify";
import { AxiosResponse, AxiosError } from "axios";
import { ApiResponse } from "../types";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isNotVerified, setIsNotVerified] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "verified") {
      toast.success(
        "Your email has been verified successfully! You can now log in."
      );
    } else if (status === "verification-failed") {
      toast.error(
        "Email verification failed. The link may be invalid or expired."
      );
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const loginMutation = useMutation(
    (credentials: LoginFormData) => login(credentials),
    {
      onSuccess: () => {
        navigate("/dashboard");
      },
      onError: (error: any) => {
        if (error.data?.notVerified) {
          setIsNotVerified(true);
        }
        toast.error(error.error || "Login failed.");
      },
    }
  );

  const resendMutation = useMutation<
    AxiosResponse<ApiResponse>,
    AxiosError<ApiResponse>,
    void
  >({
    mutationFn: authApi.resendVerification,
    onSuccess: (data) => {
      toast.info(data.data.message);
    },
    onError: (_error) => {
      toast.error("Failed to resend email.");
    },
  });
  // --- END OF CORRECTION ---

  const onSubmit = (data: LoginFormData) => {
    setIsNotVerified(false);
    loginMutation.mutate(data);
  };

  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle={
        <>
          Or{" "}
          <Link
            to="/register"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            create a new account
          </Link>
        </>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {isNotVerified && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  Your email is not verified.
                  <button
                    type="button"
                    onClick={() => resendMutation.mutate()}
                    disabled={resendMutation.isLoading}
                    className="font-medium underline text-yellow-800 dark:text-yellow-100 hover:text-yellow-900 dark:hover:text-yellow-50 ml-2 disabled:opacity-50"
                  >
                    {resendMutation.isLoading
                      ? "Sending..."
                      : "Resend verification email"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register("email")}
                type="email"
                className="block w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                placeholder="Email address"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                {...register("password")}
                type={showPassword ? "text" : "password"}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end">
          <div className="text-sm">
            <Link
              to="/forgot-password"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Forgot your password?
            </Link>
          </div>
        </div>
        <button
          type="submit"
          disabled={loginMutation.isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {loginMutation.isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Login;
