import { IconSparkles } from '../lib/icons.jsx'

export default function ComingSoon({ product }) {
  const Icon = product.icon
  return (
    <div className="cc-card-in flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-card px-6 py-16 text-center">
      <span
        className="mb-5 grid h-16 w-16 place-items-center rounded-2xl"
        style={{ background: product.accent + '1a', color: product.accent }}
      >
        <Icon className="h-8 w-8" />
      </span>
      <div
        className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
        style={{ background: product.accent + '14', color: product.accent }}
      >
        <IconSparkles className="h-3.5 w-3.5" /> Coming soon
      </div>
      <h2 className="text-2xl font-extrabold tracking-tight text-ink">
        {product.label}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {product.short} is in the works. It'll show up right here as its own tab
        the moment it ships — same dashboard, no migration.
      </p>
    </div>
  )
}
