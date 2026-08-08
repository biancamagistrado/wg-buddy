import { createContext, useContext } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Avatar } from "./ui";
import { useCurrentMember } from "../hooks";
import type { Household } from "../types";

interface HouseholdContextValue {
  household: Household;
  /** The member you selected in the header; null until you pick one. */
  currentMemberId: string | null;
  setCurrentMemberId: (id: string | null) => void;
  /** Refetches the household (after adding a member, for example). */
  refreshHousehold: () => void;
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null);

/** Lets any page read the current household without prop-drilling. */
export function useHousehold() {
  const ctx = useContext(HouseholdContext);
  if (!ctx) throw new Error("useHousehold must be used inside Layout");
  return ctx;
}

const NAV = [
  { to: ".", label: "Overview", icon: "🏠", end: true },
  { to: "shopping", label: "Shopping", icon: "🛒", end: false },
  { to: "tasks", label: "Tasks", icon: "✅", end: false },
  { to: "settings", label: "Settings", icon: "⚙️", end: false },
];

export default function Layout({
  household,
  onHouseholdChange,
}: {
  household: Household;
  onHouseholdChange: () => void;
}) {
  const [currentMemberId, setCurrentMemberId] = useCurrentMember(household.id);
  const currentMember = household.members.find((m) => m.id === currentMemberId);

  return (
    <HouseholdContext.Provider
      value={{
        household,
        currentMemberId,
        setCurrentMemberId,
        refreshHousehold: onHouseholdChange,
      }}
    >
      <div className="min-h-screen pb-20 sm:pb-0">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-600">
                WG Buddy
              </p>
              <h1 className="truncate text-lg font-semibold">{household.name}</h1>
            </div>

            {/* "Who are you?" - stands in for login until accounts exist. */}
            <label className="flex items-center gap-2">
              <span className="sr-only">You are</span>
              {currentMember && <Avatar member={currentMember} />}
              <select
                value={currentMemberId ?? ""}
                onChange={(e) => setCurrentMemberId(e.target.value || null)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Who are you?</option>
                {household.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Tabs on desktop; the same links move to the bottom bar on mobile. */}
          <nav className="mx-auto hidden max-w-3xl gap-1 px-4 sm:flex">
            {NAV.map((tab) => (
              <NavLink
                key={tab.label}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `border-b-2 px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-indigo-600 text-indigo-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-5">
          <Outlet />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-slate-200 bg-white sm:hidden">
          {NAV.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
                  isActive ? "text-indigo-700" : "text-slate-500"
                }`
              }
            >
              <span className="text-lg" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </HouseholdContext.Provider>
  );
}
