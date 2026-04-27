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
import { SCALE_FACTOR, fmtRaw } from "@/contracts/config"

interface CreateProductWithBomProps {
  template: BomTemplate
  rawMaterials: TokenWithBalance[]
  onSuccess: () => void
  onCancel: () => void
}

// Convierte cantidad real a on-chain (×SCALE_FACTOR). Sin pérdida para hasta 2 decimales.
function toOnChainAmount(floatTotal: number): { onChain: bigint; display: string } {
  const onChainNum = Math.round(floatTotal * SCALE_FACTOR)
  return {
    onChain: BigInt(onChainNum),
    display: floatTotal % 1 === 0 ? floatTotal.toString() : floatTotal.toFixed(2),
  }
}

export function CreateProductWithBom({ template, rawMaterials, onSuccess, onCancel }: CreateProductWithBomProps) {
  const { contract } = useWeb3()
  const [productName, setProductName] = useState(template.name)
  const [quantity, setQuantity] = useState("1")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"idle" | "consuming" | "creating">("idle")

  const qty = parseInt(quantity) || 0

  const consumption = template.items.map((item) => {
    const token = rawMaterials.find((t) => t.id.toString() === item.tokenId)
    const floatTotal = item.amountPerUnit * qty
    const { onChain, display } = toOnChainAmount(floatTotal)
    const availableOnChain = token ? token.balance : 0n
    return {
      ...item,
      token,
      floatTotal,
      onChainAmount: onChain,
      displayTotal: display,
      availableOnChain,
      availableDisplay: token ? fmtRaw(token.balance) : "0",
      sufficient: availableOnChain >= onChain,
    }
  })

  const allSufficient = qty > 0 && consumption.every((c) => c.sufficient)

  const primaryMaterial = template.items[0]
  const parentId = primaryMaterial ? parseInt(primaryMaterial.tokenId) : 0

  const handleCreate = async () => {
    if (!contract || !allSufficient || !productName.trim()) return
    setLoading(true)

    try {
      setStep("consuming")
      for (const item of consumption) {
        toast.info(`Consumiendo ${item.onChainAmount} ud de ${item.tokenName}...`)
        await consumeRawMaterial(contract, BigInt(item.tokenId), item.onChainAmount)
      }

      setStep("creating")
      toast.info("Creando tokens de producto...")
      const features = JSON.stringify({
        tipo: template.productType,
        estructura: template.name,
        bom: template.items.map((i) => ({
          material: i.tokenName,
          tokenId: i.tokenId,
          porUnidad: i.amountPerUnit,
        })),
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

  const stepLabel =
    step === "consuming" ? "Consumiendo materiales..." :
    step === "creating"  ? "Creando tokens..." : "Fabricar"

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
            <Label>Nombre Del Producto</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cantidad A Producir</Label>
            <Input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Consumo Total De Materiales</p>
          <div className="rounded-md border text-sm divide-y">
            {consumption.map((c) => (
              <div key={c.tokenId} className="flex items-center justify-between px-3 py-2">
                <div>
                  <span className={c.sufficient ? "font-medium" : "font-medium text-destructive"}>
                    {c.tokenName}
                  </span>
                  <span className="text-muted-foreground text-xs ml-2">
                    ({c.amountPerUnit} × {qty})
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-mono font-semibold ${c.sufficient ? "" : "text-destructive"}`}>
                    {c.displayTotal} ud
                  </span>
                  <div className="text-xs text-muted-foreground">
                    disponible: {c.availableDisplay}
                    {!c.sufficient && ` · insuficiente`}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!allSufficient && qty > 0 && (
            <p className="text-xs text-destructive">
              Material insuficiente para producir {qty} unidades.
            </p>
          )}
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
