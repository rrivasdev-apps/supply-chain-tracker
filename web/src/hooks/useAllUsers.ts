"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { getAllUsers, UserInfo } from "@/services/Web3Service"

export function useAllUsers() {
  const { contract } = useWeb3()
  const [users, setUsers] = useState<UserInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    if (!contract) return
    setLoading(true)
    setError(null)
    try {
      const loaded = await getAllUsers(contract)
      setUsers(loaded)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }, [contract])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const pending  = users.filter((u) => u.status === 0)
  const approved = users.filter((u) => u.status === 1)

  return { users, pending, approved, loading, error, refetch: fetchUsers }
}
