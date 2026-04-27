"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useTokens, TokenWithBalance } from "@/hooks/useTokens"
import { useBomTemplates, BomTemplate } from "@/hooks/useBomTemplates"
import { TokenList } from "@/components/tokens/TokenList"
import { CreateTokenForm } from "@/components/tokens/CreateTokenForm"
import { TransferForm } from "@/components/transfers/TransferForm"
import { BomEditor } from "@/components/factory/BomEditor"
import { BomTemplateList } from "@/components/factory/BomTemplateList"
import { CreateProductWithBom } from "@/components/factory/CreateProductWithBom"
import { burnToken } from "@/services/Web3Service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

export default function TokensPage() {
  const router = useRouter()
  const { isConnected, userStatus, role, contract, account } = useWeb3()
  const { tokens, loading, refetch } = useTokens()
  const { templates, saveTemplate, updateTemplate, duplicateTemplate, deleteTemplate, isOwner } = useBomTemplates()

  const [transferToken, setTransferToken] = useState<TokenWithBalance | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<BomTemplate | null>(null)
  const [showBomEditor, setShowBomEditor] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState<BomTemplate | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editToken, setEditToken] = useState<TokenWithBalance | null>(null)

  useEffect(() => {
    if (!isConnected || userStatus !== 1) router.push("/")
  }, [isConnected, userStatus, router])

  const rawMaterials = tokens.filter((t) => t.parentId === 0n && !t.burned)
  const products = tokens.filter((t) => t.parentId > 0n && !t.burned)
  const burned = tokens.filter((t) => t.burned)

  const handleBurn = async (token: TokenWithBalance) => {
    if (!contract) return
    if (!confirm(`¿Redimir el token "${token.name}"? Esta acción es irreversible.`)) return
    try {
      await burnToken(contract, token.id)
      toast.success("Token redimido correctamente")
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al redimir token")
    }
  }

  const handleTransferSuccess = () => {
    setTransferToken(null)
    refetch()
  }

  if (role === "producer") {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Mis Productos</h1>
            {!showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)}>+ Nuevo Producto</Button>
            )}
          </div>
          {showCreateForm && (
            <CreateTokenForm
              mode="rawmaterial"
              editToken={editToken}
              onSuccess={async () => {
                try {
                  await refetch()
                } catch {
                  toast.error("Producto creado pero ocurrió un error al actualizar la lista. Usa Actualizar.")
                }
                setShowCreateForm(false)
                setEditToken(null)
              }}
              onCancel={() => { setShowCreateForm(false); setEditToken(null) }}
            />
          )}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Inventario Activo ({rawMaterials.length})</h2>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar"}
              </Button>
            </div>
            <TokenList
              tokens={rawMaterials}
              loading={loading}
              onTransfer={setTransferToken}
              onEdit={(t) => {
                if (t.creator.toLowerCase() === account?.toLowerCase()) {
                  setEditToken(t)
                  setShowCreateForm(true)
                } else {
                  toast.info("Solo el creador puede modificar este producto")
                }
              }}
              emptyMessage="No tienes productos activos."
            />
          </div>
          {burned.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Redimidos ({burned.length})</h2>
              <TokenList tokens={burned} loading={false} showActions={false} />
            </div>
          )}
          <Dialog open={!!transferToken} onOpenChange={(o) => !o && setTransferToken(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferir Lámina</DialogTitle></DialogHeader>
              {transferToken && (
                <TransferForm token={transferToken} onSuccess={handleTransferSuccess} onCancel={() => setTransferToken(null)} />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    )
  }

  if (role === "factory") {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <h1 className="text-2xl font-bold">Inventario De Fábrica</h1>
          <Tabs defaultValue="rawmaterials">
            <TabsList>
              <TabsTrigger value="rawmaterials">Materias Primas ({rawMaterials.length})</TabsTrigger>
              <TabsTrigger value="products">Productos Terminados ({products.length})</TabsTrigger>
              <TabsTrigger value="structures">
                Estructuras ({templates.length})
              </TabsTrigger>
              <TabsTrigger value="produce">Fabricar</TabsTrigger>
            </TabsList>

            <TabsContent value="rawmaterials" className="pt-4">
              <TokenList
                tokens={rawMaterials}
                loading={loading}
                emptyMessage="No hay materias primas. Acepta transferencias entrantes primero."
              />
            </TabsContent>

            <TabsContent value="products" className="pt-4">
              <TokenList
                tokens={products}
                loading={loading}
                onTransfer={setTransferToken}
                emptyMessage="No hay productos fabricados aún."
              />
            </TabsContent>

            <TabsContent value="structures" className="pt-4 space-y-4">
              {(showBomEditor || editingTemplate) ? (
                <BomEditor
                  rawMaterials={rawMaterials}
                  initial={editingTemplate ?? undefined}
                  onSave={(data) => {
                    if (editingTemplate) {
                      updateTemplate(editingTemplate.id, data)
                      toast.success("Estructura actualizada")
                    } else {
                      saveTemplate(data)
                      toast.success("Estructura guardada")
                    }
                    setEditingTemplate(null)
                    setShowBomEditor(false)
                  }}
                  onCancel={() => { setEditingTemplate(null); setShowBomEditor(false) }}
                />
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button onClick={() => setShowBomEditor(true)}>+ Nueva Estructura</Button>
                  </div>
                  <BomTemplateList
                    templates={templates}
                    rawMaterials={rawMaterials}
                    isOwner={isOwner}
                    onEdit={(t) => { setEditingTemplate(t); setShowBomEditor(false) }}
                    onDuplicate={(id) => { duplicateTemplate(id); toast.success("Estructura duplicada") }}
                    onDelete={(id) => { deleteTemplate(id); toast.success("Estructura eliminada") }}
                    onUse={(t) => setActiveTemplate(t)}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="produce" className="pt-4 space-y-4">
              {activeTemplate ? (
                <CreateProductWithBom
                  template={activeTemplate}
                  rawMaterials={rawMaterials}
                  onSuccess={() => { setActiveTemplate(null); refetch() }}
                  onCancel={() => setActiveTemplate(null)}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Selecciona una estructura en la pestaña "Estructuras" y haz clic en "Usar estructura" para producir.
                  </p>
                  {templates.length > 0 && (
                    <BomTemplateList
                      templates={templates}
                      rawMaterials={rawMaterials}
                      isOwner={isOwner}
                      onEdit={(t) => { setEditingTemplate(t); setShowBomEditor(false) }}
                      onDuplicate={(id) => { duplicateTemplate(id); toast.success("Estructura duplicada") }}
                      onDelete={(id) => { deleteTemplate(id); toast.success("Estructura eliminada") }}
                      onUse={(t) => setActiveTemplate(t)}
                    />
                  )}
                  {templates.length === 0 && rawMaterials.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Primero acepta transferencias de materias primas y luego crea estructuras de producto.
                    </p>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Dialog open={!!transferToken} onOpenChange={(o) => !o && setTransferToken(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferir Producto</DialogTitle></DialogHeader>
              {transferToken && (
                <TransferForm token={transferToken} onSuccess={handleTransferSuccess} onCancel={() => setTransferToken(null)} />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    )
  }

  if (role === "retailer") {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <h1 className="text-2xl font-bold">Inventario</h1>
          <TokenList
            tokens={tokens.filter((t) => !t.burned)}
            loading={loading}
            onTransfer={setTransferToken}
            emptyMessage="No tienes productos. Acepta transferencias de la fábrica."
          />
          <Dialog open={!!transferToken} onOpenChange={(o) => !o && setTransferToken(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferir Producto</DialogTitle></DialogHeader>
              {transferToken && (
                <TransferForm token={transferToken} onSuccess={handleTransferSuccess} onCancel={() => setTransferToken(null)} />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    )
  }

  if (role === "consumer") {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <h1 className="text-2xl font-bold">Mis productos</h1>
          <TokenList
            tokens={tokens.filter((t) => !t.burned)}
            loading={loading}
            onBurn={handleBurn}
            emptyMessage="No tienes productos. Acepta transferencias del distribuidor."
          />
          {burned.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Redimidos ({burned.length})</h2>
              <TokenList tokens={burned} loading={false} showActions={false} />
            </div>
          )}
        </main>
      </div>
    )
  }

  return null
}
