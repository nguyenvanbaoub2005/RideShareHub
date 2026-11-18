import type { Section } from '../data/sections'

export default function Pending({ section }: { section: Section }) {
  return (
    <div className="space-y-6">
      <div className="bg-surface border border-line rounded-2xl p-8">
        <span className="text-xs font-semibold tracking-widest uppercase text-primary">Phần {section.code}</span>
        <h1 className="mt-2 text-3xl font-bold">{section.title}</h1>
        <p className="mt-3 text-slate-600 max-w-xl">{section.summary}</p>
        {section.frame && (
          <span className="mt-4 inline-block text-xs font-medium px-3 py-1 rounded-full bg-teal/10 text-teal">Khung: {section.frame}</span>
        )}
      </div>
      <div className="bg-surface border border-dashed border-slate-300 rounded-2xl p-6">
        <h2 className="font-semibold">Nội dung sẽ thiết kế</h2>
        <ul className="mt-3 grid sm:grid-cols-2 gap-2">
          {section.items.map((i) => (
            <li key={i} className="text-sm text-slate-600 bg-canvas border border-line rounded-lg px-3 py-2">{i}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500">Chưa triển khai ở bước khởi tạo này.</p>
      </div>
    </div>
  )
}
