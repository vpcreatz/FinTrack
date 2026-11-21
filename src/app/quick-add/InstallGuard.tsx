
"use client";

import type { ReactNode } from "react";

export default function InstallGuard({
  children,
}: {
  children: ReactNode;
}) {
  const isInstalled =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean })
        .standalone === true);

  if (!isInstalled) {
    return (
      <main className="min-h-screen grid place-items-center p-6">
        <section className="card w-full max-w-md text-center">
          <h1 className="text-2xl font-bold">
            Install FinTrack
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Quick Add is available when FinTrack is installed
            and opened as an app.
          </p>

          <div className="mt-6 text-left">
            <h2 className="font-semibold">How to install</h2>

            <ol className="mt-3 list-decimal pl-5 space-y-2 text-sm text-slate-600">
              <li>Open FinTrack in your browser.</li>
              <li>Open the browser sharing or menu options.</li>
              <li>Select Add to Home Screen or Install App.</li>
              <li>Open FinTrack from its installed icon.</li>
            </ol>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
