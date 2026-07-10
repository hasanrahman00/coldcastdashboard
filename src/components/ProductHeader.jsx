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
      <div className="phead-txt">
        <h2 className="phead-name">{product.label}</h2>
        {product.body && <p className="phead-desc">{product.body}</p>}
      </div>
    </div>
  )
}
