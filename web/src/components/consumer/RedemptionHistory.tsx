"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Redemption, getRedemptions } from "@/services/Web3Service"
import { useWeb3 } from "@/contexts/Web3Context"
import { ethers } from "ethers"

interface RedemptionHistoryProps {
  tokenId: bigint
  tokenName: string
  open: boolean
  onClose: () => void
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

export function RedemptionHistory({ tokenId, tokenName, open, onClose }: RedemptionHistoryProps) {
  const { contract, account } = useWeb3()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !contract || !account) return
    setLoading(true)
    getRedemptions(contract, tokenId, account)
      .then(setRedemptions)
      .finally(() => setLoading(false))
  }, [open, contract, tokenId, account])

  const total = redemptions.reduce((sum, r) => sum + r.amount, 0n)

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Historial De Redenciones</DialogTitle>
          <DialogDescription>{tokenName} · Token #{tokenId.toString()}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2].map((i) => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {redemptions.map((r, i) => (
              <div key={i} className="border rounded-md px-3 py-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{r.amount.toString()} unidad(es)</span>
                  <span className="text-xs text-muted-foreground">
                    {r.timestamp.toLocaleDateString("es-ES", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {r.consumerName !== r.consumer
                      ? <><span className="font-medium text-foreground">{r.consumerName}</span> · {shortAddr(r.consumer)}</>
                      : <span className="font-mono">{shortAddr(r.consumer)}</span>
                    }
                  </span>
                  <a
                    href={`https://etherscan.io/tx/${r.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono hover:underline"
                    title={r.txHash}
                  >
                    {r.txHash.slice(0, 10)}…
                  </a>
                </div>
              </div>
            ))}

            {redemptions.length > 1 && (
              <div className="border-t pt-2 text-sm text-muted-foreground flex justify-between">
                <span>Total redimido</span>
                <span className="font-semibold text-foreground">{total.toString()} unidades</span>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
