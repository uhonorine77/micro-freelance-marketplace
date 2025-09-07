import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "react-query";
import { authApi } from "../../services/api";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import { Mail } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const mutation = useMutation(authApi.forgotPassword, {
    onSuccess: (data) => {
      toast.info(data.data.message);
      navigate("/check-email", {
        state: {
          message: "Password Reset Link Sent",
          details:
            "If an account with that email exists, we have sent a password reset link.",
        },
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "An error occurred.");
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    mutation.mutate(data.email);
  };

  return (
    <AuthLayout
      title="Forgot Password"
      subtitle="Enter your email to receive a reset link."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              {...register("email")}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700"
              placeholder="you@example.com"
            />
          </div>
          {errors.email && (
            <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={mutation.isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {mutation.isLoading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
