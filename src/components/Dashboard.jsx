import { useHashRoute } from '../lib/useHashRoute.js'
import { getProduct } from '../lib/products.js'
import Topbar from './Topbar.jsx'
import StatsBox from './StatsBox.jsx'
import ProductNav from './ProductNav.jsx'
import SalesNav from '../pages/salesnav/SalesNav.jsx'
import ComingSoon from '../pages/ComingSoon.jsx'
import Settings from '../pages/Settings.jsx'
import ApiKey from '../pages/ApiKey.jsx'

export default function Dashboard({ onLogout }) {
  const [route, nav] = useHashRoute('salesnav')

  // Decide what to render for the active route.
  let page
  if (route === 'settings') page = <Settings />
  else if (route === 'api') page = <ApiKey />
  else {
    const product = getProduct(route)
    if (product && product.status === 'live') page = <SalesNav />
    else if (product) page = <ComingSoon product={product} />
    else page = <SalesNav /> // unknown route → default product
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar route={route} nav={nav} onLogout={onLogout} />
      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 pb-16 pt-6 sm:px-7">
        <StatsBox nav={nav} />
        <ProductNav route={route} nav={nav} />
        <div className="mt-6">{page}</div>
      </main>
    </div>
  )
}
