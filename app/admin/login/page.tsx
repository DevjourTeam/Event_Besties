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
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <div className="w-full max-w-[400px] bg-white border border-card-border rounded-card shadow-sm px-8 pt-9 pb-8">
        <div className="text-center">
          <div className="font-serif-display italic text-[26px] text-[#1a1a1a]">
            Event Besties
          </div>
          <div className="mt-1 text-[10px] tracking-[0.18em] uppercase text-text-muted">
            Admin Dashboard
          </div>
        </div>

        <div className="mt-8">
          <form action={googleSignInAction}>
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-3 h-11 rounded-lg border border-card-border bg-white hover:bg-form-surface text-[14px] font-medium text-[#1a1a1a]"
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

          <p className="mt-6 text-[11px] text-text-muted text-center leading-relaxed">
            Only Gmail addresses listed in <code>ADMIN_ALLOWED_EMAILS</code> can sign in.
          </p>
        </div>
      </div>
    </div>
  );
}
