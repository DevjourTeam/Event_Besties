import { signIn } from "@/lib/auth";
import { GoogleIcon } from "@/components/admin/Icons";

async function googleSignInAction(formData: FormData) {
  "use server";
  const callbackUrl = (formData.get("callbackUrl") as string) || "/admin/dashboard";
  await signIn("google", { redirectTo: callbackUrl });
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/admin/dashboard";
  const error = params.error;

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* ---------- LEFT: event hero ---------- */}
      <div
        className="relative hidden lg:flex flex-col justify-between overflow-hidden"
        style={{
          backgroundColor: "#180a16",
          // Overlay gradient sits ON TOP of the photo for text contrast; if
          // /login-bg.jpg is missing, the magenta-night gradient still looks rich.
          backgroundImage:
            "linear-gradient(155deg, rgba(18,7,18,0.55) 0%, rgba(150,25,95,0.34) 45%, rgba(12,5,14,0.82) 100%), url('/login-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* soft pink glow accent */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, #e6469b 0%, transparent 70%)" }}
        />

        {/* top: white logo */}
        <div className="relative p-12">
          <img
            src="/event-besties-logo.png"
            alt="Event Besties"
            className="h-11 w-auto"
            style={{ filter: "brightness(0) invert(1)" }}
          />
        </div>

        {/* bottom: tagline */}
        <div className="relative p-12 pb-16">
          <h1 className="font-serif-display text-white text-[42px] leading-[1.1] max-w-md">
            Design the moment.
          </h1>
          <p className="mt-4 text-[15px] text-white/70 max-w-md leading-relaxed">
            Custom signs, boards and cutouts for every celebration — created and
            published from your studio.
          </p>
        </div>
      </div>

      {/* ---------- RIGHT: sign-in ---------- */}
      <div className="relative min-h-screen flex items-center justify-center bg-cream px-6 py-14">
        <div className="w-full max-w-[400px]">
          {/* logo above card on mobile (hero is hidden there) */}
          <div className="flex justify-center lg:hidden mb-8">
            <img src="/event-besties-logo.png" alt="Event Besties" className="h-14 w-auto" />
          </div>

          <div className="bg-white border border-card-border rounded-[18px] shadow-[0_20px_55px_rgba(20,25,40,0.14)] px-9 pt-10 pb-9">
            {/* full-colour logo inside card (desktop) */}
            <div className="hidden lg:flex justify-center mb-7">
              <img src="/event-besties-logo.png" alt="Event Besties" className="h-12 w-auto" />
            </div>

            <div className="text-center">
              <div className="font-serif-display text-[24px] text-ink leading-none">
                Welcome back
              </div>
              <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-text-muted">
                Admin Dashboard
              </div>
            </div>

            <form action={googleSignInAction} className="mt-8">
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <button
                type="submit"
                className="group w-full inline-flex items-center justify-center gap-3 h-12 rounded-xl border border-card-border bg-white hover:bg-form-surface hover:border-[#d4d4da] transition-colors text-[14px] font-medium text-ink shadow-sm"
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
