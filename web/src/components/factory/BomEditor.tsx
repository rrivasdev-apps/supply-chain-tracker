"use client"

import { useState, useEffect } from "react"
import { BomTemplate, BomItem } from "@/hooks/useBomTemplates"
import { TokenWithBalance } from "@/hooks/useTokens"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const PRODUCT_TYPES = ["puerta", "reja", "marco", "panel", "otro"]

interface BomEditorProps {
  rawMaterials: TokenWithBalance[]
  initial?: BomTemplate
  onSave: (data: Omit<BomTemplate, "id" | "creatorAddress" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
}

export function BomEditor({ rawMaterials, initial, onSave, onCancel }: BomEditorProps) {
  const [name, setName] = useState(initial?.name ?? "")
  const [productType, setProductType] = useState(initial?.productType ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [items, setItems] = useState<BomItem[]>(initial?.items ?? [])

  const [selectedTokenId, setSelectedTokenId] = useState("")
  const [selectedAmt, setSelectedAmt] = useState("")

  useEffect(() => {
    if (initial) {
      setName(initial.name)
      setProductType(initial.productType)
      setDescription(initial.description)
      setItems(initial.items)
    }
  }, [initial])

  const addItem = () => {
    if (!selectedTokenId || !selectedAmt) return
    const amt = Number(selectedAmt)
    if (isNaN(amt) || amt <= 0) return

    const token = rawMaterials.find((t) => t.id.toString() === selectedTokenId)
    if (!token) return

    setItems((prev) => {
      const existing = prev.find((i) => i.tokenId === selectedTokenId)
      if (existing) {
        return prev.map((i) =>
          i.tokenId === selectedTokenId ? { ...i, amountPerUnit: amt } : i
        )
      }
      return [...prev, { tokenId: selectedTokenId, tokenName: token.name, amountPerUnit: amt }]
    })
    setSelectedTokenId("")
    setSelectedAmt("")
  }

  const removeItem = (tokenId: string) => {
    setItems((prev) => prev.filter((i) => i.tokenId !== tokenId))
  }

  const handleSave = () => {
    if (!name.trim() || !productType || items.length === 0) return
    onSave({ name: name.trim(), productType, description: description.trim(), items })
  }

  const isValid = name.trim() && productType && items.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {initial ? "Editar estructura de producto" : "Nueva estructura de producto"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre de la estructura</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Puerta Blindada M90" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de producto</Label>
            <Select onValueChange={(v) => typeof v === "string" && setProductType(v)} value={productType || undefined}>
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
        </div>

        <div className="space-y-1.5">
          <Label>Descripción (opcional)</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción breve del producto..." />
        </div>

        <div className="space-y-3">
          <Label>Materias primas por unidad de producto</Label>

          {items.length > 0 && (
            <div className="rounded-md border divide-y text-sm">
              {items.map((item) => {
                const token = rawMaterials.find((t) => t.id.toString() === item.tokenId)
                return (
                  <div key={item.tokenId} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <span className="font-medium">{item.tokenName}</span>
                      <span className="text-muted-foreground ml-2 text-xs">#{item.tokenId}</span>
                      {token && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          disponible: {token.balance.toString()}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold">{item.amountPerUnit} ud/producto</span>
                      <button
                        onClick={() => removeItem(item.tokenId)}
                        className="text-destructive hover:text-destructive/80 text-xs"
                      >
                        quitar
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Materia prima</Label>
              <Select onValueChange={(v) => typeof v === "string" && setSelectedTokenId(v)} value={selectedTokenId || undefined}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona material..." />
                </SelectTrigger>
                <SelectContent>
                  {rawMaterials.map((t) => (
                    <SelectItem key={t.id.toString()} value={t.id.toString()}>
                      #{t.id.toString()} · {t.name} (disp: {t.balance.toString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36 space-y-1.5">
              <Label className="text-xs text-muted-foreground">Unidades/producto</Label>
              <Input
                type="number"
                min="1"
                value={selectedAmt}
                onChange={(e) => setSelectedAmt(e.target.value)}
                placeholder="Ej: 3"
              />
            </div>
            <Button type="button" variant="outline" onClick={addItem} disabled={!selectedTokenId || !selectedAmt}>
              Añadir
            </Button>
          </div>
          {rawMaterials.length === 0 && (
            <p className="text-xs text-muted-foreground">Acepta transferencias de materias primas primero.</p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={!isValid} className="flex-1">
            Guardar estructura
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
