"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { changeStatusUser, UserInfo, UserStatus } from "@/services/Web3Service"
import { useAllUsers } from "@/hooks/useAllUsers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"

const STATUS_LABEL: Record<number, string> = { 0: "Pendiente", 1: "Aprobado", 2: "Rechazado", 3: "Cancelado" }
const STATUS_VARIANT: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary", 1: "default", 2: "destructive", 3: "outline",
}
const ROLE_LABEL: Record<string, string> = {
  producer: "Fundición", certifier: "Certificador", factory: "Fábrica",
  retailer: "Distribuidor", consumer: "Cliente",
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function matches(user: UserInfo, query: string): boolean {
  if (!query.trim()) return true
  const q = query.toLowerCase()
  return (
    user.name.toLowerCase().includes(q) ||
    user.addr.toLowerCase().includes(q)
  )
}

// ── Fila de usuario ───────────────────────────────────────────────────────────

interface UserRowProps {
  user: UserInfo
  onAction: (addr: string, status: UserStatus) => void
  busy: boolean
}

function UserRow({ user, onAction, busy }: UserRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap px-3 py-2.5 border rounded-md bg-background">
      <div className="space-y-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{user.name || "Sin nombre"}</span>
          <Badge variant={STATUS_VARIANT[user.status]}>{STATUS_LABEL[user.status]}</Badge>
          <Badge variant="outline" className="text-xs">{ROLE_LABEL[user.role] ?? user.role}</Badge>
        </div>
        <p className="text-xs text-muted-foreground font-mono">{shortAddr(user.addr)}</p>
      </div>

      <div className="flex gap-2 shrink-0">
        {user.status !== 1 && (
          <Button size="sm" disabled={busy} onClick={() => onAction(user.addr, 1)}>
            Aprobar
          </Button>
        )}
        {user.status !== 2 && (
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => onAction(user.addr, 2)}>
            Rechazar
          </Button>
        )}
        {user.status !== 3 && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction(user.addr, 3)}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Lista con estado vacío y skeleton ─────────────────────────────────────────

function UserList({
  users, loading, query, emptyMessage, onAction, busyAddr,
}: {
  users: UserInfo[]
  loading: boolean
  query: string
  emptyMessage: string
  onAction: (addr: string, status: UserStatus) => void
  busyAddr: string | null
}) {
  const filtered = useMemo(() => users.filter((u) => matches(u, query)), [users, query])

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-md" />)}
      </div>
    )
  }

  if (filtered.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          {query.trim() ? `Sin resultados para "${query}"` : emptyMessage}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {filtered.map((u) => (
        <UserRow key={u.addr} user={u} onAction={onAction} busy={busyAddr === u.addr} />
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter()
  const { isConnected, isAdmin, userLoading, contract } = useWeb3()
  const { users, pending, approved, loading, refetch } = useAllUsers()
  const rejected  = users.filter((u) => u.status === 2)
  const canceled  = users.filter((u) => u.status === 3)

  const [query, setQuery] = useState("")
  const [busyAddr, setBusyAddr] = useState<string | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!isConnected) { router.push("/"); return }
    if (!isAdmin) { router.push("/dashboard"); return }
  }, [isConnected, isAdmin, userLoading, router])

  const handleAction = async (addr: string, status: UserStatus) => {
    if (!contract) return
    setBusyAddr(addr)
    try {
      await changeStatusUser(contract, addr, status)
      toast.success(`Estado actualizado a: ${STATUS_LABEL[status]}`)
      await refetch()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar estado")
    } finally {
      setBusyAddr(null)
    }
  }

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 py-6 pr-6 pl-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Panel De Administración</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de usuarios y roles en la cadena de suministro.
          </p>
        </div>

        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o dirección..."
          className="max-w-md"
        />

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pendientes
              {!loading && pending.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-orange-100 text-orange-800 text-xs w-5 h-5 font-semibold">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprobados
              {!loading && approved.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({approved.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rechazados
              {!loading && rejected.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({rejected.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="canceled">
              Cancelados
              {!loading && canceled.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({canceled.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            <UserList
              users={pending}
              loading={loading}
              query={query}
              emptyMessage="No hay solicitudes pendientes."
              onAction={handleAction}
              busyAddr={busyAddr}
            />
          </TabsContent>

          <TabsContent value="approved" className="mt-4">
            <UserList
              users={approved}
              loading={loading}
              query={query}
              emptyMessage="No hay usuarios aprobados aún."
              onAction={handleAction}
              busyAddr={busyAddr}
            />
          </TabsContent>

          <TabsContent value="rejected" className="mt-4">
            <UserList
              users={rejected}
              loading={loading}
              query={query}
              emptyMessage="No hay usuarios rechazados."
              onAction={handleAction}
              busyAddr={busyAddr}
            />
          </TabsContent>

          <TabsContent value="canceled" className="mt-4">
            <UserList
              users={canceled}
              loading={loading}
              query={query}
              emptyMessage="No hay usuarios cancelados."
              onAction={handleAction}
              busyAddr={busyAddr}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
