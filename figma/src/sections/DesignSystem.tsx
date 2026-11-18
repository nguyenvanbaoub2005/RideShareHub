import type { ReactNode } from 'react'
import { colors, type, spacing, radii, shadows, breakpoints } from '../data/tokens'

function Block({ n, title, desc, children }: { n: string; title: string; desc?: string; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-primary font-semibold">{n}</span>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      {desc && <p className="mt-1 text-sm text-slate-600 max-w-2xl">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

const Token = ({ children }: { children: ReactNode }) => (
  <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{children}</code>
)

export default function DesignSystem() {
  const tokenJson = {
    color: Object.fromEntries(colors.map((c) => [c.token.replace('color-', ''), c.hex])),
    fontFamily: 'Inter',
    typography: Object.fromEntries(type.map((t) => [t.token.replace('text-', ''), t.spec])),
    spacing: Object.fromEntries(spacing.map((s) => [`space-${s}`, `${s}px`])),
    radius: Object.fromEntries(radii.map((r) => [r.token.replace('radius-', ''), r.px])),
    shadow: Object.fromEntries(shadows.map((s) => [s.token.replace('shadow-', ''), s.css])),
  }

  return (
    <div className="space-y-14">
      <header className="rounded-3xl bg-navy text-white p-10">
        <span className="text-xs font-semibold tracking-widest uppercase text-teal">Phần 02</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Hệ thống thiết kế RideShareHub</h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          Nền tảng hình ảnh chung cho cả bốn ứng dụng: Hành khách, Tài xế (mobile) và Nhà xe, Quản trị (web).
        </p>
        <div className="mt-6 flex gap-2">
          {colors.map((c) => (
            <span key={c.hex} className="size-6 rounded-full border border-white/20" style={{ background: c.hex }} />
          ))}
        </div>
      </header>

      <Block n="01" title="Bảng màu" desc="Màu thương hiệu, trung tính và ngữ nghĩa.">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {colors.map((c) => (
            <div key={c.hex} className="bg-surface border border-line rounded-2xl overflow-hidden">
              <div className="h-24" style={{ background: c.hex }} />
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{c.name}</span>
                  <span className="font-mono text-xs text-slate-500">{c.hex}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{c.use}</p>
                <div className="mt-2"><Token>{c.token}</Token></div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block n="02" title="Kiểu chữ" desc="Font Inter, năm cấp độ chữ.">
        <div className="bg-surface border border-line rounded-2xl divide-y divide-line">
          {type.map((t) => (
            <div key={t.name} className="p-6 grid lg:grid-cols-[200px_1fr] gap-3">
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{t.spec}</div>
                <div className="mt-2"><Token>{t.token}</Token></div>
              </div>
              <p className={t.cls}>{t.sample}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 bg-surface border border-line rounded-2xl p-6 flex flex-wrap gap-6 text-2xl">
          {[400, 500, 600, 700, 800].map((w) => (
            <span key={w} style={{ fontWeight: w }}>Aa <span className="text-xs font-mono text-slate-500">{w}</span></span>
          ))}
        </div>
      </Block>

      <Block n="03" title="Khoảng cách" desc="Thang cơ sở 4 px.">
        <div className="bg-surface border border-line rounded-2xl p-6 space-y-3">
          {spacing.map((s) => (
            <div key={s} className="flex items-center gap-4">
              <span className="w-16 font-mono text-sm">{s}px</span>
              <div className="h-4 rounded-sm bg-primary" style={{ width: s * 4 }} />
              <Token>space-{s}</Token>
            </div>
          ))}
        </div>
      </Block>

      <Block n="04" title="Bo góc">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {radii.map((r) => (
            <div key={r.name} className="bg-surface border border-line rounded-2xl p-5">
              <div className={`h-20 bg-primary/10 border-2 border-primary ${r.cls}`} />
              <div className="mt-3 font-semibold">{r.name} <span className="font-mono text-xs text-slate-500">{r.px}</span></div>
              <p className="text-xs text-slate-500">{r.use}</p>
              <div className="mt-2"><Token>{r.token}</Token></div>
            </div>
          ))}
        </div>
      </Block>

      <Block n="05" title="Độ nổi" desc="Ba mức đổ bóng theo độ cao lớp.">
        <div className="rounded-2xl bg-canvas border border-line p-8 grid md:grid-cols-3 gap-8">
          {shadows.map((s) => (
            <div key={s.name}>
              <div className="h-28 bg-surface rounded-[20px] grid place-items-center text-sm font-medium" style={{ boxShadow: s.css }}>
                {s.name}
              </div>
              <p className="mt-3 text-xs text-slate-500">{s.use}</p>
              <div className="mt-2"><Token>{s.token}</Token></div>
            </div>
          ))}
        </div>
      </Block>

      <Block n="06" title="Hướng dẫn bố cục" desc="Mỗi nền tảng có bố cục riêng, không chuyển đổi lẫn nhau.">
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h3 className="font-semibold">Ứng dụng di động</h3>
            <p className="text-xs text-slate-500">390 × 844 px · Hành khách & Tài xế</p>
            <div className="mt-4 mx-auto w-[130px] h-[281px] rounded-[20px] border-2 border-navy bg-canvas relative overflow-hidden">
              <div className="h-5 bg-navy/10 text-[8px] text-center leading-5">Thanh trạng thái</div>
              <div className="h-8 bg-surface border-b border-line text-[8px] flex items-center px-2">Thanh tiêu đề</div>
              <div className="m-2 h-24 rounded bg-primary/10 border border-dashed border-primary text-[8px] grid place-items-center">Nội dung / Bản đồ</div>
              <div className="m-2 h-10 rounded bg-surface border border-line" />
              <div className="absolute bottom-0 inset-x-0 h-9 bg-surface border-t border-line flex justify-around items-center text-[7px]">
                <span>Tab</span><span>Tab</span><span>Tab</span><span>Tab</span>
              </div>
            </div>
            <ul className="mt-4 text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li>Lề 16 px, vùng chạm tối thiểu 44 px</li>
              <li>Thanh điều hướng dưới cao 64 px</li>
              <li>Nút chính cao 52 px</li>
            </ul>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-6">
            <h3 className="font-semibold">Bảng điều khiển web</h3>
            <p className="text-xs text-slate-500">1440 × 1024 px · Nhà xe & Quản trị</p>
            <div className="mt-4 aspect-[1440/1024] max-h-[340px] mx-auto rounded-md border-2 border-navy bg-canvas flex overflow-hidden text-[10px]">
              <div className="w-[17%] bg-navy text-white p-2">Thanh bên · 256 px</div>
              <div className="flex-1 flex flex-col">
                <div className="h-8 bg-surface border-b border-line px-3 flex items-center">Thanh trên · 64 px</div>
                <div className="flex-1 p-3 grid grid-cols-4 gap-2 content-start">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-surface border border-line" />)}
                  <div className="col-span-3 h-24 rounded bg-primary/10 border border-dashed border-primary grid place-items-center">Bảng dữ liệu / Biểu đồ</div>
                  <div className="h-24 rounded bg-teal/10 border border-dashed border-teal grid place-items-center">Bản đồ</div>
                </div>
              </div>
            </div>
            <ul className="mt-4 text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li>Thanh bên cố định 256 px, thu gọn còn 72 px</li>
              <li>Nội dung tối đa 1152 px, lề 32 px</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 bg-surface border border-line rounded-2xl p-6">
          <h3 className="font-semibold">Lưới responsive</h3>
          <div className="mt-4 space-y-5">
            {breakpoints.map((b) => (
              <div key={b.name}>
                <div className="text-xs text-slate-600 mb-1.5">
                  <b>{b.name}</b> · {b.range} · {b.cols} cột · khoảng cách {b.gutter}px · lề {b.margin}px
                </div>
                <div className="grid bg-primary/5 rounded-md py-2" style={{ gridTemplateColumns: `repeat(${b.cols}, 1fr)`, gap: b.gutter / 2, paddingInline: b.margin / 2 }}>
                  {Array.from({ length: b.cols }).map((_, i) => <div key={i} className="h-8 rounded-sm bg-primary/25" />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Block>

      <Block n="07" title="Design tokens" desc="Tập token dùng chung, định nghĩa trong src/index.css (@theme).">
        <pre className="bg-navy text-slate-200 rounded-2xl p-6 text-xs leading-relaxed overflow-auto max-h-[480px]">
          {JSON.stringify(tokenJson, null, 2)}
        </pre>
      </Block>
    </div>
  )
}
