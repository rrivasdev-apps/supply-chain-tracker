"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useTokens, TokenWithBalance } from "@/hooks/useTokens"
import { TokenList } from "@/components/tokens/TokenList"
import { CreateTokenForm } from "@/components/tokens/CreateTokenForm"
import { CreateLaminaForm } from "@/components/factory/CreateLaminaForm"
import { TransferForm } from "@/components/transfers/TransferForm"
import { burnToken } from "@/services/Web3Service"
import { RedeemForm } from "@/components/consumer/RedeemForm"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

export default function TokensPage() {
  const router = useRouter()
  const { isConnected, userStatus, userLoading, role, contract, account } = useWeb3()
  const { tokens, loading, refetch } = useTokens()

  const [transferToken, setTransferToken] = useState<TokenWithBalance | null>(null)
  const [redeemToken, setRedeemToken] = useState<TokenWithBalance | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editToken, setEditToken] = useState<TokenWithBalance | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!isConnected || userStatus !== 1) router.push("/")
  }, [isConnected, userStatus, userLoading, router])

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

  // ── Fundición ──────────────────────────────────────────────────────────────
  if (role === "producer") {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Mis Bobinas</h1>
            {!showCreateForm && (
              <Button onClick={() => setShowCreateForm(true)}>+ Nueva Bobina</Button>
            )}
          </div>

          {showCreateForm && (
            <CreateTokenForm
              mode="rawmaterial"
              editToken={editToken}
              onSuccess={async () => {
                try { await refetch() } catch {
                  toast.error("Bobina creada. Usa Actualizar para ver la lista.")
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
                  toast.info("Solo el creador puede modificar esta bobina")
                }
              }}
              emptyMessage="No tienes bobinas activas."
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
              <DialogHeader><DialogTitle>Transferir Bobina</DialogTitle></DialogHeader>
              {transferToken && (
                <TransferForm
                  token={transferToken}
                  onSuccess={handleTransferSuccess}
                  onCancel={() => setTransferToken(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    )
  }

  // ── Fábrica ────────────────────────────────────────────────────────────────
  if (role === "factory") {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <h1 className="text-2xl font-bold">Inventario De Fábrica</h1>

          <Tabs defaultValue="bobinas">
            <TabsList>
              <TabsTrigger value="bobinas">Materia Prima ({rawMaterials.length})</TabsTrigger>
              <TabsTrigger value="laminas">Productos Fabricados ({products.length})</TabsTrigger>
              <TabsTrigger value="fabricar">Fabricar Producto</TabsTrigger>
            </TabsList>

            <TabsContent value="bobinas" className="pt-4">
              <TokenList
                tokens={rawMaterials}
                loading={loading}
                emptyMessage="No hay bobinas en inventario. Acepta transferencias de la fundición primero."
              />
            </TabsContent>

            <TabsContent value="laminas" className="pt-4">
              <TokenList
                tokens={products}
                loading={loading}
                onTransfer={setTransferToken}
                emptyMessage="No hay láminas fabricadas aún."
              />
            </TabsContent>

            <TabsContent value="fabricar" className="pt-4">
              <CreateLaminaForm
                bobinas={rawMaterials}
                onSuccess={async () => {
                  try { await refetch() } catch {
                    toast.error("Lámina creada. Usa Actualizar para ver la lista.")
                  }
                }}
              />
            </TabsContent>
          </Tabs>

          <Dialog open={!!transferToken} onOpenChange={(o) => !o && setTransferToken(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferir Lámina</DialogTitle></DialogHeader>
              {transferToken && (
                <TransferForm
                  token={transferToken}
                  onSuccess={handleTransferSuccess}
                  onCancel={() => setTransferToken(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    )
  }

  // ── Distribuidor ───────────────────────────────────────────────────────────
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
            emptyMessage="No tienes láminas. Acepta transferencias de la fábrica."
          />
          <Dialog open={!!transferToken} onOpenChange={(o) => !o && setTransferToken(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferir Lámina</DialogTitle></DialogHeader>
              {transferToken && (
                <TransferForm
                  token={transferToken}
                  onSuccess={handleTransferSuccess}
                  onCancel={() => setTransferToken(null)}
                />
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    )
  }

  // ── Cliente ────────────────────────────────────────────────────────────────
  if (role === "consumer") {
    return (
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-6 space-y-6">
          <h1 className="text-2xl font-bold">Mis Láminas</h1>
          <TokenList
            tokens={tokens.filter((t) => !t.burned)}
            loading={loading}
            onBurn={(token) => setRedeemToken(token)}
            emptyMessage="No tienes láminas. Acepta transferencias del distribuidor."
          />
          {burned.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Redimidas ({burned.length})</h2>
              <TokenList tokens={burned} loading={false} showActions={false} />
            </div>
          )}
          <RedeemForm
            token={redeemToken}
            onClose={() => setRedeemToken(null)}
            onSuccess={refetch}
          />
        </main>
      </div>
    )
  }

  return null
}
