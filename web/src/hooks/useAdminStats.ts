"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { getAdminStats, AdminStats } from "@/services/Web3Service"

export function useAdminStats(filterAddress?: string) {
  const { contract } = useWeb3()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!contract) return
    setLoading(true)
    try {
      const data = await getAdminStats(contract, filterAddress || undefined)
      setStats(data)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [contract, filterAddress])

  useEffect(() => { fetch() }, [fetch])

  return { stats, loading, refetch: fetch }
}
