import { useHashRoute } from '../lib/useHashRoute.js'
import { getProduct } from '../lib/products.js'
import Topbar from './Topbar.jsx'
import StatsBox from './StatsBox.jsx'
import ProductNav from './ProductNav.jsx'
import SalesNav from '../pages/salesnav/SalesNav.jsx'
import ComingSoon from '../pages/ComingSoon.jsx'
import Settings from '../pages/Settings.jsx'
import ApiKey from '../pages/ApiKey.jsx'
import Extension from '../pages/Extension.jsx'

export default function Dashboard({ onLogout }) {
  const [route, nav] = useHashRoute('salesnav')

  let page
  if (route === 'set') page = <Settings />
  else if (route === 'api') page = <ApiKey />
  else if (route === 'ext') page = <Extension />
  else {
    const product = getProduct(route)
    if (product && !product.soon) page = <SalesNav />
    else if (product) page = <ComingSoon product={product} nav={nav} />
    else page = <SalesNav />
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
