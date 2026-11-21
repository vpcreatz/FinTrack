"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  CreditCard,
  Tags,
  PiggyBank,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { name: "Overview", icon: LayoutDashboard, href: "/" },
  { name: "Transactions", icon: ArrowLeftRight, href: "/transactions" },
  { name: "Budgets", icon: Wallet, href: "/budgets" },
  { name: "Savings Goals", icon: PiggyBank, href: "/savings-goals" },
  { name: "Analytics", icon: ChartNoAxesCombined, href: "/analytics" },
  { name: "Accounts", icon: CreditCard, href: "/accounts" },
  { name: "Categories", icon: Tags, href: "/categories" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [displayName, setDisplayName] = useState("FinTrack User");

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const response = await fetch("/api/profile");
        if (!response.ok) return;
        const result = await response.json();
        const name = result.profile?.display_name?.trim();
        if (!cancelled && name) setDisplayName(name);
      } catch {
        // The navigation remains usable when profile details cannot be fetched.
      }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  return (
    <aside className="sidebar">
      <Link href="/" className="brand">
        <div className="brand-icon"><ChartNoAxesCombined size={21} /></div>
        <span>FinTrack</span>
      </Link>

      <div className="nav-label">WORKSPACE</div>
      {navigation.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
        return <Link key={item.name} href={item.href} className={`nav-link ${isActive ? "active" : ""}`} title={item.name}>
          <Icon size={19} /><span>{item.name}</span>
        </Link>;
      })}

      <div className="sidebar-bottom">
        <div className="nav-label">PREFERENCES</div>
        <Link href="/settings" title="Settings" className={`nav-link ${pathname.startsWith("/settings") ? "active" : ""}`}>
          <Settings size={19} /><span>Settings</span>
        </Link>
        <div className="profile-pill">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-details"><strong>{displayName}</strong><div>Personal account</div></div>
        </div>
      </div>
    </aside>
  );
}
