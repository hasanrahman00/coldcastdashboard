// Per-product page header — makes it obvious WHICH dashboard you're in: the product's
// icon + name + description on a band tinted with that product's accent colour (--pc,
// keyed off data-p). Shown above each live product page, below the nav.
export default function ProductHeader({ product }) {
  if (!product) return null
  const Icon = product.icon
  return (
    <div className="phead" data-p={product.id}>
      <div className="phead-ic">
        <Icon />
      </div>
      <h2 className="phead-name">{product.label}</h2>
    </div>
  )
}
