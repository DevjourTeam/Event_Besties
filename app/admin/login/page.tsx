import { signIn } from "@/lib/auth";
import { GoogleIcon } from "@/components/admin/Icons";

async function googleSignInAction(formData: FormData) {
  "use server";
  const callbackUrl = (formData.get("callbackUrl") as string) || "/admin/dashboard";
  await signIn("google", { redirectTo: callbackUrl });
}

// Subtle film grain so the hero never looks like a flat wash.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/admin/dashboard";
  const error = params.error;

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[1.15fr_0.85fr]">
      {/* ---------- LEFT: composited event hero (photo + logo baked in) ---------- */}
      <div
        className="relative hidden lg:block overflow-hidden"
        style={{
          backgroundColor: "#14060f",
          // The hero image is listed first so it sits ON TOP when present. If it
          // is missing, the layered pink glows below still read as intentional.
          // Anchored left so the baked-in logo is never cropped by cover-scaling.
          backgroundImage:
            "url('/login-hero.png'), radial-gradient(circle at 32% 34%, rgba(230,70,150,0.30), transparent 55%), radial-gradient(circle at 78% 72%, rgba(120,20,80,0.32), transparent 60%)",
          backgroundSize: "cover, cover, cover",
          backgroundPosition: "left center",
        }}
      >
        {/* grain texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light"
          style={{ backgroundImage: GRAIN }}
        />
        {/* bottom shade so the tagline stays legible over any photo */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

        {/* tagline (logo already lives in the hero image) */}
        <div className="absolute left-12 bottom-12 right-12">
          <p className="text-[15px] text-white/75 max-w-md leading-relaxed">
            Custom signs, boards &amp; cutouts for every celebration — designed
            and published from your studio.
          </p>
        </div>
      </div>

      {/* ---------- RIGHT: sign-in ---------- */}
      <div className="relative min-h-screen flex items-center justify-center bg-cream px-6 py-14 overflow-hidden">
        {/* soft brand-pink glow ties this side to the hero */}
        <div
          className="pointer-events-none absolute -top-32 -right-24 w-[460px] h-[460px] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(230,70,150,0.18), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-24 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(169,139,82,0.16), transparent 70%)" }}
        />

        <div className="relative w-full max-w-[400px]">
          {/* logo above the card on mobile (hero hidden there) */}
          <div className="flex justify-center lg:hidden mb-8">
            <img src="/event-besties-logo.png" alt="Event Besties" className="h-14 w-auto" />
          </div>

          <div className="bg-white border border-card-border rounded-[20px] shadow-[0_24px_60px_rgba(20,25,40,0.16)] px-9 pt-10 pb-9">
            {/* full-colour logo inside the card on desktop */}
            <div className="hidden lg:flex justify-center mb-7">
              <img src="/event-besties-logo.png" alt="Event Besties" className="h-11 w-auto" />
            </div>

            <div className="text-center">
              <div className="font-serif-display text-[25px] text-ink leading-none">
                Welcome back
              </div>
              {/* brand-pink accent underline */}
              <div
                className="mx-auto mt-3 h-[3px] w-10 rounded-full"
                style={{ background: "linear-gradient(90deg,#e6469b,#a98b52)" }}
              />
              <div className="mt-3 text-[10px] tracking-[0.2em] uppercase text-text-muted">
                Admin Dashboard
              </div>
            </div>

            <form action={googleSignInAction} className="mt-8">
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-3 h-12 rounded-xl border border-card-border bg-white hover:bg-form-surface hover:border-[#d4d4da] transition-colors text-[14px] font-medium text-ink shadow-sm"
              >
                <GoogleIcon size={18} />
                Sign in with Google
              </button>
            </form>

            {error && (
              <div className="mt-4 text-[12px] text-[#a83232] bg-[#fbe9e9] border border-[#f1cccc] rounded-md px-3 py-2">
                Sign-in failed. Make sure your Gmail address is in the admin allowlist.
              </div>
            )}

            <p className="mt-7 text-[11px] text-text-muted text-center leading-relaxed">
              Only Gmail addresses listed in <code>ADMIN_ALLOWED_EMAILS</code> can sign in.
            </p>
          </div>

          <p className="mt-6 text-center text-[11px] text-text-muted">
            Event Besties · Design Studio
          </p>
        </div>
      </div>
    </div>
  );
}
