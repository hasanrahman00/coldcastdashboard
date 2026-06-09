import { PRODUCTS } from '../lib/products.js'

// Horizontal product tabs with a per-product accent underline on the active tab.
// "Soon" products are still clickable → they route to the ComingSoon page.
export default function ProductNav({ route, nav }) {
  return (
    <nav className="cc-scroll -mx-1 flex gap-1 overflow-x-auto border-b border-line">
      {PRODUCTS.map((p) => {
        const active = route === p.id
        return (
          <button
            key={p.id}
            onClick={() => nav(p.id)}
            className={
              'group relative flex shrink-0 items-center gap-2 px-3.5 py-3 text-sm font-semibold transition ' +
              (active ? '' : 'text-muted hover:text-ink')
            }
            style={active ? { color: p.accent } : undefined}
          >
            <p.icon className="h-4 w-4" />
            <span>{p.label}</span>
            {p.status === 'soon' && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-faint">
                Soon
              </span>
            )}
            {/* accent underline */}
            <span
              className="absolute inset-x-2 -bottom-px h-[3px] rounded-full transition-all"
              style={{
                background: active ? p.accent : 'transparent',
              }}
            />
          </button>
        )
      })}
    </nav>
  )
}
