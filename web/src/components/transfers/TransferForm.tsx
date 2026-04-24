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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return

    if (!ethers.isAddress(to)) {
      toast.error("Dirección de destino inválida")
      return
    }

    const amt = BigInt(amount)
    if (amt <= 0n || amt > token.balance) {
      toast.error(`Cantidad debe ser entre 1 y ${token.balance.toString()}`)
      return
    }

    setLoading(true)
    try {
      await transfer(contract, to, token.id, amt)
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
        <p className="text-sm text-muted-foreground">Balance disponible: {token.balance.toString()}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="to">Dirección destino</Label>
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
              min="1"
              max={token.balance.toString()}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Enviando..." : "Enviar transferencia"}
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
