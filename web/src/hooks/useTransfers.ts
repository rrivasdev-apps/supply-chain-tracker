"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { getAllUserTransfers, Transfer } from "@/services/Web3Service"

export function useTransfers() {
  const { contract, account } = useWeb3()
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransfers = useCallback(async () => {
    if (!contract || !account) return
    setLoading(true)
    setError(null)
    try {
      const data = await getAllUserTransfers(contract, account)
      setTransfers(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar transferencias")
    } finally {
      setLoading(false)
    }
  }, [contract, account])

  useEffect(() => {
    fetchTransfers()
  }, [fetchTransfers])

  const incoming = transfers.filter(
    (t) => t.to.toLowerCase() === account?.toLowerCase()
  )
  const outgoing = transfers.filter(
    (t) => t.from.toLowerCase() === account?.toLowerCase()
  )
  const pending = incoming.filter((t) => t.status === 0)

  return { transfers, incoming, outgoing, pending, loading, error, refetch: fetchTransfers }
}
