"use client"

import { useState } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { transfer } from "@/services/Web3Service"
import { TokenWithBalance } from "@/hooks/useTokens"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ethers } from "ethers"
import { SCALE_FACTOR, fmtRaw } from "@/contracts/config"

interface TransferFormProps {
  token: TokenWithBalance
  onSuccess?: () => void
  onCancel?: () => void
}

export function TransferForm({ token, onSuccess, onCancel }: TransferFormProps) {
  const { contract } = useWeb3()
  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const isRawMaterial = token.parentId === 0n
  const balanceDisplay = isRawMaterial ? fmtRaw(token.balance) : token.balance.toString()
  const maxInput = isRawMaterial ? (Number(token.balance) / SCALE_FACTOR).toString() : token.balance.toString()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return

    if (!ethers.isAddress(to)) {
      toast.error("Dirección de destino inválida")
      return
    }

    const amtFloat = parseFloat(amount)
    if (isNaN(amtFloat) || amtFloat <= 0) {
      toast.error("Cantidad inválida")
      return
    }
    const amtOnChain = isRawMaterial
      ? BigInt(Math.round(amtFloat * SCALE_FACTOR))
      : BigInt(Math.round(amtFloat))
    if (amtOnChain <= 0n || amtOnChain > token.balance) {
      toast.error(`Cantidad debe ser entre 0 y ${balanceDisplay}`)
      return
    }

    setLoading(true)
    try {
      await transfer(contract, to, token.id, amtOnChain)
      toast.success("Transferencia iniciada — esperando aceptación")
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error en la transferencia")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transferir: {token.name}</CardTitle>
        <p className="text-sm text-muted-foreground">Balance Disponible: {balanceDisplay}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="to">Dirección Destino</Label>
            <Input
              id="to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="0x..."
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Cantidad</Label>
            <Input
              id="amount"
              type="number"
              min={isRawMaterial ? "0.01" : "1"}
              step={isRawMaterial ? "0.01" : "1"}
              max={maxInput}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={isRawMaterial ? "0.5" : "1"}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Enviando..." : "Enviar Transferencia"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
