"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Transfer } from "@/services/Web3Service"
import { useWeb3 } from "@/contexts/Web3Context"

interface TransferCardProps {
  transfer: Transfer
  tokenName?: string
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

export function TransferCard({ transfer, tokenName, onAccept, onReject }: TransferCardProps) {
  const { account } = useWeb3()
  const isIncoming = transfer.to.toLowerCase() === account?.toLowerCase()
  const isPending = transfer.status === 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">
            {tokenName ?? `Token #${transfer.tokenId.toString()}`}
          </CardTitle>
          <Badge variant={STATUS_VARIANT[transfer.status]}>
            {STATUS_LABEL[transfer.status]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">ID transferencia: #{transfer.id.toString()}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">De</span>
          <span className="font-mono text-xs">{shortAddr(transfer.from)}</span>
          <span className="text-muted-foreground">Para</span>
          <span className="font-mono text-xs">{shortAddr(transfer.to)}</span>
          <span className="text-muted-foreground">Cantidad</span>
          <span>{transfer.amount.toString()}</span>
          <span className="text-muted-foreground">Fecha</span>
          <span>{new Date(Number(transfer.dateCreated) * 1000).toLocaleDateString()}</span>
        </div>

        {isIncoming && isPending && (onAccept || onReject) && (
          <div className="flex gap-2 pt-1">
            {onAccept && (
              <Button size="sm" onClick={() => onAccept(transfer.id)} className="flex-1">
                Aceptar
              </Button>
            )}
            {onReject && (
              <Button size="sm" variant="destructive" onClick={() => onReject(transfer.id)} className="flex-1">
                Rechazar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
