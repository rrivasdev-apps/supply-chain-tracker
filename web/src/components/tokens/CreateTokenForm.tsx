"use client"

import { useState } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { createToken } from "@/services/Web3Service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

interface CreateTokenFormProps {
  mode: "rawmaterial" | "product"
  parentTokenId?: bigint
  onSuccess?: () => void
}

const PRODUCT_TYPES = ["puerta", "reja", "marco", "panel", "otro"]

export function CreateTokenForm({ mode, parentTokenId, onSuccess }: CreateTokenFormProps) {
  const { contract } = useWeb3()
  const [loading, setLoading] = useState(false)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contract) return
    if (!name || !totalSupply) {
      toast.error("Nombre y cantidad son obligatorios")
      return
    }

    const supply = parseInt(totalSupply)
    if (isNaN(supply) || supply <= 0) {
      toast.error("La cantidad debe ser un número positivo")
      return
    }

    let features: Record<string, string>
    let parentId: number

    if (mode === "rawmaterial") {
      features = { calidad, espesor, certificado, lote }
      parentId = 0
    } else {
      if (!productType) {
        toast.error("Selecciona el tipo de producto")
        return
      }
      if (!parentTokenId) {
        toast.error("Selecciona la lámina de origen")
        return
      }
      features = { tipo: productType, material, dimensiones, acabado }
      parentId = Number(parentTokenId)
    }

    setLoading(true)
    try {
      await createToken(contract, name, supply, JSON.stringify(features), parentId)
      toast.success("Token creado correctamente")
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
      onSuccess?.()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear token")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "rawmaterial" ? "Nueva lámina de hierro" : "Nuevo producto"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={mode === "rawmaterial" ? "Lámina HR-2024-01" : "Puerta blindada modelo A"} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="supply">Cantidad</Label>
              <Input id="supply" type="number" min="1" value={totalSupply} onChange={(e) => setTotalSupply(e.target.value)} placeholder="100" />
            </div>
          </div>

          {mode === "rawmaterial" ? (
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
                <Label>Tipo de producto</Label>
                <Select onValueChange={(v) => typeof v === "string" && setProductType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo..." />
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

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creando..." : "Crear token"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
