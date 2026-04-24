"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TokenWithBalance } from "@/hooks/useTokens"

interface TokenCardProps {
  token: TokenWithBalance
  onTransfer?: (token: TokenWithBalance) => void
  onBurn?: (token: TokenWithBalance) => void
  showActions?: boolean
}

function parseFeatures(features: string): Record<string, string> {
  try {
    return JSON.parse(features)
  } catch {
    return { info: features }
  }
}

export function TokenCard({ token, onTransfer, onBurn, showActions = true }: TokenCardProps) {
  const isRawMaterial = token.parentId === 0n
  const features = parseFeatures(token.features)

  return (
    <Card className={token.burned ? "opacity-50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{token.name}</CardTitle>
          <div className="flex gap-1 flex-wrap justify-end">
            <Badge variant={isRawMaterial ? "secondary" : "default"}>
              {isRawMaterial ? "Materia prima" : "Producto"}
            </Badge>
            {token.burned && <Badge variant="destructive">Redimido</Badge>}
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-mono">ID: {token.id.toString()}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">Balance</span>
          <span className="font-medium">{token.balance.toString()}</span>
          <span className="text-muted-foreground">Supply total</span>
          <span>{token.totalSupply.toString()}</span>
          {token.parentId > 0n && (
            <>
              <span className="text-muted-foreground">Lámina origen</span>
              <span>#{token.parentId.toString()}</span>
            </>
          )}
          <span className="text-muted-foreground">Creado</span>
          <span>{new Date(Number(token.dateCreated) * 1000).toLocaleDateString()}</span>
        </div>

        {Object.keys(features).length > 0 && (
          <div className="bg-muted rounded-md p-2 text-xs space-y-1">
            {Object.entries(features).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-muted-foreground capitalize">{k}:</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}

        {showActions && !token.burned && (
          <div className="flex gap-2 pt-1">
            {onTransfer && token.balance > 0n && (
              <Button size="sm" variant="outline" onClick={() => onTransfer(token)} className="flex-1">
                Transferir
              </Button>
            )}
            {onBurn && (
              <Button size="sm" variant="destructive" onClick={() => onBurn(token)} className="flex-1">
                Redimir
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
