import { useState } from "react";
import { sections } from "./data/sections";
import Cover from "./sections/Cover";
import DesignSystem from "./sections/DesignSystem";
import Components from "./sections/Components";
import Passenger from "./sections/Passenger";
import Driver from "./sections/Driver";
import Company from "./sections/Company";
import Admin from "./sections/Admin";
import Prototype from "./sections/Prototype";
import Pending from "./sections/Pending";

export default function App() {
  const [active, setActive] = useState("cover");
  const current = sections.find((s) => s.id === active)!;

  return (
    <div className="min-h-screen lg:flex">
      <aside className="lg:w-72 lg:h-screen lg:sticky lg:top-0 bg-navy text-slate-300 p-5 shrink-0 overflow-auto">
        <div className="flex items-center gap-2 px-2 mb-6">
          <div className="size-8 rounded-lg bg-primary grid place-items-center text-white font-bold">
            R
          </div>
          <span className="text-white font-bold">RideShareHub</span>
        </div>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-3 text-left px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                active === s.id ? "bg-primary text-white" : "hover:bg-white/10"
              }`}
            >
              <span className="font-mono text-xs opacity-70">{s.code}</span>
              <span className="font-medium">{s.title}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 min-w-0 p-6 lg:p-10 max-w-6xl">
        {active === "cover" ? (
          <Cover />
        ) : active === "design-system" ? (
          <DesignSystem />
        ) : active === "components" ? (
          <Components />
        ) : active === "passenger" ? (
          <Passenger />
        ) : active === "driver" ? (
          <Driver />
        ) : active === "company" ? (
          <Company />
        ) : active === "admin" ? (
          <Admin />
        ) : active === "prototype" ? (
          <Prototype />
        ) : (
          <Pending section={current} />
        )}
      </main>
    </div>
  );
}
