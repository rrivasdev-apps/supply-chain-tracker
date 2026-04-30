"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { getApprovedUsersByRole, UserInfo } from "@/services/Web3Service"

export function useApprovedUsers(role: string) {
  const { contract } = useWeb3()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!contract || !role) return
    setLoading(true)
    setError(null)
    try {
      const loaded = await getApprovedUsersByRole(contract, role)
      setUsers(loaded)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }, [contract, role])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return { users, loading, error, refetch: fetchUsers }
}
