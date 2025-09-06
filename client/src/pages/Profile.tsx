// src/pages/Profile.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useMutation, useQueryClient, QueryKey } from 'react-query';
import { profileApi } from '../services/api';
import { User, UpdateProfilePayload } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { Camera, User as UserIcon } from 'lucide-react';

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const Profile: React.FC = () => {
  const { user, setUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading, isError } = useQuery<User, Error, User, QueryKey>(
    ['profile', user?.id],
    async (): Promise<User> => {
      const response = await profileApi.get();
      if (!response.data.success || !response.data.data) {
        throw new Error(response.data.error?.toString() || 'Failed to fetch profile');
      }
      return response.data.data;
    },
    {
      enabled: !!user,
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

  // Reset form with fetched data
  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      setAvatarPreview(profile.avatarUrl || null);
    }
  }, [profile, reset]);


  const updateProfileMutation = useMutation<User, Error, UpdateProfilePayload>(
    (data) =>
      profileApi.update(data).then((res) => {
        if (!res.data.success || !res.data.data) {
          throw new Error(typeof res.data.error === 'string' ? res.data.error : JSON.stringify(res.data.error));
        }
        return res.data.data;
      }),
    {
      onSuccess: (updatedUser) => {
        queryClient.setQueryData(['profile', user?.id], updatedUser);
        setUser(updatedUser); // Update user in AuthContext
        toast.success('Profile updated successfully!');
        setIsEditing(false);
      },
      onError: (err: Error) => {
        toast.error(err.message || 'Failed to update profile');
      },
    }
  );

  const uploadPictureMutation = useMutation(
    (file: File) => profileApi.uploadPicture(file),
    {
      onSuccess: (data) => {
        const newAvatarUrl = data.data.data.avatarUrl;
        toast.success('Profile picture updated!');
        setUser(prev => prev ? { ...prev, avatarUrl: newAvatarUrl } : null);
        queryClient.setQueryData(['profile', user?.id], (oldData: User | undefined) => oldData ? { ...oldData, avatarUrl: newAvatarUrl } : undefined);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.error || "Upload failed.");
      },
    }
  );

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
      uploadPictureMutation.mutate(file);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    await updateProfileMutation.mutateAsync(data);
  };

  if (isLoading) {
    return <div className="text-center p-8">Loading profile...</div>;
  }

  if (isError || !profile) {
    return <div className="text-center p-8 text-red-500">Error loading profile.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-center sm:space-x-6">
          <div className="relative mb-4 sm:mb-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <UserIcon className="h-12 w-12 text-gray-400" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-indigo-600 text-white p-1.5 rounded-full hover:bg-indigo-700"
              title="Change picture"
              disabled={uploadPictureMutation.isLoading}
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold">{profile?.firstName} {profile?.lastName}</h2>
            <p className="text-gray-500 dark:text-gray-400">{profile?.email}</p>
          </div>
        </div>
        
        <div className="mt-8 border-t dark:border-gray-700 pt-6">
          {/* ... The rest of the form for editing firstName/lastName ... */}
        </div>
      </div>
    </div>
  );
};

export default Profile;