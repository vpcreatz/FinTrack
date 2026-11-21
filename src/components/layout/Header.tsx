"use client";

import { Search, Plus } from "lucide-react";

interface HeaderProps {
  search: string;
  setSearch: (value: string) => void;
  onAddTransaction: () => void;
  pageTitle?: string;
  pageSubtitle?: string;
  hideHeading?: boolean;
}

export default function Header({
  search,
  setSearch,
  onAddTransaction,
  pageTitle = "Overview",
  pageSubtitle = "Your personal finance overview.",
  hideHeading = false,
}: HeaderProps) {
  return (
    <header className="topbar">
      {!hideHeading && <div><h1 className="page-title">{pageTitle}</h1><div className="page-subtitle">{pageSubtitle}</div></div>}
      <div className="topbar-actions">
        <div className="search-box"><Search size={17} /><input aria-label="Search transactions" placeholder="Search transactions..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <button className="primary-button" onClick={onAddTransaction}><Plus size={17} />Add Transaction</button>
      </div>
    </header>
  );
}
