"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Lock, Mail, Phone, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";
type Account = "passenger" | "driver";

const COPY = {
  sw: {
    eyebrow: "Karibu LENZI",
    title: "Ingia. Safari yako inakusubiri.",
    subtitle:
      "Tumia barua pepe na neno la siri. Namba ya simu itatumika baada ya mtoa huduma wa SMS kuwekwa.",
    signIn: "Ingia",
    signUp: "Fungua akaunti",
    email: "Barua pepe",
    password: "Neno la siri",
    name: "Jina kamili",
    phone: "Namba ya simu (+255)",
    account: "Aina ya akaunti",
    passenger: "Abiria",
    driver: "Dereva",
    submitIn: "Ingia kwenye LENZI",
    submitUp: "Unda akaunti",
    working: "Tunasubiri…",
    noAccount: "Huna akaunti?",
    hasAccount: "Tayari una akaunti?",
    phoneNote: "Kuingia kwa SMS kunahitaji mtoa huduma aliyeidhinishwa. Bado hakujawekwa.",
    notConfigured:
      "Supabase haijawekwa kwenye build hii. Weka URL na publishable key kabla ya kuingia.",
    forgot: "Umesahau neno la siri?",
    resetNote: "Uwekaji upya wa neno la siri unahitaji barua pepe ya mfumo iliyosanidiwa.",
    trust: [
      "Dereva hukaguliwa kabla ya safari",
      "Bei huonekana kabla ya kuthibitisha",
      "Taarifa za safari huhifadhiwa kwa usalama",
    ],
    sideTitle: "Usafiri wa Chunya, uliojengwa kwa uangalifu.",
    sideBody:
      "LENZI inaunganisha abiria na madereva waliothibitishwa kwa bei inayoonekana kabla safari kuanza.",
    terms: "Masharti",
    privacy: "Faragha",
  },
  en: {
    eyebrow: "Welcome to LENZI",
    title: "Sign in. Your ride is waiting.",
    subtitle:
      "Use email and password. Phone sign-in becomes available once an SMS provider is configured.",
    signIn: "Sign in",
    signUp: "Create account",
    email: "Email address",
    password: "Password",
    name: "Full name",
    phone: "Phone number (+255)",
    account: "Account type",
    passenger: "Passenger",
    driver: "Driver",
    submitIn: "Sign in to LENZI",
    submitUp: "Create account",
    working: "Working…",
    noAccount: "No account yet?",
    hasAccount: "Already have an account?",
    phoneNote: "SMS sign-in requires a configured provider. It is not enabled yet.",
    notConfigured:
      "Supabase is not configured in this build. Set the URL and publishable key before signing in.",
    forgot: "Forgot your password?",
    resetNote: "Password reset requires a configured system email sender.",
    trust: [
      "Drivers reviewed before their first ride",
      "Fares shown before you confirm",
      "Ride records retained securely",
    ],
    sideTitle: "Chunya transport, built with care.",
    sideBody:
      "LENZI connects passengers with verified drivers at a fare you can see before the journey starts.",
    terms: "Terms",
    privacy: "Privacy",
  },
} as const;

