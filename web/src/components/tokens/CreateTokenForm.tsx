"use client"

import { useState, useEffect } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { createToken, updateToken } from "@/services/Web3Service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { TokenWithBalance } from "@/hooks/useTokens"
import { SCALE_FACTOR, fmtRaw } from "@/contracts/config"

interface CreateTokenFormProps {
  mode: "rawmaterial" | "product"
  parentTokenId?: bigint
  editToken?: TokenWithBalance | null
  onSuccess?: () => void | Promise<void>
  onCancel?: () => void
}

const PRODUCT_TYPES = ["puerta", "reja", "marco", "panel", "otro"]

function parseFeatures(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "object" && !Array.isArray(parsed)) {
      return Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, String(v)])
      )
    }
  } catch { /* ignore */ }
  return {}
}

export function CreateTokenForm({ mode, parentTokenId, editToken, onSuccess, onCancel }: CreateTokenFormProps) {
  const { contract } = useWeb3()
  const [loading, setLoading] = useState(false)

  const isEditMode = !!editToken
  const effectiveMode = editToken
    ? (editToken.parentId === 0n ? "rawmaterial" : "product")
    : mode

  const [name, setName] = useState("")
  const [totalSupply, setTotalSupply] = useState("")

  // Raw material fields
  const [calidad, setCalidad] = useState("")
  const [espesor, setEspesor] = useState("")
  const [certificado, setCertificado] = useState("")
  const [lote, setLote] = useState("")

  // Product fields
  const [productType, setProductType] = useState("")
  const [material, setMaterial] = useState("")
  const [dimensiones, setDimensiones] = useState("")
  const [acabado, setAcabado] = useState("")

  // Populate fields when entering edit mode
  useEffect(() => {
    if (!editToken) return
    setName(editToken.name)
    setTotalSupply(editToken.parentId === 0n ? fmtRaw(editToken.totalSupply) : editToken.totalSupply.toString())
    const f = parseFeatures(editToken.features)
    if (editToken.parentId === 0n) {
      setCalidad(f.calidad ?? "")
      setEspesor(f.espesor ?? "")
      setCertificado(f.certificado ?? "")
      setLote(f.lote ?? "")
    } else {
      setProductType(f.tipo ?? "")
      setMaterial(f.material ?? "")
      setDimensiones(f.dimensiones ?? "")
      setAcabado(f.acabado ?? "")
    }
  }, [editToken])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return
    if (!name) {
      toast.error("El nombre es obligatorio")
      return
    }

    let features: Record<string, string>
    let parentId: number

    if (effectiveMode === "rawmaterial") {
      features = { calidad, espesor, certificado, lote }
      parentId = 0
    } else {
      if (!productType) {
        toast.error("Selecciona el tipo de producto")
        return
      }
      if (!isEditMode && !parentTokenId) {
        toast.error("Selecciona la lámina de origen")
        return
      }
      features = { tipo: productType, material, dimensiones, acabado }
      parentId = parentTokenId ? Number(parentTokenId) : Number(editToken?.parentId ?? 0)
    }

    setLoading(true)
    try {
      if (isEditMode && editToken) {
        await updateToken(contract, editToken.id, name, JSON.stringify(features))
        toast.success("Producto actualizado correctamente")
      } else {
        const supplyFloat = parseFloat(totalSupply)
        if (isNaN(supplyFloat) || supplyFloat <= 0) {
          toast.error("La cantidad debe ser un número positivo")
          setLoading(false)
          return
        }
        const supply = effectiveMode === "rawmaterial"
          ? Math.round(supplyFloat * SCALE_FACTOR)
          : Math.round(supplyFloat)
        await createToken(contract, name, supply, JSON.stringify(features), parentId)
        toast.success("Producto creado correctamente")
      }
      resetFields()
      await onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar producto")
    } finally {
      setLoading(false)
    }
  }

  const resetFields = () => {
    setName("")
    setTotalSupply("")
    setCalidad("")
    setEspesor("")
    setCertificado("")
    setLote("")
    setProductType("")
    setMaterial("")
    setDimensiones("")
    setAcabado("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos Del Producto</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={effectiveMode === "rawmaterial" ? "Lámina HR-2024-01" : "Puerta blindada modelo A"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supply">Cantidad</Label>
              <Input
                id="supply"
                type="number"
                min={effectiveMode === "rawmaterial" ? "0.01" : "1"}
                step={effectiveMode === "rawmaterial" ? "0.01" : "1"}
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                placeholder="100"
                disabled={isEditMode}
                className={isEditMode ? "opacity-60 cursor-not-allowed" : ""}
              />
            </div>
          </div>

          {effectiveMode === "rawmaterial" ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Calidad</Label>
                <Input value={calidad} onChange={(e) => setCalidad(e.target.value)} placeholder="A36, HR, CR..." />
              </div>
              <div className="space-y-1.5">
                <Label>Espesor (mm)</Label>
                <Input value={espesor} onChange={(e) => setEspesor(e.target.value)} placeholder="3.5" />
              </div>
              <div className="space-y-1.5">
                <Label>Certificado</Label>
                <Input value={certificado} onChange={(e) => setCertificado(e.target.value)} placeholder="ISO 9001" />
              </div>
              <div className="space-y-1.5">
                <Label>Lote</Label>
                <Input value={lote} onChange={(e) => setLote(e.target.value)} placeholder="LOTE-2024-001" />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Tipo De Producto</Label>
                <Select value={productType} onValueChange={(v) => typeof v === "string" && setProductType(v)}>
                  <SelectTrigger>
                    <SelectValue>
                      {productType
                        ? <span className="capitalize">{productType}</span>
                        : <span className="text-muted-foreground">Selecciona tipo...</span>
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Material</Label>
                  <Input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Acero galvanizado" />
                </div>
                <div className="space-y-1.5">
                  <Label>Dimensiones</Label>
                  <Input value={dimensiones} onChange={(e) => setDimensiones(e.target.value)} placeholder="80x200 cm" />
                </div>
                <div className="space-y-1.5">
                  <Label>Acabado</Label>
                  <Input value={acabado} onChange={(e) => setAcabado(e.target.value)} placeholder="Pintura epóxica" />
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Guardando..." : isEditMode ? "Modificar Producto" : "Crear producto"}
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
