"use client"

import { TransferCard } from "./TransferCard"
import { Transfer, Token } from "@/services/Web3Service"

interface TransferListProps {
  transfers: Transfer[]
  loading: boolean
  tokenMap?: Record<string, Token>
  onAccept?: (id: bigint) => void
  onReject?: (id: bigint) => void
  emptyMessage?: string
}

export function TransferList({ transfers, loading, tokenMap, onAccept, onReject, emptyMessage }: TransferListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (transfers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage ?? "No hay transferencias para mostrar"}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {transfers.map((t) => (
        <TransferCard
          key={t.id.toString()}
          transfer={t}
          token={tokenMap?.[t.tokenId.toString()]}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  )
}
