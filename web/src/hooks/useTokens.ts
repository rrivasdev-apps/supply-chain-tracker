"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { getAllUserTokens, getTokenBalance, Token } from "@/services/Web3Service"

export interface TokenWithBalance extends Token {
  balance: bigint
}

export function useTokens() {
  const { contract, account } = useWeb3()
  const [tokens, setTokens] = useState<TokenWithBalance[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    if (!contract || !account) return
    setLoading(true)
    setError(null)
    try {
      const raw = await getAllUserTokens(contract, account)
      const withBalances = await Promise.all(
        raw.map(async (token) => {
          const balance = await getTokenBalance(contract, token.id, account)
          return { ...token, balance }
        })
      )
      setTokens(withBalances)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar tokens")
    } finally {
      setLoading(false)
    }
  }, [contract, account])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  return { tokens, loading, error, refetch: fetchTokens }
}
