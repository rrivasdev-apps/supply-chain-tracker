"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useTokens, TokenWithBalance } from "@/hooks/useTokens"
import { TokenList } from "@/components/tokens/TokenList"
import { CreateTokenForm } from "@/components/tokens/CreateTokenForm"
import { TransferForm } from "@/components/transfers/TransferForm"
import { burnToken } from "@/services/Web3Service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function TokensPage() {
  const router = useRouter()
  const { isConnected, userStatus, role, contract } = useWeb3()
  const { tokens, loading, refetch } = useTokens()

  const [transferToken, setTransferToken] = useState<TokenWithBalance | null>(null)
  const [selectedParent, setSelectedParent] = useState<bigint | undefined>()

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
          <h1 className="text-2xl font-bold">Mis láminas</h1>
          <CreateTokenForm mode="rawmaterial" onSuccess={refetch} />
          <div>
            <h2 className="text-lg font-semibold mb-3">Inventario activo ({rawMaterials.length})</h2>
            <TokenList
              tokens={rawMaterials}
              loading={loading}
              onTransfer={setTransferToken}
              emptyMessage="No tienes láminas activas. Crea una arriba."
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
              <DialogHeader><DialogTitle>Transferir lámina</DialogTitle></DialogHeader>
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
          <h1 className="text-2xl font-bold">Inventario de Fábrica</h1>
          <Tabs defaultValue="rawmaterials">
            <TabsList>
              <TabsTrigger value="rawmaterials">Materias primas ({rawMaterials.length})</TabsTrigger>
              <TabsTrigger value="products">Productos terminados ({products.length})</TabsTrigger>
              <TabsTrigger value="create">Fabricar producto</TabsTrigger>
            </TabsList>

            <TabsContent value="rawmaterials" className="pt-4">
              <TokenList
                tokens={rawMaterials}
                loading={loading}
                emptyMessage="No hay materias primas. Acepta transferencias entrantes primero."
              />
            </TabsContent>

            <TabsContent value="products" className="pt-4 space-y-4">
              <TokenList
                tokens={products}
                loading={loading}
                onTransfer={setTransferToken}
                emptyMessage="No hay productos fabricados aún."
              />
            </TabsContent>

            <TabsContent value="create" className="pt-4 space-y-4">
              {rawMaterials.length > 0 ? (
                <>
                  <div className="space-y-1.5 max-w-sm">
                    <Label>Lámina de origen (parentId)</Label>
                    <Select onValueChange={(v) => typeof v === "string" && v && setSelectedParent(BigInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona lámina..." />
                      </SelectTrigger>
                      <SelectContent>
                        {rawMaterials.map((t) => (
                          <SelectItem key={t.id.toString()} value={t.id.toString()}>
                            #{t.id.toString()} · {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <CreateTokenForm mode="product" parentTokenId={selectedParent} onSuccess={refetch} />
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Necesitas materias primas antes de fabricar productos. Acepta transferencias entrantes en la pestaña de Transferencias.
                </p>
              )}
            </TabsContent>
          </Tabs>

          <Dialog open={!!transferToken} onOpenChange={(o) => !o && setTransferToken(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferir producto</DialogTitle></DialogHeader>
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
              <DialogHeader><DialogTitle>Transferir producto</DialogTitle></DialogHeader>
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
