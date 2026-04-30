"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TokenWithBalance } from "@/hooks/useTokens"
import { redeemProduct } from "@/services/Web3Service"
import { useWeb3 } from "@/contexts/Web3Context"
import { toast } from "sonner"

interface RedeemFormProps {
  token: TokenWithBalance | null
  onClose: () => void
  onSuccess: () => void
}

export function RedeemForm({ token, onClose, onSuccess }: RedeemFormProps) {
  const { contract } = useWeb3()
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const maxAmount = token ? Number(token.balance) : 0
  const amountNum = parseInt(amount)
  const valid = !isNaN(amountNum) && amountNum > 0 && amountNum <= maxAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract || !token || !valid) return
    setLoading(true)
    try {
      await redeemProduct(contract, token.id, BigInt(amountNum))
      toast.success(`${amountNum} unidad(es) de "${token.name}" redimidas correctamente`)
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al redimir")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={!!token} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Redimir Láminas</DialogTitle>
          <DialogDescription>
            {token?.name} · Token #{token?.id.toString()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="redeem-amount">
              Cantidad a redimir
              <span className="ml-1 text-muted-foreground font-normal">
                (máx {maxAmount})
              </span>
            </Label>
            <Input
              id="redeem-amount"
              type="number"
              min={1}
              max={maxAmount}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`1 – ${maxAmount}`}
              autoFocus
            />
          </div>

          {valid && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm space-y-1">
              <p>
                <span className="text-muted-foreground">Láminas a redimir:</span>{" "}
                <span className="font-semibold">{amountNum}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Restan en tu cuenta:</span>{" "}
                <span className="font-semibold">{maxAmount - amountNum}</span>
              </p>
              {token && (
                <p className="text-xs text-muted-foreground pt-1">
                  Se reducirá también el suministro del lote de origen (bobina #{token.parentId.toString()}).
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              variant="destructive"
              disabled={!valid || loading}
              className="flex-1"
            >
              {loading ? "Redimiendo..." : "Confirmar Redención"}
            </Button>
            <Button type="button" variant="outline" disabled={loading} onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
