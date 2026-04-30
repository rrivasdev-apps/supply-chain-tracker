"use client"

import { useState } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { transfer } from "@/services/Web3Service"
import { TokenWithBalance } from "@/hooks/useTokens"
import { useApprovedUsers } from "@/hooks/useApprovedUsers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { SCALE_FACTOR, fmtRaw } from "@/contracts/config"

const TARGET_ROLE: Record<string, string> = {
  producer: "factory",
  factory: "retailer",
  retailer: "consumer",
}

const TARGET_LABEL: Record<string, string> = {
  factory: "Fábrica",
  retailer: "Distribuidor",
  consumer: "Cliente",
}

interface TransferFormProps {
  token: TokenWithBalance
  onSuccess?: () => void
  onCancel?: () => void
}

export function TransferForm({ token, onSuccess, onCancel }: TransferFormProps) {
  const { contract, role } = useWeb3()
  const targetRole = TARGET_ROLE[role ?? ""] ?? ""
  const { users: targets, loading: targetsLoading } = useApprovedUsers(targetRole)

  const [to, setTo] = useState("")
  const [amount, setAmount] = useState("")
  const [loading, setLoading] = useState(false)

  const isRawMaterial = token.parentId === 0n
  const balanceDisplay = isRawMaterial ? fmtRaw(token.balance) : token.balance.toString()
  const maxInput = isRawMaterial ? (Number(token.balance) / SCALE_FACTOR).toString() : token.balance.toString()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract || !to) return

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
            <Label>Destinatario ({TARGET_LABEL[targetRole] ?? targetRole})</Label>
            {targetsLoading ? (
              <div className="h-9 bg-muted animate-pulse rounded-md" />
            ) : targets.length === 0 ? (
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-2">
                No hay {TARGET_LABEL[targetRole] ?? targetRole}s aprobados disponibles
              </p>
            ) : (
              <Select value={to} onValueChange={(v) => setTo(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder={`Seleccionar ${TARGET_LABEL[targetRole] ?? targetRole}`} />
                </SelectTrigger>
                <SelectContent>
                  {targets.map((u) => (
                    <SelectItem key={u.addr} value={u.addr}>
                      {u.name} — {u.addr.slice(0, 8)}…{u.addr.slice(-6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <Button type="submit" disabled={loading || !to || targets.length === 0} className="flex-1">
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
