"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useTransfers } from "@/hooks/useTransfers"
import { useAllTokens } from "@/hooks/useAllTokens"
import { TransferList } from "@/components/transfers/TransferList"
import { acceptTransfer, rejectTransfer } from "@/services/Web3Service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

export default function TransfersPage() {
  const router = useRouter()
  const { isConnected, userStatus, userLoading, contract } = useWeb3()
  const { incoming, outgoing, pending, loading, refetch } = useTransfers()
  const { tokens } = useAllTokens()

  useEffect(() => {
    if (userLoading) return
    if (!isConnected || userStatus !== 1) router.push("/")
  }, [isConnected, userStatus, userLoading, router])

  const tokenMap = tokens.reduce<Record<string, typeof tokens[0]>>((acc, t) => {
    acc[t.id.toString()] = t
    return acc
  }, {})

  const handleAccept = useCallback(async (id: bigint) => {
    if (!contract) return
    try {
      await acceptTransfer(contract, id)
      toast.success("Transferencia aceptada")
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al aceptar")
    }
  }, [contract, refetch])

  const handleReject = useCallback(async (id: bigint) => {
    if (!contract) return
    if (!confirm("¿Rechazar esta transferencia? Los tokens volverán al emisor.")) return
    try {
      await rejectTransfer(contract, id)
      toast.success("Transferencia rechazada")
      refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al rechazar")
    }
  }, [contract, refetch])

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 py-6 pr-6 pl-10 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Transferencias</h1>
          {pending.length > 0 && (
            <Badge variant="secondary">{pending.length} pendiente(s)</Badge>
          )}
        </div>

        <Tabs defaultValue="incoming">
          <TabsList>
            <TabsTrigger value="incoming">
              Recibidas ({incoming.length})
              {pending.length > 0 && (
                <span className="ml-1.5 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing">Enviadas ({outgoing.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="incoming" className="pt-4">
            <TransferList
              transfers={incoming}
              loading={loading}
              tokenMap={tokenMap}
              onAccept={handleAccept}
              onReject={handleReject}
              emptyMessage="No tienes transferencias recibidas."
            />
          </TabsContent>

          <TabsContent value="outgoing" className="pt-4">
            <TransferList
              transfers={outgoing}
              loading={loading}
              tokenMap={tokenMap}
              emptyMessage="No has enviado transferencias."
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
