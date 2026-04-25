"use client"

import { BomTemplate } from "@/hooks/useBomTemplates"
import { TokenWithBalance } from "@/hooks/useTokens"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface BomTemplateListProps {
  templates: BomTemplate[]
  rawMaterials: TokenWithBalance[]
  isOwner: (t: BomTemplate) => boolean
  onEdit: (t: BomTemplate) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
  onUse: (t: BomTemplate) => void
}

function canFulfill(template: BomTemplate, rawMaterials: TokenWithBalance[], qty: number): boolean {
  return template.items.every((item) => {
    const token = rawMaterials.find((t) => t.id.toString() === item.tokenId)
    return token && token.balance >= BigInt(item.amountPerUnit * qty)
  })
}

export function BomTemplateList({
  templates,
  rawMaterials,
  isOwner,
  onEdit,
  onDuplicate,
  onDelete,
  onUse,
}: BomTemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        No hay estructuras de producto guardadas. Crea una para empezar.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {templates.map((template) => {
        const canMakeOne = canFulfill(template, rawMaterials, 1)
        const owner = isOwner(template)

        return (
          <Card key={template.id} className={!canMakeOne ? "opacity-60" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  {template.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="capitalize shrink-0">{template.productType}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs space-y-1">
                <p className="text-muted-foreground font-medium uppercase tracking-wide">Por unidad de producto:</p>
                {template.items.map((item) => {
                  const token = rawMaterials.find((t) => t.id.toString() === item.tokenId)
                  const sufficient = token && token.balance >= BigInt(item.amountPerUnit)
                  return (
                    <div key={item.tokenId} className="flex justify-between">
                      <span className={sufficient ? "" : "text-destructive"}>
                        {item.tokenName}
                        <span className="text-muted-foreground ml-1 text-[10px]">#{item.tokenId}</span>
                      </span>
                      <span className="font-mono font-medium">{item.amountPerUnit} ud</span>
                    </div>
                  )
                })}
              </div>

              {!canMakeOne && (
                <p className="text-xs text-destructive">Material insuficiente para producir al menos 1 unidad</p>
              )}

              <div className="flex gap-2 flex-wrap pt-1">
                <Button size="sm" onClick={() => onUse(template)} disabled={!canMakeOne} className="flex-1">
                  Usar estructura
                </Button>
                {owner && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onDuplicate(template.id)}>
                      Duplicar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(template.id)}>
                      Eliminar
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
