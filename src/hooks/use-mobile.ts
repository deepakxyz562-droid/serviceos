import * as React from "react"

const MOBILE_BREAKPOINT = 768
const LG_BREAKPOINT = 1024

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

/**
 * Returns true when the viewport is below the `lg` breakpoint (1024px).
 * Used to decide whether to render the sidebar as a Sheet drawer vs a fixed
 * aside — the hamburger and bottom nav are visible below `lg` (`lg:hidden`),
 * so the drawer must open below `lg` too (not just below `md`).
 */
export function useBelowLg() {
  const [isBelowLg, setIsBelowLg] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${LG_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsBelowLg(window.innerWidth < LG_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsBelowLg(window.innerWidth < LG_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isBelowLg
}
