import { useState, useEffect, useCallback } from 'react'

// Tiny hash router — no dependency. Routes look like #/salesnav, #/settings.
// Bookmarkable + refresh-safe, and matches the original tabbed dashboard UX.
export function useHashRoute(defaultId) {
  const read = () => window.location.hash.replace(/^#\/?/, '') || defaultId
  const [route, setRoute] = useState(read)

  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultId])

  const nav = useCallback((id) => {
    window.location.hash = '#/' + id
  }, [])

  return [route, nav]
}
