import { useEffect } from 'react'
import { useHashRoute } from '../lib/useHashRoute.js'
import { PRODUCTS, getProduct } from '../lib/products.js'
import Topbar from './Topbar.jsx'
import StatsBox from './StatsBox.jsx'
import ProductNav from './ProductNav.jsx'
import SalesNav from '../pages/salesnav/SalesNav.jsx'
import ComingSoon from '../pages/ComingSoon.jsx'
import Settings from '../pages/Settings.jsx'
import ApiKey from '../pages/ApiKey.jsx'
import Extension from '../pages/Extension.jsx'

// Every route the logged-in app recognizes: the product tabs + the config pages.
// Anything else (typo, stale #/login, #/dash, bare hash) → bounce to salesnav.
const VALID_ROUTES = new Set([...PRODUCTS.map((p) => p.id), 'set', 'api', 'ext'])

export default function Dashboard({ onLogout }) {
  const [route, nav] = useHashRoute('salesnav')

  // Logged in + unknown/wrong path → redirect to the default product.
  useEffect(() => {
    if (!VALID_ROUTES.has(route)) nav('salesnav')
  }, [route, nav])

  let page
  if (route === 'set') page = <Settings />
  else if (route === 'api') page = <ApiKey />
  else if (route === 'ext') page = <Extension />
  else {
    const product = getProduct(route)
    if (product && !product.soon) page = <SalesNav />
    else if (product) page = <ComingSoon product={product} nav={nav} />
    else page = <SalesNav /> // fallback for the brief frame before the redirect lands
  }

  return (
    <>
      <Topbar route={route} nav={nav} onLogout={onLogout} />
      <main className="mn">
        <div className="cnt">
          <StatsBox nav={nav} />
          <ProductNav route={route} nav={nav} />
          {page}
        </div>
      </main>
    </>
  )
}
