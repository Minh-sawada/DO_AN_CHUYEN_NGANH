'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface AdminCache {
  laws: any[]
  stats: any
  dashboardData: any
  timeStats: any
  lastFetched: {
    laws: number
    stats: number
    dashboardData: number
    timeStats: number
  }
}

interface AdminCacheContextType {
  cache: AdminCache
  updateCache: (key: keyof Omit<AdminCache, 'lastFetched'>, data: any) => void
  isCacheValid: (key: keyof AdminCache['lastFetched'], maxAge?: number) => boolean
  clearCache: (key?: keyof Omit<AdminCache, 'lastFetched'>) => void
}

const AdminCacheContext = createContext<AdminCacheContextType | null>(null)

export function AdminCacheProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<AdminCache>({
    laws: [],
    stats: { totalLaws: 0, totalQueries: 0, recentQueries: 0 },
    dashboardData: null,
    timeStats: {
      today: { queries: 0, laws: 0, users: 0 },
      thisWeek: { queries: 0, laws: 0, users: 0 },
      thisMonth: { queries: 0, laws: 0, users: 0 },
      thisYear: { queries: 0, laws: 0, users: 0 },
      hourly: [],
      daily: [],
      monthly: []
    },
    lastFetched: {
      laws: 0,
      stats: 0,
      dashboardData: 0,
      timeStats: 0
    }
  })

  const updateCache = (key: keyof Omit<AdminCache, 'lastFetched'>, data: any) => {
    setCache(prev => ({
      ...prev,
      [key]: data,
      lastFetched: {
        ...prev.lastFetched,
        [key]: Date.now()
      }
    }))
  }

  const isCacheValid = (key: keyof AdminCache['lastFetched'], maxAge: number = 5 * 60 * 1000) => {
    const lastFetched = cache.lastFetched[key]
    if (!lastFetched) return false
    return Date.now() - lastFetched < maxAge
  }

  const clearCache = (key?: keyof Omit<AdminCache, 'lastFetched'>) => {
    if (key) {
      setCache(prev => ({
        ...prev,
        [key]: key === 'laws' ? [] : key === 'stats' ? { totalLaws: 0, totalQueries: 0, recentQueries: 0 } : null,
        lastFetched: {
          ...prev.lastFetched,
          [key]: 0
        }
      }))
    } else {
      setCache({
        laws: [],
        stats: { totalLaws: 0, totalQueries: 0, recentQueries: 0 },
        dashboardData: null,
        timeStats: {
          today: { queries: 0, laws: 0, users: 0 },
          thisWeek: { queries: 0, laws: 0, users: 0 },
          thisMonth: { queries: 0, laws: 0, users: 0 },
          thisYear: { queries: 0, laws: 0, users: 0 },
          hourly: [],
          daily: [],
          monthly: []
        },
        lastFetched: {
          laws: 0,
          stats: 0,
          dashboardData: 0,
          timeStats: 0
        }
      })
    }
  }

  return (
    <AdminCacheContext.Provider value={{
      cache,
      updateCache,
      isCacheValid,
      clearCache
    }}>
      {children}
    </AdminCacheContext.Provider>
  )
}

export function useAdminCache() {
  const context = useContext(AdminCacheContext)
  if (!context) {
    throw new Error('useAdminCache must be used within AdminCacheProvider')
  }
  return context
}
