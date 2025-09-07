// client/src/pages/auth/ResetPassword.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "react-query";
import { authApi } from "../../services/api";
import { toast } from "react-toastify";
import { useNavigate, useParams, Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import { Lock } from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const mutation = useMutation(authApi.resetPassword, {
    onSuccess: (data) => {
      toast.success(data.data.message);
      navigate("/login");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "An error occurred.");
    },
  });

  const onSubmit = (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error("No reset token found.");
      return;
    }
    mutation.mutate({ token, password: data.password });
  };

  return (
    <AuthLayout title="Set New Password">
      {!token ? (
        <div className="text-center">
          <p className="text-red-500">Invalid password reset link.</p>
          <Link
            to="/forgot-password"
            className="text-indigo-600 hover:underline mt-4 block"
          >
            Request a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="password">New Password</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type="password"
                {...register("password")}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>
            {errors.password && (
              <p className="mt-2 text-sm text-red-600">
                {errors.password.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={mutation.isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 disabled:opacity-50"
          >
            {mutation.isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
