import { useEffect } from 'react'
import { useHashRoute } from '../lib/useHashRoute.js'
import { PRODUCTS, getProduct } from '../lib/products.js'
import Topbar from './Topbar.jsx'
import StatsBox from './StatsBox.jsx'
import ProductNav from './ProductNav.jsx'
import SalesNav from '../pages/salesnav/SalesNav.jsx'
import WaterfallEnricher from '../pages/waterfall/WaterfallEnricher.jsx'
import ApolloScraper from '../pages/apollo/ApolloScraper.jsx'
import LinkedInEnricher from '../pages/enricher/LinkedInEnricher.jsx'
import CompanyScraper from '../pages/company/CompanyScraper.jsx'
import ProductsHome from '../pages/ProductsHome.jsx'
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

  return (
    <>
      <Topbar route={route} nav={nav} onLogout={onLogout} />
      <main className="mn">
        <div className="cnt">
          <StatsBox nav={nav} />
          {/* On the Tools home the grid IS the product picker — hide the tab bar so
              the two don't duplicate (and the tablist isn't shown selectionless). */}
          {route !== 'home' && <ProductNav route={route} nav={nav} />}
          {page}
        </div>
      </main>
    </>
  )
}
