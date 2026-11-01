'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { applyOverlay, SNAPSHOT, type Catalogue } from '@/lib/catalogue'
import { fetchCatalogueRows } from '@/lib/db/catalogue'
import { useApp } from '@/context/AppContext'

const CatalogueContext = createContext<Catalogue>(SNAPSHOT)

/**
 * Serves the catalogue. Starts from the built-in snapshot (so every page renders at once and the
 * app still works if the read fails), then layers the database's newer labels and lists on top.
 */
export function CatalogueProvider({ children }: { children: ReactNode }) {
  const { userId } = useApp()
  const [catalogue, setCatalogue] = useState<Catalogue>(SNAPSHOT)

  useEffect(() => {
    if (!userId) {
      setCatalogue(SNAPSHOT)
      return
    }
    let cancelled = false
    fetchCatalogueRows()
      .then(({ games, reference }) => {
        if (!cancelled) setCatalogue(applyOverlay(SNAPSHOT, games, reference))
      })
      .catch(() => {
        // Keep the snapshot: stale lists are fine, a broken page is not.
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  return <CatalogueContext.Provider value={catalogue}>{children}</CatalogueContext.Provider>
}

export const useCatalogue = () => useContext(CatalogueContext)
