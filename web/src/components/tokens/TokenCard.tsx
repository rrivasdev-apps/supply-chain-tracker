"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TokenWithBalance } from "@/hooks/useTokens"
import { fmtRaw } from "@/contracts/config"

interface TokenCardProps {
  token: TokenWithBalance
  onTransfer?: (token: TokenWithBalance) => void
  onBurn?: (token: TokenWithBalance) => void
  onEdit?: (token: TokenWithBalance) => void
  showActions?: boolean
}

type FeatureValue = string | number | boolean | object | unknown[]

const FEATURE_LABELS: Record<string, string> = {
  espesor: "Espesor (mm)",
}

function parseFeatures(features: string): Record<string, FeatureValue> {
  try {
    return JSON.parse(features)
  } catch {
    return { info: features }
  }
}

function renderFeatureValue(v: FeatureValue): string {
  if (Array.isArray(v)) {
    return v.map((item) =>
      typeof item === "object" && item !== null
        ? Object.entries(item as Record<string, unknown>)
            .map(([k, val]) => `${k}: ${val}`)
            .join(", ")
        : String(item)
    ).join(" | ")
  }
  if (typeof v === "object" && v !== null) {
    return JSON.stringify(v)
  }
  return String(v)
}

export function TokenCard({ token, onTransfer, onBurn, onEdit, showActions = true }: TokenCardProps) {
  const isRawMaterial = token.parentId === 0n
  const features = parseFeatures(token.features)
  const featureEntries = Object.entries(features)

  return (
    <Card
      className={`${token.burned ? "opacity-50" : ""} ${onEdit && !token.burned ? "cursor-pointer hover:border-primary transition-colors" : ""}`}
      onClick={onEdit && !token.burned ? () => onEdit(token) : undefined}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-6 flex-wrap">

          {/* Name + badges + ID */}
          <div className="min-w-[180px] flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{token.name}</span>
              <Badge variant={isRawMaterial ? "secondary" : "default"}>
                {isRawMaterial ? "Materia Prima" : "Producto"}
              </Badge>
              {token.burned && <Badge variant="destructive">Redimido</Badge>}
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {token.id.toString()}</p>
          </div>

          {/* Key stats + features — same column style */}
          <div className="flex gap-6 text-sm shrink-0 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Balance</p>
              <p className="font-semibold">{isRawMaterial ? fmtRaw(token.balance) : token.balance.toString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Existencia</p>
              <p className="font-medium">{isRawMaterial ? fmtRaw(token.totalSupply) : token.totalSupply.toString()}</p>
            </div>
            {token.parentId > 0n && (
              <div>
                <p className="text-xs text-muted-foreground">Origen</p>
                <p className="font-medium">#{token.parentId.toString()}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Creado</p>
              <p className="font-medium">{new Date(Number(token.dateCreated) * 1000).toLocaleDateString()}</p>
            </div>
            {featureEntries.map(([k, v]) => (
              <div key={k}>
                <p className="text-xs text-muted-foreground capitalize">{FEATURE_LABELS[k] ?? k}</p>
                <p className="font-medium">{renderFeatureValue(v)}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          {showActions && !token.burned && (
            <div className="flex gap-2 shrink-0 ml-auto items-center">
              {onTransfer && token.balance > 0n && (
                isRawMaterial && !token.certified ? (
                  <span className="text-xs font-medium px-2 py-1 rounded border border-red-400 bg-red-500/20 text-red-700">
                    Certificación Pendiente
                  </span>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onTransfer(token)}>
                    Transferir
                  </Button>
                )
              )}
              {onBurn && (
                <Button size="sm" variant="destructive" onClick={() => onBurn(token)}>
                  Redimir
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
