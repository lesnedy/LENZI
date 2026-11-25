"use client";

import Link from "next/link";
import { Check, CircleAlert, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function SupportForm() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [category, setCategory] = useState("ride");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUserId(data.user?.id ?? null);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("support_tickets").insert({
        user_id: userId,
        category,
        subject: subject.trim(),
        description: description.trim(),
      });
      if (insertError) {
        setError(insertError.message);
        return;
      }
      setSent(true);
      setSubject("");
      setDescription("");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="grid place-items-center rounded-3xl border border-sage-200 bg-white py-16">
        <Loader2 className="animate-spin text-leaf" />
      </div>
    );
  }

  if (sent) {
    return (
      <div className="rounded-3xl border border-leaf/30 bg-leaf/5 p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-leaf/15 text-deep">
          <Check size={22} />
        </span>
        <h2 className="mt-4 text-xl font-extrabold text-ink">Ticket received</h2>
        <p className="mt-2 text-[13px] leading-6 text-graphite-500">
          LENZI support can now see your request. Replies appear in your notifications.
          Response times depend on the operator&apos;s support hours.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[12px] font-bold text-white"
        >
          Send another message
        </button>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-3xl border border-sage-200 bg-white p-8 text-center">
        <CircleAlert size={22} className="mx-auto text-amber-500" />
        <h2 className="mt-3 text-lg font-extrabold text-ink">Sign in to open a ticket</h2>
        <p className="mt-2 text-[13px] leading-6 text-graphite-500">
          Signing in lets support find your ride and respond in the app. For urgent safety
          issues, contact local emergency services first.
        </p>
        <Link
          href="/auth/login"
          className="mt-5 inline-flex h-11 items-center rounded-full bg-leaf px-5 text-[12px] font-bold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-sage-200 bg-white p-5 sm:p-6">
      <h2 className="text-sm font-extrabold text-ink">Send a message to LENZI support</h2>
      <p className="mt-1 text-[11px] leading-5 text-graphite-400">
        Do not include passwords, PINs or full payment credentials.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-graphite-400">
            Category
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-11 w-full rounded-xl border border-sage-300 bg-white px-3 text-[12px] font-semibold text-ink"
          >
            <option value="ride">Ride issue</option>
            <option value="payment">Payment</option>
            <option value="driver">Driver account</option>
            <option value="safety">Safety concern</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-graphite-400">
            Subject
          </span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            minLength={3}
            maxLength={160}
            placeholder="Short summary"
            className="h-11 w-full rounded-xl border border-sage-300 bg-white px-3 text-[12px] font-semibold text-ink outline-none placeholder:font-normal placeholder:text-graphite-400 focus:border-leaf"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-graphite-400">
            Details
          </span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
            minLength={5}
            maxLength={4000}
            rows={6}
            placeholder="What happened? Include the ride number if you have it."
            className="w-full rounded-xl border border-sage-300 bg-white px-3 py-2.5 text-[12px] leading-5 text-ink outline-none placeholder:text-graphite-400 focus:border-leaf"
          />
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || subject.trim().length < 3 || description.trim().length < 5}
        className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-leaf px-5 text-[12px] font-bold text-white hover:bg-deep disabled:opacity-50"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        Submit ticket
      </button>
    </form>
  );
}
