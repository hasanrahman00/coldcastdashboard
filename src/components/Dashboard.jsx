import { useEffect, useState, useRef } from 'react'
import { useHashRoute } from '../lib/useHashRoute.js'
import { useApp } from '../store/AppStore.jsx'
import { PRODUCTS, getProduct } from '../lib/products.js'
import Onboarding from './Onboarding.jsx'
import Topbar from './Topbar.jsx'
import Sidebar from './Sidebar.jsx'
import SalesNav from '../pages/salesnav/SalesNav.jsx'
import WaterfallEnricher from '../pages/waterfall/WaterfallEnricher.jsx'
import VerifyEmail from '../pages/verify/VerifyEmail.jsx'
import ApolloScraper from '../pages/apollo/ApolloScraper.jsx'
import LinkedInEnricher from '../pages/enricher/LinkedInEnricher.jsx'
import CompanyScraper from '../pages/company/CompanyScraper.jsx'
import PostScraper from '../pages/post/PostScraper.jsx'
import ZoomInfoScraper from '../pages/zoominfo/ZoomInfoScraper.jsx'
import SalesNavDeal from '../pages/sndeal/SalesNavDeal.jsx'
import ProductsHome from '../pages/ProductsHome.jsx'
import ProductHeader from './ProductHeader.jsx'
import ComingSoon from '../pages/ComingSoon.jsx'
import Settings from '../pages/Settings.jsx'
import Setup from '../pages/Setup.jsx'
import ApiKey from '../pages/ApiKey.jsx'
import Extension from '../pages/Extension.jsx'
import HireProspectTeam from '../pages/services/HireProspectTeam.jsx'
import ColdInfraSetup from '../pages/services/ColdInfraSetup.jsx'
import RequestFeature from '../pages/services/RequestFeature.jsx'
import FreePlaybook from '../pages/services/FreePlaybook.jsx'

// Every route the logged-in app recognizes: the product tabs + the config pages +
// the Services area. Anything else (typo, stale #/login, #/dash, bare hash) → home.
const VALID_ROUTES = new Set([
  ...PRODUCTS.map((p) => p.id),
  'home', 'set', 'setup', 'api', 'ext',
  'prospectteam', 'coldinfra', 'requestfeature', 'playbook',
])

export default function Dashboard({ onLogout }) {
  const [route, nav] = useHashRoute('home')
  const { localExt, me } = useApp()

  // First-run onboarding guide. It pops up for NEW users whose browser hasn't
  // connected the extension yet — the people who actually need it — and greets
  // them again on each fresh login (App clears the per-session dismissal on login).
  // A browser that has connected before is left alone (the ScraperConnection banner
  // handles a temporary reconnect). Always re-openable from the account menu.
  const uid = me?.user?.id || me?.user?.username || 'anon'
  const SETUP_KEY = `cc_setup_done_${uid}`

  // Once this browser connects the extension for this user, remember it so we stop
  // auto-popping the guide on future logins/refreshes.
  useEffect(() => {
    if (localExt.connected) { try { localStorage.setItem(SETUP_KEY, '1') } catch {} }
  }, [localExt.connected, SETUP_KEY])

  const [guideOpen, setGuideOpen] = useState(false)
  const autoTried = useRef(false)
  useEffect(() => {
    if (autoTried.current) return
    // Wait ~2.5s so the extension bridge can report before we decide — installed/
    // connected start "unknown", so this avoids a flash for already-connected users.
    const t = setTimeout(() => {
      autoTried.current = true
      if (localExt.connected) return                           // set up right now → never
      if (localStorage.getItem(SETUP_KEY)) return              // returning browser → don't nag
      if (sessionStorage.getItem('cc_guide_dismissed')) return // closed it this session
      setGuideOpen(true)                                       // new user, extension not connected here
    }, 2500)
    return () => clearTimeout(t)
  }, [localExt.connected, SETUP_KEY])

  const closeGuide = () => {
    sessionStorage.setItem('cc_guide_dismissed', '1')
    setGuideOpen(false)
  }

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
  else if (route === 'prospectteam') page = <HireProspectTeam />
  else if (route === 'coldinfra') page = <ColdInfraSetup />
  else if (route === 'requestfeature') page = <RequestFeature />
  else if (route === 'playbook') page = <FreePlaybook />
  else {
    const product = getProduct(route)
    if (route === 'waterfall') page = <WaterfallEnricher />
    else if (route === 'verify') page = <VerifyEmail />
    else if (route === 'apollo') page = <ApolloScraper />
    else if (route === 'linkedin') page = <LinkedInEnricher />
    else if (route === 'company') page = <CompanyScraper />
    else if (route === 'post') page = <PostScraper />
    else if (route === 'zoominfo') page = <ZoomInfoScraper />
    else if (route === 'sndeal') page = <SalesNavDeal />
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
        <Topbar route={route} nav={nav} onLogout={onLogout} onGuide={() => setGuideOpen(true)} />
        <Onboarding open={guideOpen} onClose={closeGuide} nav={nav} />
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