export function AuthPanel({ initialMode = "signin" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [account, setAccount] = useState<Account>("passenger");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<"sw" | "en">("sw");

  const t = COPY[language];

  async function routeAfterAuth() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      router.replace("/ride");
      return;
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace("/auth/login");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    const role = profile?.role;
    router.replace(
      role === "platform_owner" ? "/admin" : role === "driver" ? "/driver" : "/ride",
    );
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError(t.notConfigured);
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const normalizedPhone = phone.trim().replace(/\s+/g, "");
        if (normalizedPhone && !/^\+255[67][0-9]{8}$/.test(normalizedPhone)) {
          setError(
            language === "sw"
              ? "Tumia namba ya Tanzania kwa mfumo wa +2556… au +2557…"
              : "Use a Tanzanian number in +2556… or +2557… format.",
          );
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          phone: normalizedPhone || undefined,
          options: {
            data: {
              full_name: fullName.trim(),
              role: account,
              language,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (!data.session) {
          setMessage(
            language === "sw"
              ? "Akaunti imeundwa. Thibitisha barua pepe yako kabla ya kuingia."
              : "Account created. Confirm your email address before signing in.",
          );
          setMode("signin");
          return;
        }

        await routeAfterAuth();
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      await routeAfterAuth();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-76px)] lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-forest-950 px-12 py-16 text-white lg:flex lg:flex-col">
        <div className="absolute -left-24 top-1/3 h-[420px] w-[420px] rounded-full border border-lime/10" />
        <div className="absolute -left-10 top-1/2 h-[260px] w-[260px] rounded-full border border-lime/15" />
        <div className="relative">
          <Logo tone="light" />
        </div>
        <div className="relative mt-auto max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-lime">
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            Chunya · Mbeya
          </span>
          <h2 className="mt-7 font-display text-5xl leading-[1.05] tracking-[-0.02em]">
            {t.sideTitle}
          </h2>
          <p className="mt-5 text-[15px] leading-7 text-white/55">{t.sideBody}</p>
          <ul className="mt-10 space-y-4">
            {t.trust.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime/15 text-lime">
                  <Check size={12} strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative mt-14 flex items-center gap-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30">
          <Link href="/legal/terms" className="hover:text-white/70">
            {t.terms}
          </Link>
          <Link href="/legal/privacy" className="hover:text-white/70">
            {t.privacy}
          </Link>
        </div>
      </aside>

      <section className="flex items-center justify-center bg-mist px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-between lg:hidden">
            <Logo tone="dark" />
            <div className="flex rounded-full border border-sage-300 p-0.5 text-[11px] font-extrabold uppercase">
              {(["sw", "en"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setLanguage(item)}
                  aria-pressed={language === item}
                  className={cn(
                    "rounded-full px-2.5 py-1.5",
                    language === item ? "bg-ink text-white" : "text-graphite-500",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-10 lg:mt-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-leaf">
              {t.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-[34px]">
              {t.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-graphite-500">{t.subtitle}</p>
          </div>

          <div className="mt-7 grid grid-cols-2 rounded-full border border-sage-300 bg-white p-1">
            {(["signin", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setError(null);
                  setMessage(null);
                }}
                className={cn(
                  "h-10 rounded-full text-[13px] font-bold transition-all",
                  mode === item
                    ? "bg-ink text-white shadow-float"
                    : "text-graphite-500 hover:text-ink",
                )}
              >
                {item === "signin" ? t.signIn : t.signUp}
              </button>
            ))}
          </div>

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-[13px] leading-6 text-amber-900">
              {t.notConfigured}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field
                  label={t.name}
                  icon={<ShieldCheck size={16} />}
                  value={fullName}
                  onChange={setFullName}
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                />
                <div>
                  <span className="mb-2 block text-[12px] font-bold text-graphite-700">
                    {t.account}
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {(["passenger", "driver"] as const).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setAccount(item)}
                        aria-pressed={account === item}
                        className={cn(
                          "h-11 rounded-xl border text-[13px] font-bold transition-all",
                          account === item
                            ? "border-ink bg-ink text-white"
                            : "border-sage-300 bg-white text-graphite-600 hover:border-sage-400",
                        )}
                      >
                        {item === "passenger" ? t.passenger : t.driver}
                      </button>
                    ))}
                  </div>
                </div>
                <Field
                  label={t.phone}
                  icon={<Phone size={16} />}
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                  autoComplete="tel"
                  placeholder="+2557XXXXXXXX"
                  inputMode="tel"
                />
              </>
            )}

            <Field
              label={t.email}
              icon={<Mail size={16} />}
              value={email}
              onChange={setEmail}
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />

            <Field
              label={t.password}
              icon={<Lock size={16} />}
              value={password}
              onChange={setPassword}
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
            />

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] leading-5 text-red-700"
              >
                {error}
              </p>
            )}
            {message && (
              <p
                role="status"
                className="rounded-xl border border-leaf/30 bg-leaf/10 px-4 py-3 text-[13px] leading-5 text-deep"
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-full bg-leaf text-sm font-bold text-white transition-all hover:bg-deep active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t.working}
                </>
              ) : (
                <>
                  {mode === "signin" ? t.submitIn : t.submitUp}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 flex items-center justify-between text-[12px]">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
                setMessage(null);
              }}
              className="font-bold text-deep hover:underline"
            >
              {mode === "signin" ? t.noAccount : t.hasAccount}{" "}
              {mode === "signin" ? t.signUp : t.signIn}
            </button>
            {mode === "signin" && (
              <span className="text-graphite-400" title={t.resetNote}>
                {t.forgot}
              </span>
            )}
          </div>

          <div className="mt-7 rounded-2xl border border-sage-200 bg-white px-4 py-3.5">
            <p className="flex items-start gap-2.5 text-[12px] leading-5 text-graphite-500">
              <Phone size={14} className="mt-0.5 shrink-0 text-graphite-400" />
              {t.phoneNote}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  icon,
  value,
  onChange,
  ...props
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold text-graphite-700">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-graphite-400">
          {icon}
        </span>
        <input
          {...props}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-sage-300 bg-white pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-graphite-400 focus:border-leaf focus:ring-2 focus:ring-leaf/20"
        />
      </span>
    </label>
  );
}
