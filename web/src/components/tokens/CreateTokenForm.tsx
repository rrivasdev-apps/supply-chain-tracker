"use client"

import { useState, useEffect } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { createToken, updateToken } from "@/services/Web3Service"
import { FeaturesEditor } from "@/components/features/FeaturesEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { TokenWithBalance } from "@/hooks/useTokens"
import { SCALE_FACTOR, fmtRaw } from "@/contracts/config"

const BOBINA_SUGGESTIONS = ["calidad", "grado", "espesor", "norma", "colada", "lote", "proveedor"]

interface CreateTokenFormProps {
  mode: "rawmaterial"
  editToken?: TokenWithBalance | null
  onSuccess?: () => void | Promise<void>
  onCancel?: () => void
}

function parseFeatures(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]))
    }
  } catch { /* ignore */ }
  return {}
}

export function CreateTokenForm({ editToken, onSuccess, onCancel }: CreateTokenFormProps) {
  const { contract } = useWeb3()
  const [loading, setLoading] = useState(false)

  const isEditMode = !!editToken

  const [name, setName] = useState("")
  const [totalSupply, setTotalSupply] = useState("")
  const [features, setFeatures] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!editToken) return
    setName(editToken.name)
    setTotalSupply(fmtRaw(editToken.totalSupply))
    setFeatures(parseFeatures(editToken.features))
  }, [editToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return
    if (!name.trim()) {
      toast.error("El nombre es obligatorio")
      return
    }

    setLoading(true)
    try {
      if (isEditMode && editToken) {
        await updateToken(contract, editToken.id, name.trim(), JSON.stringify(features))
        toast.success("Bobina actualizada correctamente")
      } else {
        const supplyFloat = parseFloat(totalSupply)
        if (isNaN(supplyFloat) || supplyFloat <= 0) {
          toast.error("La cantidad debe ser un número positivo")
          setLoading(false)
          return
        }
        const supply = Math.round(supplyFloat * SCALE_FACTOR)
        await createToken(contract, name.trim(), supply, JSON.stringify(features), 0)
        toast.success("Bobina registrada correctamente")
      }
      setName("")
      setTotalSupply("")
      setFeatures({})
      await onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Editar Bobina" : "Registrar Nueva Bobina"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre / Referencia</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bobina HR-2024-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supply">Cantidad (toneladas)</Label>
              <Input
                id="supply"
                type="number"
                min="0.01"
                step="0.01"
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                placeholder="25.5"
                disabled={isEditMode}
                className={isEditMode ? "opacity-60 cursor-not-allowed" : ""}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Características Del Lote</Label>
            <FeaturesEditor
              value={features}
              onChange={setFeatures}
              suggestions={BOBINA_SUGGESTIONS}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando..." : isEditMode ? "Guardar Cambios" : "Registrar Bobina"}
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
