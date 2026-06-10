export default function ComingSoon({ product, nav }) {
  const Icon = product.icon
  return (
    <div className="coming">
      <div className="coming-ic">
        <Icon />
      </div>
      <div className="chip">Coming soon</div>
      <h3>{product.title || product.label}</h3>
      <p>{product.body}</p>
      <button className="btn btn-g" onClick={() => nav('salesnav')}>
        ← Back to Sales Nav Scraper
      </button>
    </div>
  )
}
