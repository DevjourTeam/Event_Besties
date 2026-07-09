"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, PenIcon, SignOutIcon } from "./Icons";

type SidebarProps = {
  email: string;
  storeDomain: string;
  signOutAction: () => Promise<void>;
};

export function Sidebar({ email, storeDomain, signOutAction }: SidebarProps) {
  const pathname = usePathname() ?? "";
  const active: "dashboard" | "builder" = pathname.startsWith("/admin/builder")
    ? "builder"
    : "dashboard";

  return (
    <aside className="w-[60px] lg:w-[252px] shrink-0 bg-sidebar text-[#f5f0e8] flex flex-col h-screen sticky top-0">
      {/* Brand: full text on lg+, mark only below */}
      <div className="px-3 lg:px-6 pt-5 lg:pt-7 pb-4 lg:pb-5 flex items-center justify-center lg:justify-start">
        <div className="hidden lg:block">
          <div
            className="text-[22px] italic font-serif-display leading-none"
            style={{ color: "#f5f0e8" }}
          >
            Event Besties
          </div>
          <div
            className="mt-2 text-[10px] tracking-[0.18em]"
            style={{ color: "#6a6050" }}
          >
            ADMIN DASHBOARD
          </div>
        </div>
        <div
          className="lg:hidden text-[18px] italic font-serif-display"
          style={{ color: "#f5f0e8" }}
          title="Event Besties"
        >
          EB
        </div>
      </div>

      <div className="mx-3 lg:mx-6 border-t border-white/[0.06]" />

      <nav className="flex-1 mt-4 lg:mt-5 flex flex-col">
        <NavLink
          href="/admin/dashboard"
          label="Templates & Canvases"
          icon={<GridIcon size={17} />}
          active={active === "dashboard"}
        />
        <NavLink
          href="/admin/builder"
          label="Template Builder"
          icon={<PenIcon size={17} />}
          active={active === "builder"}
        />
      </nav>

      <div className="px-3 lg:px-6 py-4 lg:py-5 border-t border-white/[0.06] text-[11px] space-y-1">
        <div className="hidden lg:block" style={{ color: "#8a8070" }}>
          {storeDomain}
        </div>
        {email && (
          <div className="hidden lg:block truncate" style={{ color: "#c0b8a8" }}>
            {email}
          </div>
        )}
        <form action={signOutAction}>
          <button
            type="submit"
            className="mt-2 w-full inline-flex items-center gap-2 text-[12px] hover:text-gold transition-colors justify-center lg:justify-start"
            style={{ color: "#c0b8a8" }}
            title="Sign out"
          >
            <SignOutIcon size={14} />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={`flex items-center gap-3 px-3 lg:px-6 py-3 text-[13px] transition-colors justify-center lg:justify-start ${
        active
          ? "bg-white/[0.07] border-l-[3px] border-gold lg:pl-[21px]"
          : "border-l-[3px] border-transparent hover:bg-white/[0.04]"
      }`}
      style={{ color: active ? "#f5f0e8" : "#c0b8a8" }}
    >
      <span className="opacity-90">{icon}</span>
      <span className="hidden lg:inline">{label}</span>
    </Link>
  );
}
