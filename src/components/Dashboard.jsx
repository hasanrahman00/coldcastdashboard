import { useEffect } from 'react'
import { useHashRoute } from '../lib/useHashRoute.js'
import { PRODUCTS, getProduct } from '../lib/products.js'
import Topbar from './Topbar.jsx'
import Sidebar from './Sidebar.jsx'
import SalesNav from '../pages/salesnav/SalesNav.jsx'
import WaterfallEnricher from '../pages/waterfall/WaterfallEnricher.jsx'
import ApolloScraper from '../pages/apollo/ApolloScraper.jsx'
import LinkedInEnricher from '../pages/enricher/LinkedInEnricher.jsx'
import CompanyScraper from '../pages/company/CompanyScraper.jsx'
import ProductsHome from '../pages/ProductsHome.jsx'
import ProductHeader from './ProductHeader.jsx'
import ComingSoon from '../pages/ComingSoon.jsx'
import Settings from '../pages/Settings.jsx'
import Setup from '../pages/Setup.jsx'
import ApiKey from '../pages/ApiKey.jsx'
import Extension from '../pages/Extension.jsx'

// Every route the logged-in app recognizes: the product tabs + the config pages.
// Anything else (typo, stale #/login, #/dash, bare hash) → bounce to salesnav.
const VALID_ROUTES = new Set([...PRODUCTS.map((p) => p.id), 'home', 'set', 'setup', 'api', 'ext'])

export default function Dashboard({ onLogout }) {
  const [route, nav] = useHashRoute('home')

  // Logged in + unknown/wrong path → bounce to the products home.
  useEffect(() => {
    if (!VALID_ROUTES.has(route)) nav('home')
  }, [route, nav])

  let page
  if (route === 'home') page = <ProductsHome nav={nav} />
  else if (route === 'set') page = <Settings />
  else if (route === 'setup') page = <Setup />
  else if (route === 'api') page = <ApiKey />
  else if (route === 'ext') page = <Extension />
  else {
    const product = getProduct(route)
    if (route === 'waterfall') page = <WaterfallEnricher />
    else if (route === 'apollo') page = <ApolloScraper />
    else if (route === 'linkedin') page = <LinkedInEnricher />
    else if (route === 'company') page = <CompanyScraper />
    else if (product && !product.soon) page = <SalesNav />
    else if (product) page = <ComingSoon product={product} nav={nav} />
    else page = <ProductsHome nav={nav} /> // fallback matches the default landing → no flash before the redirect
  }

  // The product whose page is showing (drives the per-product header). Undefined on the
  // home + config routes; skipped for coming-soon (which has its own hero).
  const activeProduct = getProduct(route)

  return (
    <div className="shell">
      <Sidebar route={route} nav={nav} />
      <div className="shell-main">
        <Topbar route={route} nav={nav} onLogout={onLogout} />
        <main className="mn">
          {/* data-p sets --pc for the whole page so job cards can tint with the product accent */}
          <div className="cnt" data-p={activeProduct && !activeProduct.soon ? route : undefined}>
            {activeProduct && !activeProduct.soon && <ProductHeader product={activeProduct} />}
            {page}
          </div>
        </main>
      </div>
    </div>
  )
}
