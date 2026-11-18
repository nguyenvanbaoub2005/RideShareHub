import { journey, roles, outOfScope, platforms } from '../data/sections'
import { formatVND } from '../lib/format'

export default function Cover() {
  return (
    <div className="space-y-12">
      <header className="rounded-3xl bg-navy text-white p-10 lg:p-14 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute right-20 bottom-[-120px] size-72 rounded-full bg-teal/30 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-teal">Bản MVP · v0.1</span>
          <h1 className="mt-4 text-5xl lg:text-6xl font-extrabold tracking-tight">RideShareHub</h1>
          <p className="mt-5 text-lg text-slate-300 leading-relaxed">
            Nền tảng đặt xe ghép đa nhà xe. Kết nối hành khách với các nhà xe uy tín trên các tuyến Đà Nẵng, Huế, Hội An và Quảng Nam.
          </p>
        </div>
        <div className="relative mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Đà Nẵng → Huế', formatVND(120000)],
            ['Đà Nẵng → Hội An', formatVND(60000)],
            ['Hội An → Quảng Nam', formatVND(45000)],
            ['Nhà xe Minh Tâm', 'Nhà xe Thành Công'],
          ].map(([a, b]) => (
            <div key={a} className="rounded-2xl bg-white/10 border border-white/10 p-4">
              <div className="text-sm text-slate-300">{a}</div>
              <div className="mt-1 font-semibold">{b}</div>
            </div>
          ))}
        </div>
      </header>

      <section>
        <h2 className="text-2xl font-bold">Bốn vai trò người dùng</h2>
        <div className="mt-5 grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {roles.map((r, i) => (
            <div key={r.name} className="bg-surface border border-line rounded-2xl p-6">
              <div className={`${r.color} size-10 rounded-xl text-white font-bold grid place-items-center`}>{i + 1}</div>
              <h3 className="mt-4 font-semibold text-lg">{r.name}</h3>
              <p className="text-xs font-medium text-primary mt-0.5">{r.platform}</p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Kiến trúc đa nền tảng</h2>
        <p className="mt-2 text-sm text-slate-600 max-w-2xl">
          RideShareHub gồm bốn giao diện ứng dụng riêng biệt, dùng chung một nhận diện thương hiệu và hệ thống thiết kế. Mỗi ứng dụng có cấu trúc điều hướng riêng.
        </p>
        <div className="mt-5 grid lg:grid-cols-2 gap-4">
          {platforms.map((p) => (
            <div key={p.app} className="bg-surface border border-line rounded-2xl p-6 flex gap-5">
              <div
                className={`shrink-0 border-2 border-navy bg-canvas ${
                  p.kind === 'mobile' ? 'w-12 h-24 rounded-xl' : 'w-28 h-20 rounded-md'
                } flex items-center justify-center text-[10px] font-semibold text-slate-500`}
              >
                {p.kind === 'mobile' ? 'Mobile' : 'Web'}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{p.app}</h3>
                <p className="text-xs text-primary font-medium">{p.os} · {p.frame} px</p>
                <p className="mt-1 text-xs text-slate-500">Điều hướng: {p.nav}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-600 list-disc list-inside">
                  {p.traits.map((t) => <li key={t}>{t}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">Hành trình end-to-end</h2>
        <ol className="mt-5 grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {journey.map((s, i) => (
            <li key={s} className="flex items-center gap-4 bg-surface border border-line rounded-xl px-4 py-3">
              <span className="size-8 shrink-0 rounded-full bg-primary/10 text-primary text-sm font-bold grid place-items-center">{i + 1}</span>
              <span className="font-medium text-sm">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-surface border border-line rounded-2xl p-6">
        <h2 className="text-lg font-bold">Ngoài phạm vi MVP</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {outOfScope.map((o) => (
            <span key={o} className="text-sm px-3 py-1 rounded-full bg-slate-100 text-slate-600 line-through decoration-slate-400">{o}</span>
          ))}
        </div>
      </section>
    </div>
  )
}
