"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertModal } from "@/components/ui/confirm-modal";
import {
  User,
  Mail,
  Phone,
  Lock,
  Shield,
  Camera,
  Save,
  Loader2,
  CheckCircle,
  XCircle,
  MailCheck,
  RefreshCw,
} from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingForgot, setIsLoadingForgot]     = useState(false);
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "success" | "error" | "info";
  }>({ open: false, title: "", description: "", variant: "info" });

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    avatar: "",
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.success) {
        setProfile({
          name: data.data.name || "",
          email: data.data.email || "",
          phone: data.data.phone || "",
          department: data.data.department || "",
          avatar: data.data.avatar || "",
        });
      }
    } catch (error) {
      // fallback to session
      setProfile({
        name: session?.user?.name || "",
        email: session?.user?.email || "",
        phone: "",
        department: "",
        avatar: session?.user?.avatar || "",
      });
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setIsLoadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadData.url) throw new Error("Upload failed");

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "profile", avatar: uploadData.url }),
      });

      if (res.ok) {
        setProfile((prev) => ({ ...prev, avatar: uploadData.url }));
        await update({ avatar: uploadData.url });
        setAlertModal({
          open: true,
          title: "Profile Picture Updated!",
          description: "Your profile picture has been updated successfully.",
          variant: "success",
        });
      }
    } catch (error) {
      setAlertModal({
        open: true,
        title: "Upload Failed",
        description: "Failed to upload profile picture. Please try again.",
        variant: "error",
      });
    } finally {
      setIsLoadingAvatar(false);
    }
  };

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingProfile(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "profile",
          name: profile.name,
          phone: profile.phone,
          department: profile.department,
        }),
      });

      const data = await res.json();
      if (data.success) {
        await update({ name: profile.name });
        setAlertModal({
          open: true,
          title: "Profile Updated!",
          description: "Your profile has been updated successfully.",
          variant: "success",
        });
      } else {
        throw new Error(data.error || "Failed to update profile");
      }
    } catch (error: any) {
      setAlertModal({
        open: true,
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "error",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };


  const forgotPassword = async () => {
    setIsLoadingForgot(true);
    try {
      const res = await fetch("/api/profile/forgot-password", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send password reset email");
      setAlertModal({
        open: true,
        title: "Password Sent!",
        description: data.message,
        variant: "success",
      });
    } catch (error: any) {
      setAlertModal({
        open: true,
        title: "Error",
        description: error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingForgot(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      setAlertModal({
        open: true,
        title: "Password Mismatch",
        description: "New passwords do not match. Please try again.",
        variant: "error",
      });
      return;
    }

    if (passwords.newPassword.length < 6) {
      setAlertModal({
        open: true,
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "error",
      });
      return;
    }

    setIsLoadingPassword(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "password",
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setAlertModal({
          open: true,
          title: "Password Changed!",
          description: "Your password has been changed successfully.",
          variant: "success",
        });
      } else {
        throw new Error(data.error || "Failed to change password");
      }
    } catch (error: any) {
      setAlertModal({
        open: true,
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "error",
      });
    } finally {
      setIsLoadingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-nts-cyan" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={updateProfile} className="space-y-4">
            {/* Avatar section */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-nts-cyan to-nts-blue-magenta flex items-center justify-center text-white text-xl sm:text-2xl font-bold overflow-hidden">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                  ) : (
                    profile.name.charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  type="button"
                  disabled={isLoadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-nts-dark-card border border-gray-700 text-muted-foreground hover:text-white disabled:opacity-50"
                  title="Change profile picture"
                >
                  {isLoadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
              <div>
                <p className="font-medium text-foreground">{profile.name}</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {session?.user.role?.replace("_", " ")}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">Click camera icon to change picture</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                  Full Name
                </label>
                <Input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <Input
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-accent cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone
                </label>
                <Input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Your phone number"
                />
              </div>
              <div>
                <label className="text-sm font-medium flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  Department
                </label>
                <Input
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                  placeholder="Your department"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={isLoadingProfile} className="gap-2">
                {isLoadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-nts-cyan" />
            Change Password
          </CardTitle>
          <CardDescription>Update your password for security</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={changePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current Password</label>
              <Input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  placeholder="Enter new password (min 6 chars)"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input
                  type="password"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />
              </div>
            </div>
            {passwords.newPassword && passwords.confirmPassword && (
              <div className={`flex items-center gap-2 text-sm ${passwords.newPassword === passwords.confirmPassword ? "text-green-500" : "text-red-500"}`}>
                {passwords.newPassword === passwords.confirmPassword ? (
                  <><CheckCircle className="w-4 h-4" /> Passwords match</>
                ) : (
                  <><XCircle className="w-4 h-4" /> Passwords do not match</>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={isLoadingPassword} className="gap-2">
                {isLoadingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>


      {/* Forgot Password Section */}
      <Card className="border-amber-500/20 dark:border-amber-500/15">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MailCheck className="w-4 h-4 text-amber-500" />
            Forgot Your Password?
          </CardTitle>
          <CardDescription>
            Agar aap apna current password bhool gaye hain — ek naya password generate karke aapki email par bhej diya jayega.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
                <MailCheck className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Reset via Email</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nayi password{" "}
                  <span className="font-semibold text-foreground">{session?.user?.email}</span>{" "}
                  par send hogi
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={forgotPassword}
              disabled={isLoadingForgot}
              className="gap-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 flex-shrink-0"
            >
              {isLoadingForgot ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending…</>
              ) : (
                <><MailCheck className="w-3.5 h-3.5" /> Send New Password</>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Password reset hone ke baad login karke immediately Settings mein ja kar change kar lein.
          </p>
        </CardContent>
      </Card>

      {/* Alert Modal */}
      <AlertModal
        open={alertModal.open}
        onOpenChange={(open) => setAlertModal({ ...alertModal, open })}
        title={alertModal.title}
        description={alertModal.description}
        variant={alertModal.variant}
      />
    </div>
  );
}
