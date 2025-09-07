// client/src/pages/auth/VerifyEmail.tsx
import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMutation } from "react-query";
import { toast } from "react-toastify";
import { authApi } from "../../services/api";
import AuthLayout from "../../components/AuthLayout";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { AxiosError } from "axios";
import { ApiResponse } from "../../types";

const VerifyEmail: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  // --- THIS IS THE CORRECTED MUTATION LOGIC ---
  const { mutate, isLoading, isSuccess, isError, error } = useMutation<
    ApiResponse,
    AxiosError<ApiResponse>,
    string
  >(
    // 1. Simplify the mutation function. Let Axios handle throwing on HTTP errors.
    async (verificationToken: string) => {
      const response = await authApi.verifyEmail(verificationToken);
      return response.data; // Directly return the data from the successful response
    },
    {
      onSuccess: (data) => {
        // This will only run on a 2xx response from the API.
        if (data.success) {
          toast.success("Your email has been verified successfully!");
          setTimeout(() => navigate("/login?verified=true"), 3000);
        } else {
          // This handles cases where the API gives 200 OK but success: false
          // (not our current case, but good for robustness).
          toast.error((data.error as string) || "Verification failed.");
        }
      },
      onError: (err) => {
        // This will now correctly catch the AxiosError thrown on 4xx/5xx responses.
        const errorMessage =
          err.response?.data?.error ||
          "Verification link is invalid or has expired.";
        toast.error(errorMessage as string);
      },
    }
  );

  useEffect(() => {
    if (token) {
      mutate(token);
    } else {
      toast.error("No verification token provided. Redirecting to login.");
      navigate("/login");
    }
  }, [token, mutate, navigate]);

  // 2. Create a robust error message parsing function.
  const getDisplayErrorMessage = () => {
    if (error) {
      // The 'error' object from react-query is the AxiosError itself.
      return (
        error.response?.data?.error ||
        "The verification link is invalid or has expired. Please try registering again or request a new link."
      );
    }
    return "An unknown error occurred.";
  };

  return (
    <AuthLayout title="Verifying Your Account">
      <div className="text-center py-8">
        {isLoading && (
          <>
            <Loader2 className="mx-auto h-16 w-16 text-indigo-500 animate-spin" />
            <p className="mt-4 text-lg font-medium text-gray-700">
              Please wait while we verify your email...
            </p>
          </>
        )}
        {isSuccess && (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <p className="mt-4 text-lg font-medium text-gray-700">
              Verification Successful!
            </p>
            <p className="text-gray-500">
              You will be redirected to the login page shortly.
            </p>
            <Link
              to="/login?verified=true"
              className="mt-6 w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Go to Login
            </Link>
          </>
        )}
        {isError && (
          <>
            <XCircle className="mx-auto h-16 w-16 text-red-500" />
            <p className="mt-4 text-lg font-medium text-gray-700">
              Verification Failed
            </p>
            <p className="text-gray-500">{getDisplayErrorMessage() as string}</p>
            <Link
              to="/login"
              className="mt-6 w-full inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Back to Login
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
