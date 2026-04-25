"use client"

import { useState } from "react"
import { useWeb3 } from "@/contexts/Web3Context"
import { BomTemplate } from "@/hooks/useBomTemplates"
import { TokenWithBalance } from "@/hooks/useTokens"
import { consumeRawMaterial, createToken } from "@/services/Web3Service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface CreateProductWithBomProps {
  template: BomTemplate
  rawMaterials: TokenWithBalance[]
  onSuccess: () => void
  onCancel: () => void
}

export function CreateProductWithBom({ template, rawMaterials, onSuccess, onCancel }: CreateProductWithBomProps) {
  const { contract } = useWeb3()
  const [productName, setProductName] = useState(`${template.name}`)
  const [quantity, setQuantity] = useState("1")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"idle" | "consuming" | "creating">("idle")

  const qty = parseInt(quantity) || 0

  const consumption = template.items.map((item) => {
    const token = rawMaterials.find((t) => t.id.toString() === item.tokenId)
    const total = item.amountPerUnit * qty
    const available = token ? Number(token.balance) : 0
    return {
      ...item,
      token,
      totalConsumed: total,
      available,
      sufficient: available >= total,
    }
  })

  const allSufficient = qty > 0 && consumption.every((c) => c.sufficient)

  const primaryMaterial = template.items[0]
  const parentId = primaryMaterial ? parseInt(primaryMaterial.tokenId) : 0

  const handleCreate = async () => {
    if (!contract || !allSufficient || !productName.trim()) return
    setLoading(true)

    try {
      // Paso 1: consumir todas las materias primas
      setStep("consuming")
      for (const item of consumption) {
        toast.info(`Consumiendo ${item.totalConsumed} ud de ${item.tokenName}...`)
        await consumeRawMaterial(contract, BigInt(item.tokenId), BigInt(item.totalConsumed))
      }

      // Paso 2: crear el producto con el BOM serializado en features
      setStep("creating")
      toast.info("Creando tokens de producto...")
      const features = JSON.stringify({
        tipo: template.productType,
        estructura: template.name,
        bom: template.items.map((i) => ({ material: i.tokenName, tokenId: i.tokenId, porUnidad: i.amountPerUnit })),
      })
      await createToken(contract, productName.trim(), qty, features, parentId)

      toast.success(`${qty} unidad(es) de "${productName}" creadas correctamente`)
      onSuccess()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al fabricar el producto")
    } finally {
      setLoading(false)
      setStep("idle")
    }
  }

  const stepLabel = step === "consuming" ? "Consumiendo materiales..." : step === "creating" ? "Creando tokens..." : "Fabricar"

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Fabricar: {template.name}</CardTitle>
          <Badge variant="outline" className="capitalize">{template.productType}</Badge>
        </div>
        {template.description && (
          <p className="text-sm text-muted-foreground">{template.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre del producto</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cantidad a producir</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Consumo total de materiales</p>
          <div className="rounded-md border text-sm divide-y">
            {consumption.map((c) => (
              <div key={c.tokenId} className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className={c.sufficient ? "font-medium" : "font-medium text-destructive"}>
                    {c.tokenName}
                  </span>
                  <span className="text-muted-foreground text-xs ml-2">
                    ({c.amountPerUnit} ud/producto × {qty})
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-mono font-semibold ${c.sufficient ? "text-foreground" : "text-destructive"}`}>
                    {c.totalConsumed} ud
                  </span>
                  <div className="text-xs text-muted-foreground">
                    disponible: {c.available}
                    {!c.sufficient && ` · faltan ${c.totalConsumed - c.available}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!allSufficient && qty > 0 && (
            <p className="text-xs text-destructive">
              No tienes materiales suficientes para producir {qty} unidades.
            </p>
          )}
        </div>

        <div className="bg-muted rounded-md p-3 text-sm space-y-1">
          <p className="font-medium">Resumen</p>
          <div className="flex justify-between text-muted-foreground">
            <span>Material de referencia (parentId)</span>
            <span className="font-mono">#{parentId} · {primaryMaterial?.tokenName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tokens a generar</span>
            <span className="font-semibold">{qty > 0 ? qty : "—"}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleCreate}
            disabled={loading || !allSufficient || !productName.trim() || qty <= 0}
          >
            {loading ? stepLabel : `Fabricar ${qty > 0 ? qty : ""} unidad(es)`}
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
