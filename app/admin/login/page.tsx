import Image from "next/image";
import { signIn } from "@/lib/auth";
import { GoogleIcon } from "@/components/admin/Icons";
import heroImg from "@/public/login-hero.webp";
import logoImg from "@/public/event-besties-logo.webp";

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
    <div className="relative min-h-screen w-full overflow-hidden bg-[#14060f]">
      {/* React hoists this into <head> so the hero starts downloading with the
          document, not after the component tree is parsed. */}
      <link
        rel="preload"
        as="image"
        href={heroImg.src}
        type="image/webp"
        fetchPriority="high"
      />
      {/* Hero photo. `unoptimized` on purpose: the file is already a hand-tuned
          97KB WebP, so we skip Next's on-demand optimizer (which re-encodes on
          every cold hit) and serve it straight from the hashed /_next/static/media
          path — Cache-Control: max-age=31536000, immutable. `priority` emits a
          <link rel="preload">, and the blur placeholder covers the first paint. */}
      <Image
        src={heroImg}
        alt=""
        fill
        priority
        unoptimized
        placeholder="blur"
        className="object-cover object-center z-0"
      />

      {/* soft scrim: keeps the left logo clear, gently darkens the card side */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(8,4,8,0.30) 0%, rgba(8,4,8,0.04) 38%, rgba(8,4,8,0.18) 68%, rgba(8,4,8,0.55) 100%)",
        }}
      />
      {/* grain texture */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-[0.05] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN }}
      />

      {/* tagline, bottom-left */}
      <div className="absolute left-10 bottom-10 right-10 z-20 hidden lg:block pointer-events-none">
        <p className="text-[15px] text-white/75 max-w-md leading-relaxed">
          Custom signs, boards &amp; cutouts for every celebration — designed and
          published from your studio.
        </p>
      </div>

      {/* sign-in card, floated to the right */}
      <div className="relative z-20 min-h-screen flex items-center justify-center lg:justify-end px-6 lg:pr-56 py-14">
        <div className="w-full max-w-[400px]">
          <div className="bg-white/95 backdrop-blur-sm border border-white/60 rounded-[20px] shadow-[0_28px_70px_rgba(0,0,0,0.45)] px-9 pt-10 pb-9">
            <div className="flex justify-center mb-7">
              <Image src={logoImg} alt="Event Besties" width={164} height={44} priority unoptimized />
            </div>

            <div className="text-center">
              <div className="font-serif-display text-[25px] text-ink leading-none">
                Welcome back
              </div>
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
        </div>
      </div>
    </div>
  );
}
