"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Transfer, Token, CertificationInfo, getCertificationInfo } from "@/services/Web3Service"
import { useWeb3 } from "@/contexts/Web3Context"
import { fmtRaw } from "@/contracts/config"

interface TransferCardProps {
  transfer: Transfer
  token?: Token
  onAccept?: (id: bigint) => void
  onReject?: (id: bigint) => void
}

const STATUS_LABEL: Record<number, string> = { 0: "Pendiente", 1: "Aceptada", 2: "Rechazada" }
const STATUS_VARIANT: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary",
  1: "default",
  2: "destructive",
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function parseFeatures(raw: string): Record<string, string> {
  try { return JSON.parse(raw) } catch { return {} }
}

export function TransferCard({ transfer, token, onAccept, onReject }: TransferCardProps) {
  const { account, contract } = useWeb3()
  const isIncoming = transfer.to.toLowerCase() === account?.toLowerCase()
  const isPending = transfer.status === 0
  const isRaw = token ? token.parentId === 0n : false
  const features = token ? parseFeatures(token.features) : {}
  const featureEntries = Object.entries(features)

  const [certInfo, setCertInfo] = useState<CertificationInfo | null>(null)
  const [certLoading, setCertLoading] = useState(false)
  const [certOpen, setCertOpen] = useState(false)

  const handleCertBadgeClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setCertOpen(true)
    if (certInfo) return
    if (!contract) return
    setCertLoading(true)
    try {
      const info = await getCertificationInfo(contract, transfer.tokenId)
      setCertInfo(info)
    } finally {
      setCertLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent className="py-3 px-4 space-y-3">
          <div className="flex items-center gap-6 flex-wrap">

            {/* Nombre + tipo + estado */}
            <div className="min-w-[180px] flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">
                  {token?.name ?? `Token #${transfer.tokenId.toString()}`}
                </span>
                {token && (
                  <Badge variant={isRaw ? "secondary" : "default"}>
                    {isRaw ? "Bobina / Materia Prima" : "Lámina / Producto"}
                  </Badge>
                )}
                {isRaw && token && (
                  token.certified ? (
                    <Badge
                      variant="default"
                      className="bg-green-600 text-white cursor-pointer hover:bg-green-700 transition-colors"
                      onClick={handleCertBadgeClick}
                    >
                      Certificada ↗
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Sin Certificar</Badge>
                  )
                )}
                <Badge variant={STATUS_VARIANT[transfer.status]}>
                  {STATUS_LABEL[transfer.status]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {isIncoming ? "Recibida" : "Enviada"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Token #{transfer.tokenId.toString()} · Transferencia #{transfer.id.toString()}
              </p>
            </div>

            {/* Columnas de datos */}
            <div className="flex gap-6 text-sm shrink-0 flex-wrap">
              <div>
                <p className="text-xs text-muted-foreground">De</p>
                <p className="font-mono font-medium text-xs">{shortAddr(transfer.from)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Para</p>
                <p className="font-mono font-medium text-xs">{shortAddr(transfer.to)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cantidad</p>
                <p className="font-semibold">{isRaw ? fmtRaw(transfer.amount) : transfer.amount.toString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="font-medium">{new Date(Number(transfer.dateCreated) * 1000).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Acciones */}
            {isIncoming && isPending && (onAccept || onReject) && (
              <div className="flex gap-2 shrink-0 ml-auto">
                {onAccept && (
                  <Button size="sm" onClick={() => onAccept(transfer.id)}>
                    Aceptar
                  </Button>
                )}
                {onReject && (
                  <Button size="sm" variant="destructive" onClick={() => onReject(transfer.id)}>
                    Rechazar
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Especificaciones del token */}
          {featureEntries.length > 0 && (
            <div className="flex gap-2 flex-wrap pt-1 border-t">
              {featureEntries.map(([k, v]) => (
                <div key={k} className="text-xs bg-muted rounded px-2 py-1">
                  <span className="text-muted-foreground capitalize">{k}:</span>{" "}
                  <span className="font-medium">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de certificación */}
      <Dialog open={certOpen} onOpenChange={setCertOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Detalle de Certificación</DialogTitle>
          </DialogHeader>
          {certLoading ? (
            <div className="space-y-2 py-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ) : certInfo ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Certificador</p>
                <p className="font-semibold">{certInfo.certifierName}</p>
                <p className="text-xs text-muted-foreground font-mono">{certInfo.certifier}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Nro. de Certificado</p>
                <p className="font-semibold font-mono">{certInfo.certNumber}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha de Certificación</p>
                <p className="font-medium">
                  {certInfo.timestamp.toLocaleDateString("es-ES", {
                    day: "2-digit", month: "long", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No se encontró información de certificación.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
