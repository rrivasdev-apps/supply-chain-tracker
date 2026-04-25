"use client"

import { useState, useEffect, useCallback } from "react"
import { useWeb3 } from "@/contexts/Web3Context"

export interface BomItem {
  tokenId: string   // bigint serializado como string
  tokenName: string
  amountPerUnit: number  // unidades de materia prima por unidad de producto
}

export interface BomTemplate {
  id: string
  name: string
  productType: string
  description: string
  creatorAddress: string
  items: BomItem[]
  createdAt: number
  updatedAt: number
}

function storageKey(address: string) {
  return `bom_templates_${address.toLowerCase()}`
}

export function useBomTemplates() {
  const { account } = useWeb3()
  const [templates, setTemplates] = useState<BomTemplate[]>([])

  useEffect(() => {
    if (!account) { setTemplates([]); return }
    try {
      const raw = localStorage.getItem(storageKey(account))
      setTemplates(raw ? JSON.parse(raw) : [])
    } catch {
      setTemplates([])
    }
  }, [account])

  const persist = useCallback((list: BomTemplate[]) => {
    if (!account) return
    localStorage.setItem(storageKey(account), JSON.stringify(list))
    setTemplates(list)
  }, [account])

  const saveTemplate = useCallback((template: Omit<BomTemplate, "id" | "creatorAddress" | "createdAt" | "updatedAt">) => {
    if (!account) return null
    const now = Date.now()
    const newTemplate: BomTemplate = {
      ...template,
      id: crypto.randomUUID(),
      creatorAddress: account.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    }
    persist([...templates, newTemplate])
    return newTemplate
  }, [account, templates, persist])

  const updateTemplate = useCallback((id: string, changes: Partial<Omit<BomTemplate, "id" | "creatorAddress" | "createdAt">>) => {
    if (!account) return
    persist(
      templates.map((t) =>
        t.id === id ? { ...t, ...changes, updatedAt: Date.now() } : t
      )
    )
  }, [account, templates, persist])

  const duplicateTemplate = useCallback((id: string) => {
    if (!account) return null
    const original = templates.find((t) => t.id === id)
    if (!original) return null
    const now = Date.now()
    const copy: BomTemplate = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (copia)`,
      creatorAddress: account.toLowerCase(),
      createdAt: now,
      updatedAt: now,
    }
    persist([...templates, copy])
    return copy
  }, [account, templates, persist])

  const deleteTemplate = useCallback((id: string) => {
    persist(templates.filter((t) => t.id !== id))
  }, [templates, persist])

  const isOwner = useCallback((template: BomTemplate) => {
    return account?.toLowerCase() === template.creatorAddress
  }, [account])

  return { templates, saveTemplate, updateTemplate, duplicateTemplate, deleteTemplate, isOwner }
}
