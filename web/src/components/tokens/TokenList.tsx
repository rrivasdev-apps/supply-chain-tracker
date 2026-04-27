"use client"

import { TokenCard } from "./TokenCard"
import { TokenWithBalance } from "@/hooks/useTokens"

interface TokenListProps {
  tokens: TokenWithBalance[]
  loading: boolean
  onTransfer?: (token: TokenWithBalance) => void
  onBurn?: (token: TokenWithBalance) => void
  onEdit?: (token: TokenWithBalance) => void
  showActions?: boolean
  emptyMessage?: string
}

export function TokenList({ tokens, loading, onTransfer, onBurn, onEdit, showActions, emptyMessage }: TokenListProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage ?? "No hay productos para mostrar"}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {tokens.map((token) => (
        <TokenCard
          key={token.id.toString()}
          token={token}
          onTransfer={onTransfer}
          onBurn={onBurn}
          onEdit={onEdit}
          showActions={showActions}
        />
      ))}
    </div>
  )
}
