"use client"

import { useState } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { createToken, consumeRawMaterial } from "@/services/Web3Service"
import { TokenWithBalance } from "@/hooks/useTokens"
import { FeaturesEditor } from "@/components/features/FeaturesEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { SCALE_FACTOR, fmtRaw } from "@/contracts/config"

const LAMINA_SUGGESTIONS = ["tipo", "espesor", "dimensiones", "acabado", "tratamiento", "norma"]

interface CreateLaminaFormProps {
  bobinas: TokenWithBalance[]
  onSuccess?: () => void | Promise<void>
  onCancel?: () => void
}

export function CreateLaminaForm({ bobinas, onSuccess, onCancel }: CreateLaminaFormProps) {
  const { contract } = useWeb3()
  const [parentIdStr, setParentIdStr] = useState("")
  const [consumeAmt, setConsumeAmt] = useState("")
  const [name, setName] = useState("")
  const [supply, setSupply] = useState("")
  const [features, setFeatures] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const certifiedBobinas = bobinas.filter((b) => b.certified)
  const selectedBobina = certifiedBobinas.find((b) => b.id.toString() === parentIdStr)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return
    if (!parentIdStr) { toast.error("Selecciona la bobina de origen"); return }
    if (!name.trim()) { toast.error("El nombre es obligatorio"); return }

    const supplyNum = parseInt(supply)
    if (isNaN(supplyNum) || supplyNum <= 0) {
      toast.error("La cantidad de láminas debe ser un número positivo")
      return
    }

    const consumeFloat = parseFloat(consumeAmt)
    if (isNaN(consumeFloat) || consumeFloat <= 0) {
      toast.error("Ingresa la cantidad de bobina a consumir")
      return
    }
    const consumeOnChain = BigInt(Math.round(consumeFloat * SCALE_FACTOR))
    if (selectedBobina && consumeOnChain > selectedBobina.balance) {
      toast.error(`Balance disponible: ${fmtRaw(selectedBobina.balance)}`)
      return
    }

    setLoading(true)
    try {
      await consumeRawMaterial(contract, BigInt(parentIdStr), consumeOnChain)
      await createToken(contract, name.trim(), supplyNum, JSON.stringify(features), Number(parentIdStr))
      toast.success("Lámina creada correctamente")
      setParentIdStr("")
      setConsumeAmt("")
      setName("")
      setSupply("")
      setFeatures({})
      await onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear lámina")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fabricar Nueva Lámina</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selector de bobina — ancho completo */}
          <div className="space-y-1.5">
            <Label>Bobina De Origen (certificada)</Label>
            {certifiedBobinas.length === 0 ? (
              <p className="text-sm text-muted-foreground border rounded-md px-3 py-2">
                No hay bobinas certificadas. Acepta transferencias primero.
              </p>
            ) : (
              <Select value={parentIdStr} onValueChange={(v) => { setParentIdStr(v ?? ""); setConsumeAmt("") }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar bobina...">
                    {selectedBobina && (
                      <span>
                        <span className="font-medium">{selectedBobina.name}</span>
                        <span className="text-muted-foreground ml-1.5">
                          #{selectedBobina.id.toString()} · {fmtRaw(selectedBobina.balance)} disponible
                        </span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                  {certifiedBobinas.map((b) => (
                    <SelectItem key={b.id.toString()} value={b.id.toString()}>
                      <span className="font-medium">{b.name}</span>
                      <span className="text-muted-foreground ml-1.5">
                        #{b.id.toString()} · {fmtRaw(b.balance)} disponible
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Consumo de bobina */}
          <div className="space-y-1.5">
            <Label htmlFor="consume">
              Consumo De Bobina
              {selectedBobina && (
                <span className="ml-1 text-muted-foreground font-normal">
                  (máx {fmtRaw(selectedBobina.balance)})
                </span>
              )}
            </Label>
            <Input
              id="consume"
              type="number"
              min="0.01"
              step="0.01"
              max={selectedBobina ? (Number(selectedBobina.balance) / SCALE_FACTOR).toString() : undefined}
              value={consumeAmt}
              onChange={(e) => setConsumeAmt(e.target.value)}
              placeholder="Ej: 10.5"
              disabled={!parentIdStr}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="lamina-name">Nombre / Referencia</Label>
              <Input
                id="lamina-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Lámina CR-2024-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lamina-supply">Cantidad (unidades a producir)</Label>
              <Input
                id="lamina-supply"
                type="number"
                min="1"
                step="1"
                value={supply}
                onChange={(e) => setSupply(e.target.value)}
                placeholder="100"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Características</Label>
            <FeaturesEditor value={features} onChange={setFeatures} suggestions={LAMINA_SUGGESTIONS} />
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={loading || !parentIdStr || certifiedBobinas.length === 0}
              className="flex-1"
            >
              {loading ? "Procesando..." : "Consumir Bobina Y Crear Lámina"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
