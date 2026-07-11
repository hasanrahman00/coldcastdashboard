// Per-product page header — makes it obvious WHICH dashboard you're in: a real emoji +
// the product NAME, CENTERED, on a band tinted with that product's accent colour (--pc,
// keyed off data-p). Shown above each live product page.
export default function ProductHeader({ product }) {
  if (!product) return null
  const Icon = product.icon
  return (
    <div className="phead" data-p={product.id}>
      {product.emoji ? (
        <span className="phead-emoji" aria-hidden="true">{product.emoji}</span>
      ) : (
        <span className="phead-ic"><Icon /></span>
      )}
      <h2 className="phead-name">{product.label}</h2>
    </div>
  )
}
