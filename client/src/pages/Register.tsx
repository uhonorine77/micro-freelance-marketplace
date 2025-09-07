// client/src/pages/Register.tsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User as UserIcon,
  Briefcase,
  Eye,
  EyeOff,
  Mail,
  Lock,
} from "lucide-react";
import { UserRole } from "../types";
import AuthLayout from "../components/AuthLayout";
import { useMutation } from "react-query";
import { authApi } from "../services/api";
import { toast } from "react-toastify";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.nativeEnum(UserRole, { required_error: "Please select a role" }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const mutation = useMutation(authApi.register, {
    onSuccess: (data) => {
      toast.success(data.data.message);
      navigate("/check-email", {
        state: {
          message: "Account Created!",
          details:
            "We have sent a verification link to your email. Please check your inbox to activate your account.",
        },
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Registration failed.");
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    mutation.mutate(data);
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Or{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            sign in to your existing account
          </Link>
        </>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="sr-only">
              First Name
            </label>
            <input
              {...register("firstName")}
              type="text"
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent"
              placeholder="First Name"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="lastName" className="sr-only">
              Last Name
            </label>
            <input
              {...register("lastName")}
              type="text"
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent"
              placeholder="Last Name"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              {...register("email")}
              type="email"
              className="block w-full pl-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent"
              placeholder="Email address"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
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
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent"
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            I want to:
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="relative">
              <input
                {...register("role")}
                type="radio"
                value={UserRole.client}
                className="sr-only peer"
              />
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer peer-checked:border-indigo-600 dark:peer-checked:bg-gray-700">
                <Briefcase className="h-6 w-6 text-gray-600 mx-auto mb-2 dark:text-gray-300" />
                <div className="text-center font-medium">Hire</div>
              </div>
            </label>
            <label className="relative">
              <input
                {...register("role")}
                type="radio"
                value={UserRole.freelancer}
                className="sr-only peer"
              />
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer peer-checked:border-indigo-600 dark:peer-checked:bg-gray-700">
                <UserIcon className="h-6 w-6 text-gray-600 mx-auto mb-2 dark:text-gray-300" />
                <div className="text-center font-medium">Work</div>
              </div>
            </label>
          </div>
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={mutation.isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
        >
          {mutation.isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Register;
