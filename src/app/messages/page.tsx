"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Search, Send, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/env";

type Conversation = {
  id: string;
  peerId: string;
  name: string;
  rideId: string | null;
  lastMessage: string;
  updatedAt: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}

async function requestConversations() {
  const response = await fetch("/api/conversations", { cache: "no-store" });
  return readResponse<{ conversations: Conversation[] }>(response);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export default function MessagesPage() {
  const router = useRouter();
  const backendConfigured = hasSupabaseConfig();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(backendConfigured);
  const [isGuest, setIsGuest] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(
    backendConfigured ? "" : "Supabase is not configured. Add the project URL and public key to .env.local, then restart the dev server.",
  );

  useEffect(() => {
    if (!backendConfigured) return;
    let cancelled = false;
    void createClient().auth.getUser()
      .then(({ data: auth, error: authError }) => {
        if (cancelled) return false;
        if (authError) throw authError;
        if (auth.user?.is_anonymous) {
          setIsGuest(true);
          setError("Guest sessions cannot access private messages. Sign in with a full account to message travellers.");
          setLoading(false);
          return false;
        }
        return true;
      })
      .then((shouldLoad) => shouldLoad ? requestConversations() : null)
      .then((data) => {
        if (cancelled || !data) return;
        setConversations(data.conversations);
        const requestedId = new URLSearchParams(window.location.search).get("conversationId");
        const selected = data.conversations.find((item) => item.id === requestedId) ?? data.conversations[0] ?? null;
        setActiveConversation(selected);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load your conversations.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [backendConfigured]);

  useEffect(() => {
    if (!activeConversation) return;

    let cancelled = false;
    const loadMessages = async () => {
      setError("");
      try {
        const response = await fetch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/messages`, { cache: "no-store" });
        const data = await readResponse<{ messages: Message[] }>(response);
        if (!cancelled) setMessages(data.messages);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load messages.");
      }
    };

    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [activeConversation]);

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeConversation || !message.trim() || sending) return;

    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(activeConversation.id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: message }),
      });
      const data = await readResponse<{ message: Message }>(response);
      setMessages((current) => [...current, data.message]);
      setConversations((current) => current.map((conversation) =>
        conversation.id === activeConversation.id
          ? { ...conversation, lastMessage: data.message.body, updatedAt: data.message.created_at }
          : conversation,
      ));
      setMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send this message.");
    } finally {
      setSending(false);
    }
  };

  const visibleConversations = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-primary dark:text-purple-300">Stay in sync</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Your messages</h1>
      </div>

      {error && !isGuest && (
        <div role="alert" className="mb-4 flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          {error.toLowerCase().includes("sign in") && (
            <Link href="/login" className="font-bold underline">Go to sign in</Link>
          )}
        </div>
      )}

      {isGuest ? (
        <section className="rounded-3xl border border-sky-200 bg-sky-50 p-8 text-center dark:border-sky-900 dark:bg-sky-950/40">
          <MessageCircle className="mx-auto h-10 w-10 text-sky-700 dark:text-sky-300" />
          <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Private messages are unavailable in guest mode</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-gray-600 dark:text-gray-300">
            You can browse public rides as a guest. Sign in or create an account to start conversations and send messages.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-primary-strong">Sign in</Link>
            <Link href="/signup" className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100">Create account</Link>
          </div>
        </section>
      ) : (
      <div className="grid min-h-[32rem] flex-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5 dark:border-gray-800 dark:bg-gray-900 md:grid-cols-[19rem_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-gray-200 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-950/40 md:border-b-0 md:border-r">
          <div className="border-b border-gray-200 p-4 dark:border-gray-800">
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations"
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </label>
          </div>
          <div className="max-h-56 flex-1 overflow-y-auto md:max-h-none">
            {loading ? (
              <p className="p-5 text-sm text-gray-500 dark:text-gray-400">Loading conversations...</p>
            ) : error && conversations.length === 0 ? (
              <p className="p-5 text-sm text-gray-500 dark:text-gray-400">Conversations are unavailable until the backend request succeeds.</p>
            ) : visibleConversations.length === 0 ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">No conversations yet</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Message someone from the ride-share board to start a chat.</p>
              </div>
            ) : (
              visibleConversations.map((conversation) => (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => {
                    setMessages([]);
                    setActiveConversation(conversation);
                    router.replace(`/messages?conversationId=${encodeURIComponent(conversation.id)}`, { scroll: false });
                  }}
                  className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-4 text-left transition-colors dark:border-gray-800 ${
                    activeConversation?.id === conversation.id
                      ? "bg-purple-50 dark:bg-purple-900/20"
                      : "hover:bg-white dark:hover:bg-gray-900"
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-100 text-primary-strong dark:bg-purple-900/50 dark:text-purple-200">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-bold text-gray-900 dark:text-white">{conversation.name}</span>
                      <span className="shrink-0 text-[11px] text-gray-500 dark:text-gray-400">{formatTime(conversation.updatedAt)}</span>
                    </span>
                    <span className="mt-1 block truncate text-sm text-gray-600 dark:text-gray-400">{conversation.lastMessage}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="flex min-h-[22rem] min-w-0 flex-col">
          {activeConversation ? (
            <>
              <header className="flex items-center gap-3 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
                <button type="button" onClick={() => setActiveConversation(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden" aria-label="Back to conversations">
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-primary-strong dark:bg-purple-900/50 dark:text-purple-200">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">{activeConversation.name}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">TravelMate conversation</p>
                </div>
              </header>
              <div className="flex-1 space-y-4 overflow-y-auto bg-gray-50/70 p-5 dark:bg-gray-950/25">
                {messages.length === 0 ? (
                  <div className="flex h-full min-h-40 flex-col items-center justify-center text-center">
                    <MessageCircle className="h-8 w-8 text-primary/70" />
                    <p className="mt-2 font-semibold text-gray-800 dark:text-gray-200">Start the conversation</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Coordinate your trip right here.</p>
                  </div>
                ) : (
                  messages.map((item) => (
                    <div key={item.id} className={`flex ${item.sender_id === activeConversation.peerId ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                        item.sender_id === activeConversation.peerId
                          ? "rounded-tl-sm border border-gray-200 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                          : "rounded-tr-sm bg-primary text-white"
                      }`}>
                        <p className="whitespace-pre-wrap break-words text-sm">{item.body}</p>
                        <p className={`mt-1 text-right text-[10px] ${item.sender_id === activeConversation.peerId ? "text-gray-500 dark:text-gray-400" : "text-purple-100"}`}>
                          {formatTime(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={sendMessage} className="flex items-center gap-3 border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <label className="sr-only" htmlFor="message-input">Write a message</label>
                <input
                  id="message-input"
                  type="text"
                  maxLength={4000}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write a message..."
                  className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <button type="submit" disabled={!message.trim() || sending} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-strong disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-primary dark:bg-purple-900/40 dark:text-purple-300">
                <MessageCircle className="h-8 w-8" />
              </span>
              <h2 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
                {error ? "Messages are unavailable" : "Choose a conversation"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                {error ? "The conversation service could not return your messages." : "Your ride-share messages will appear here once you connect with another traveller."}
              </p>
            </div>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
