"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Transfer } from "@/services/Web3Service"
import { useWeb3 } from "@/contexts/Web3Context"
import { fmtRaw } from "@/contracts/config"

interface TransferCardProps {
  transfer: Transfer
  tokenName?: string
  tokenIsRaw?: boolean
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

export function TransferCard({ transfer, tokenName, tokenIsRaw, onAccept, onReject }: TransferCardProps) {
  const { account } = useWeb3()
  const isIncoming = transfer.to.toLowerCase() === account?.toLowerCase()
  const isPending = transfer.status === 0

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-6 flex-wrap">

          {/* Nombre del producto + ID + estado */}
          <div className="min-w-[180px] flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">
                {tokenName ?? `Token #${transfer.tokenId.toString()}`}
              </span>
              <Badge variant={STATUS_VARIANT[transfer.status]}>
                {STATUS_LABEL[transfer.status]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {isIncoming ? "Recibida" : "Enviada"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Transferencia #{transfer.id.toString()}
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
              <p className="font-semibold">{tokenIsRaw ? fmtRaw(transfer.amount) : transfer.amount.toString()}</p>
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
      </CardContent>
    </Card>
  )
}
