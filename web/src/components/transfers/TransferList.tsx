"use client"

import { TransferCard } from "./TransferCard"
import { Transfer } from "@/services/Web3Service"

interface TransferListProps {
  transfers: Transfer[]
  loading: boolean
  tokenNames?: Record<string, string>
  onAccept?: (id: bigint) => void
  onReject?: (id: bigint) => void
  emptyMessage?: string
}

export function TransferList({ transfers, loading, tokenNames, onAccept, onReject, emptyMessage }: TransferListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {transfers.map((t) => (
        <TransferCard
          key={t.id.toString()}
          transfer={t}
          tokenName={tokenNames?.[t.tokenId.toString()]}
          onAccept={onAccept}
          onReject={onReject}
        />
      ))}
    </div>
  )
}
