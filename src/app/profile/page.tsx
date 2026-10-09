"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { User, Mail, MapPin, Camera, Edit2, Calendar, MessageSquare, Car, ChevronRight, Save, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type Tab = "details" | "history";
type RideActivity = {
  id: string;
  origin: string;
  destination: string;
  departure_at: string;
};
type ConversationActivity = {
  id: string;
  participant_one: string;
  participant_two: string;
  participant_one_name: string;
  participant_two_name: string;
  created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const backendConfigured = hasSupabaseConfig();
  const [activeTab, setActiveTab] = useState<Tab>("details");
  const [isEditing, setIsEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [rideActivity, setRideActivity] = useState<RideActivity[]>([]);
  const [conversationActivity, setConversationActivity] = useState<ConversationActivity[]>([]);
  
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    dob: "",
    address: "",
  });

  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    const loadProfile = async () => {
      setProfileError("");
      try {
        const supabase = createClient();
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError?.name === "AuthSessionMissingError") {
          router.replace("/login");
          return;
        }
        if (authError) throw authError;
        if (!auth.user) {
          router.replace("/login");
          return;
        }
        if (auth.user.is_anonymous) setIsGuest(true);

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name, date_of_birth, address, avatar_url")
          .eq("id", auth.user.id)
          .single();
        if (error) throw error;
        const [ridesResult, conversationsResult] = await Promise.all([
          supabase
            .from("rides")
            .select("id, origin, destination, departure_at")
            .eq("user_id", auth.user.id)
            .order("departure_at", { ascending: false })
            .limit(3),
          supabase
            .from("conversations")
            .select("id, participant_one, participant_two, participant_one_name, participant_two_name, created_at")
            .or(`participant_one.eq.${auth.user.id},participant_two.eq.${auth.user.id}`)
            .order("created_at", { ascending: false })
            .limit(3),
        ]);
        if (ridesResult.error) throw ridesResult.error;
        if (conversationsResult.error) throw conversationsResult.error;
        let avatarUrl: string | null = null;
        if (profile.avatar_url) {
          const { data: signedAvatar, error: avatarError } = await supabase.storage
            .from("avatars")
            .createSignedUrl(profile.avatar_url, 3600);
          if (avatarError) throw avatarError;
          avatarUrl = signedAvatar.signedUrl;
        }
        if (!cancelled) {
          setUserId(auth.user.id);
          setRideActivity(ridesResult.data);
          setConversationActivity(conversationsResult.data);
          setProfilePic(avatarUrl);
          setProfileData({
            name: profile.full_name || (auth.user.is_anonymous ? "Guest traveler" : ""),
            email: auth.user.email ?? "",
            dob: profile.date_of_birth ?? "",
            address: profile.address ?? "",
          });
        }
      } catch (error) {
        if (!cancelled) {
          setProfileError(error instanceof Error ? error.message : "Unable to load your profile.");
        }
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [backendConfigured, router]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setProfileError("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    setPhotoSaving(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${userId}/avatar`, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data, error: urlError } = await supabase.storage
        .from("avatars")
        .createSignedUrl(`${userId}/avatar`, 3600);
      if (urlError) throw urlError;
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ avatar_url: `${userId}/avatar` })
        .eq("id", userId);
      if (profileError) throw profileError;
      setProfilePic(data.signedUrl);
      setProfileNotice("Profile photo updated.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to upload your profile photo.");
    } finally {
      setPhotoSaving(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setProfileSaving(true);
    setProfileError("");
    setProfileNotice("");
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profileData.name.trim(),
          date_of_birth: profileData.dob || null,
          address: profileData.address.trim() || null,
        })
        .eq("id", userId);
      if (error) throw error;

      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (auth.user?.email !== profileData.email.trim()) {
        const { error: emailError } = await supabase.auth.updateUser({ email: profileData.email.trim() });
        if (emailError) throw emailError;
        setProfileNotice("Profile saved. Confirm the email change using the link sent to your new address.");
      } else {
        setProfileNotice("Your profile has been saved.");
      }
      setIsEditing(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSignOut = async () => {
    setProfileError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace("/login");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  if (!backendConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-amber-200 bg-white p-6 shadow-xl shadow-gray-900/5 dark:border-amber-900/70 dark:bg-gray-900 sm:p-9">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">One-time setup</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Connect your TravelMate backend</h1>
          <p className="mt-3 leading-7 text-gray-600 dark:text-gray-300">
            Your profile, ride posts and messages are stored in Supabase. This project has no Supabase credentials configured yet, so private account data cannot load.
          </p>
          <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-6 text-gray-700 dark:text-gray-300">
            <li>Create a Supabase project and copy <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">.env.example</code> to <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">.env.local</code>.</li>
            <li>Set <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to that project’s URL and publishable key.</li>
            <li>Run <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">supabase/schema.sql</code> in the Supabase SQL Editor, then restart the dev server.</li>
          </ol>
          <p className="mt-5 text-sm text-gray-600 dark:text-gray-400">
            Full setup instructions are in the project README. Never use a Supabase service-role key in the browser.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/" className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-strong">
              Back to TravelMate
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-5 py-3 font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
              Go to sign in
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {(profileLoading || profileError || profileNotice) && (
        <div className="mb-5" aria-live="polite">
          {profileLoading && <p className="text-sm text-gray-600 dark:text-gray-400">Loading your profile...</p>}
          {profileError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{profileError}</p>}
          {profileNotice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">{profileNotice}</p>}
        </div>
      )}
      {/* Profile Header */}
      <div className="mb-10 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-end fade-in-up">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          {/* Avatar Upload */}
          <div className="relative group">
            <div className="flex h-32 w-32 overflow-hidden items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-xl border-4 border-white dark:border-gray-800 transition-transform duration-300 group-hover:scale-105">
              {profilePic ? (
                <Image src={profilePic} alt="Profile" width={128} height={128} unoptimized className="h-full w-full object-cover" />
              ) : (
                <User className="h-16 w-16 text-white opacity-90" />
              )}
            </div>
            <button 
              onClick={() => fileRef.current?.click()}
              disabled={profileLoading || photoSaving || isGuest}
              className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 shadow-lg transition-transform hover:scale-110 hover:text-primary dark:hover:text-primary focus:outline-none disabled:opacity-60"
              title={isGuest ? "Guest profiles are read-only" : "Upload Profile Picture"}
            >
              <Camera className="h-5 w-5" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => void handlePhotoUpload(event)} />
          </div>
          
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">{profileData.name}</h1>
            <p className="mt-2 flex items-center justify-center gap-2 text-sm font-medium text-primary dark:text-purple-400 sm:justify-start">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500"></span>
              </span>
              {isGuest ? "Guest session" : "Active Traveler"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <LogOut className="h-4 w-4" />
          {isGuest ? "End guest session" : "Sign out"}
        </button>
      </div>

      {isGuest && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100 sm:flex-row sm:items-center sm:justify-between">
          <span>This is a temporary, read-only guest profile. Create or sign in to a full account to participate.</span>
          <Link href="/login" className="shrink-0 font-bold underline">Sign in</Link>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Profile sections" className="mb-8 flex space-x-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 w-full max-w-md mx-auto sm:mx-0">
        <button
          id="profile-details-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "details"}
          aria-controls="profile-details-panel"
          tabIndex={activeTab === "details" ? 0 : -1}
          onClick={() => setActiveTab("details")}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
            activeTab === "details"
              ? "bg-primary-strong text-white shadow-md"
              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          }`}
        >
          Profile Details
        </button>
        <button
          id="profile-history-tab"
          type="button"
          role="tab"
          aria-selected={activeTab === "history"}
          aria-controls="profile-history-panel"
          tabIndex={activeTab === "history" ? 0 : -1}
          onClick={() => setActiveTab("history")}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
            activeTab === "history"
              ? "bg-primary-strong text-white shadow-md"
              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
          }`}
        >
          History & Activity
        </button>
      </div>

      <div className="min-h-[400px]">
        
        {/* Profile Details Section */}
        {activeTab === "details" && (
        <div id="profile-details-panel" role="tabpanel" aria-labelledby="profile-details-tab" tabIndex={0} className="w-full">
          <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/50 sm:p-10">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
              {isEditing ? (
                <button onClick={() => void handleSave()} disabled={profileSaving || profileLoading} className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-60">
                  <Save className="h-4 w-4" /> {profileSaving ? "Saving..." : "Save"}
                </button>
              ) : isGuest ? (
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Read-only guest profile</span>
              ) : (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 rounded-xl bg-primary-light dark:bg-purple-900/50 px-4 py-2 text-sm font-bold text-primary-strong dark:text-purple-300 transition-colors hover:bg-purple-200 dark:hover:bg-purple-800/50">
                  <Edit2 className="h-4 w-4" /> Edit
                </button>
              )}
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              {/* Name */}
              <div className="group">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Full Name</label>
                <div className="relative flex items-center">
                  <User className="absolute left-4 h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-primary dark:group-focus-within:text-purple-400" />
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white transition-all focus:border-primary dark:focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-purple-500/20 disabled:opacity-80 disabled:bg-transparent disabled:border-transparent disabled:pl-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="group">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-primary dark:group-focus-within:text-purple-400" />
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={profileData.email}
                    onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white transition-all focus:border-primary dark:focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-purple-500/20 disabled:opacity-80 disabled:bg-transparent disabled:border-transparent disabled:pl-10"
                  />
                </div>
              </div>

              {/* DOB */}
              <div className="group">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date of Birth</label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-4 h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-primary dark:group-focus-within:text-purple-400" />
                  <input
                    type="date"
                    disabled={!isEditing}
                    value={profileData.dob}
                    onChange={(e) => setProfileData({...profileData, dob: e.target.value})}
                    className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white transition-all focus:border-primary dark:focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-purple-500/20 disabled:opacity-80 disabled:bg-transparent disabled:border-transparent disabled:pl-10 dark:[color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="group sm:col-span-2">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Address</label>
                <div className="relative flex items-center">
                  <MapPin className="absolute left-4 top-4 h-5 w-5 text-gray-400 dark:text-gray-500 transition-colors group-focus-within:text-primary dark:group-focus-within:text-purple-400" />
                  <textarea
                    disabled={!isEditing}
                    value={profileData.address}
                    onChange={(e) => setProfileData({...profileData, address: e.target.value})}
                    className="w-full min-h-[100px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 py-3.5 pl-12 pr-4 text-gray-900 dark:text-white transition-all focus:border-primary dark:focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-purple-500/20 disabled:opacity-80 disabled:bg-transparent disabled:border-transparent disabled:pl-10 disabled:resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* History Section */}
        {activeTab === "history" && (
        <div id="profile-history-panel" role="tabpanel" aria-labelledby="profile-history-tab" tabIndex={0} className="w-full">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Past Rides */}
            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/50">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Car className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">My Ride Posts</h3>
              </div>
              
              <div className="space-y-4">
                {rideActivity.map((ride) => (
                  <div key={ride.id} className="group flex items-center justify-between rounded-2xl border border-gray-100 dark:border-gray-800 p-4 transition-all hover:border-primary/30 dark:hover:border-purple-500/50 hover:bg-primary-light/30 dark:hover:bg-purple-900/20">
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{ride.origin} to {ride.destination}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(ride.departure_at).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform group-hover:translate-x-1 group-hover:text-primary dark:group-hover:text-purple-400" />
                    </div>
                  </div>
                ))}
                {rideActivity.length === 0 && (
                  <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    You haven’t posted any rides yet.
                  </p>
                )}
              </div>
              <Link href="/ride-share" className="mt-6 flex w-full justify-center rounded-xl bg-gray-50 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                Find a ride
              </Link>
            </div>

            {/* Forum Activity */}
            <div className="rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-xl shadow-gray-200/50 dark:shadow-black/50">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/30 text-accent-warm dark:text-orange-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Recent Conversations</h3>
              </div>
              
              <div className="space-y-4">
                {conversationActivity.map((conversation) => {
                  const otherName = conversation.participant_one === userId
                    ? conversation.participant_two_name
                    : conversation.participant_one_name;
                  return (
                    <Link key={conversation.id} href={`/messages?conversationId=${encodeURIComponent(conversation.id)}`} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-800/50 dark:hover:shadow-black/30">
                      <span>
                        <span className="block font-semibold text-gray-900 dark:text-gray-100">{otherName}</span>
                        <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{new Date(conversation.created_at).toLocaleDateString()}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </Link>
                  );
                })}
                {conversationActivity.length === 0 && (
                  <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Your conversations will show up here.
                  </p>
                )}
              </div>
              <Link href="/messages" className="mt-6 flex w-full justify-center rounded-xl bg-gray-50 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700">
                View messages
              </Link>
            </div>
          </div>
        </div>
        )}

      </div>
    </div>
  );
}
