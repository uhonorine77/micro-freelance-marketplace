// client/src/pages/Profile.tsx
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useQuery, useMutation, useQueryClient, QueryKey } from "react-query";
import { profileApi } from "../services/api";
import { User, UpdateProfilePayload } from "../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-toastify";
import { format } from "date-fns";
import {
  Camera,
  User as UserIcon,
  Mail,
  Briefcase,
  Calendar,
  Loader2,
} from "lucide-react";
import { AxiosError } from "axios";

// --- Skeleton Component for a Professional Loading State ---
const ProfileSkeleton = () => (
  <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 animate-pulse">
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row items-center sm:space-x-8">
        <div className="h-32 w-32 rounded-full bg-gray-200 relative mb-6 sm:mb-0"></div>
        <div className="w-full sm:w-auto">
          <div className="h-9 w-64 bg-gray-300 rounded-md mb-3 mx-auto sm:mx-0"></div>
          <div className="h-6 w-72 bg-gray-200 rounded-md mb-4 mx-auto sm:mx-0"></div>
          <div className="flex items-center justify-center sm:justify-start space-x-4">
            <div className="h-7 w-24 bg-gray-200 rounded-full"></div>
            <div className="h-7 w-36 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-gray-200 pt-8">
        <div className="h-7 w-48 bg-gray-300 rounded-md mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded-md mb-1"></div>
            <div className="h-11 w-full bg-gray-200 rounded-lg"></div>
          </div>
          <div>
            <div className="h-4 w-24 bg-gray-200 rounded-md mb-1"></div>
            <div className="h-11 w-full bg-gray-200 rounded-lg"></div>
          </div>
        </div>
        <div className="flex justify-end pt-8">
          <div className="h-10 w-32 bg-gray-300 rounded-md"></div>
        </div>
      </div>
    </div>
  </div>
);

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile: React.FC = () => {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery<User, AxiosError, User, QueryKey>(
    ["profile", user?.id],
    async () => {
      const response = await profileApi.get();
      if (!response.data.success || !response.data.data) {
        throw new Error(
          response.data.error?.toString() || "Failed to fetch profile"
        );
      }
      return response.data.data;
    },
    {
      enabled: !!user,
      onSuccess: (data) => setAvatarPreview(data.avatarUrl || null),
    }
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({ firstName: profile.firstName, lastName: profile.lastName });
    }
  }, [profile, reset]);

  const updateProfileMutation = useMutation<
    User,
    AxiosError,
    UpdateProfilePayload
  >(
    async (data) => {
      const response = await profileApi.update(data);
      if (!response.data.data) throw new Error("No data returned from server.");
      return response.data.data;
    },
    {
      onSuccess: (updatedUser) => {
        queryClient.setQueryData(["profile", user?.id], updatedUser);
        setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
        toast.success("Profile updated successfully!");
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || "Failed to update profile");
      },
    }
  );

  const uploadPictureMutation = useMutation(
    (file: File) => profileApi.uploadPicture(file),
    {
      onSuccess: (response) => {
        if (!response.data.data) {
          toast.error("Picture URL not returned from server.");
          return;
        }
        const newAvatarUrl = response.data.data.avatarUrl;
        toast.success("Profile picture updated!");
        setUser((prevUser) =>
          prevUser ? { ...prevUser, avatarUrl: newAvatarUrl } : null
        );
        queryClient.setQueryData<User | undefined>(
          ["profile", user?.id],
          (oldData) =>
            oldData ? { ...oldData, avatarUrl: newAvatarUrl } : undefined
        );
        setAvatarPreview(newAvatarUrl);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || "Upload failed.");
        setAvatarPreview(profile?.avatarUrl || null);
      },
    }
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
      uploadPictureMutation.mutate(file);
    }
  };

  const onSubmit = (data: ProfileFormData) =>
    updateProfileMutation.mutate(data);

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="text-center p-8 text-red-500">
        Error loading profile. Please try again.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-center sm:space-x-8">
          <div className="relative mb-6 sm:mb-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <div className="h-32 w-32 rounded-full ring-4 ring-white ring-offset-2 ring-offset-indigo-100 relative group">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <div className="h-full w-full rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
              {/* --- Upload Loading Indicator --- */}
              {uploadPictureMutation.isLoading && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-full">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
                </div>
              )}
              <button
                onClick={() =>
                  !uploadPictureMutation.isLoading &&
                  fileInputRef.current?.click()
                }
                className="absolute -bottom-2 -right-2 bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 shadow-md transition-transform hover:scale-110 group-hover:opacity-100 opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Change picture"
                disabled={uploadPictureMutation.isLoading}
              >
                <Camera className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold text-gray-800">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-gray-500 text-md mt-1 flex items-center justify-center sm:justify-start">
              <Mail className="h-4 w-4 mr-2 text-gray-400" /> {profile.email}
            </p>
            <div className="mt-3 flex items-center justify-center sm:justify-start space-x-4 text-sm text-gray-600">
              <span className="inline-flex items-center bg-indigo-50 text-indigo-700 font-medium px-3 py-1 rounded-full">
                <Briefcase className="h-4 w-4 mr-1.5" />{" "}
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </span>
              <span className="inline-flex items-center text-gray-500">
                <Calendar className="h-4 w-4 mr-1.5" /> Member since{" "}
                {format(new Date(profile.createdAt), "MMM yyyy")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-6">
            Edit Your Information
          </h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  {...register("firstName")}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-600 mb-1"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  {...register("lastName")}
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting || updateProfileMutation.isLoading}
                className="inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-wait"
              >
                {(isSubmitting || updateProfileMutation.isLoading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isSubmitting || updateProfileMutation.isLoading
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
