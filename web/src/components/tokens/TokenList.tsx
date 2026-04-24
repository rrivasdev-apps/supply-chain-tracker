"use client"

import { TokenCard } from "./TokenCard"
import { TokenWithBalance } from "@/hooks/useTokens"

interface TokenListProps {
  tokens: TokenWithBalance[]
  loading: boolean
  onTransfer?: (token: TokenWithBalance) => void
  onBurn?: (token: TokenWithBalance) => void
  showActions?: boolean
  emptyMessage?: string
}

export function TokenList({ tokens, loading, onTransfer, onBurn, showActions, emptyMessage }: TokenListProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage ?? "No hay tokens para mostrar"}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {tokens.map((token) => (
        <TokenCard
          key={token.id.toString()}
          token={token}
          onTransfer={onTransfer}
          onBurn={onBurn}
          showActions={showActions}
        />
      ))}
    </div>
  )
}
