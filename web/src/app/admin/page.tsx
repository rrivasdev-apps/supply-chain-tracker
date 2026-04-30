"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { changeStatusUser, getUserInfo, UserInfo, UserStatus } from "@/services/Web3Service"
import { useAllUsers } from "@/hooks/useAllUsers"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

const STATUS_LABEL: Record<number, string> = { 0: "Pendiente", 1: "Aprobado", 2: "Rechazado", 3: "Cancelado" }
const STATUS_VARIANT: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary", 1: "default", 2: "destructive", 3: "outline"
}
const ROLE_LABEL: Record<string, string> = {
  producer: "Fundición", certifier: "Certificador", factory: "Fábrica", retailer: "Distribuidor", consumer: "Cliente"
}

const ANVIL_ACCOUNTS = [
  { addr: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", label: "Account 1 (Alice) — Admin" },
  { addr: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", label: "Account 2 (Bob)" },
  { addr: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", label: "Account 3 (Charlie)" },
  { addr: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", label: "Account 4 (Dave)" },
  { addr: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", label: "Account 5 (Eve)" },
]

interface UserEntry extends UserInfo {
  loading?: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const { isConnected, isAdmin, userLoading, contract } = useWeb3()
  const [lookup, setLookup] = useState("")
  const [users, setUsers] = useState<UserEntry[]>([])
  const [lookupLoading, setLookupLoading] = useState(false)
  const { pending: pendingUsers, loading: pendingLoading, refetch: refetchPending } = useAllUsers()

  useEffect(() => {
    if (userLoading) return
    if (!isConnected) { router.push("/"); return }
    if (!isAdmin) { router.push("/dashboard"); return }
  }, [isConnected, isAdmin, userLoading, router])

  const handleLookup = useCallback(async (addressOverride?: string) => {
    const address = addressOverride ?? lookup
    if (!contract || !ethers.isAddress(address)) {
      toast.error("Dirección inválida")
      return
    }
    setLookupLoading(true)
    try {
      const info = await getUserInfo(contract, address)
      if (!info || info.id === 0n) {
        toast.info("Usuario no registrado en el contrato")
      } else {
        setUsers((prev) => {
          const exists = prev.find((u) => u.addr.toLowerCase() === info.addr.toLowerCase())
          if (exists) return prev.map((u) => u.addr.toLowerCase() === info.addr.toLowerCase() ? info : u)
          return [info, ...prev]
        })
        toast.success(`Usuario encontrado: ${ROLE_LABEL[info.role] ?? info.role}`)
      }
    } catch {
      toast.error("Error al buscar usuario")
    } finally {
      setLookupLoading(false)
    }
  }, [contract, lookup])

  const handleStatus = useCallback(async (addr: string, status: UserStatus) => {
    if (!contract) return
    setUsers((prev) => prev.map((u) => u.addr === addr ? { ...u, loading: true } : u))
    try {
      await changeStatusUser(contract, addr, status)
      const updated = await getUserInfo(contract, addr)
      if (updated) {
        setUsers((prev) => prev.map((u) => u.addr.toLowerCase() === addr.toLowerCase() ? { ...updated } : u))
      }
      toast.success(`Estado actualizado a: ${STATUS_LABEL[status]}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cambiar estado")
      setUsers((prev) => prev.map((u) => u.addr === addr ? { ...u, loading: false } : u))
    }
  }, [contract])

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Panel De Administración</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Flujo de prueba: conecta otras cuentas de Anvil → solicitan un rol → búscalas aquí → apruébalas.
          </p>
        </div>

        {(pendingLoading || pendingUsers.length > 0) && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-orange-800">
                Solicitudes Pendientes
                {!pendingLoading && (
                  <span className="ml-2 text-sm font-normal">({pendingUsers.length})</span>
                )}
              </CardTitle>
              <CardDescription className="text-orange-700">Usuarios que esperan aprobación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingLoading ? (
                <div className="h-10 bg-orange-100 animate-pulse rounded" />
              ) : (
                pendingUsers.map((user) => (
                  <div key={user.addr} className="flex items-center justify-between gap-4 flex-wrap bg-white rounded-md px-3 py-2 border border-orange-100">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABEL[user.role] ?? user.role} · <span className="font-mono">{user.addr.slice(0, 8)}…{user.addr.slice(-6)}</span>
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={async () => {
                          if (!contract) return
                          try {
                            await changeStatusUser(contract, user.addr, 1)
                            await refetchPending()
                            toast.success(`${user.name || user.addr.slice(0, 8)} aprobado`)
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Error al aprobar")
                          }
                        }}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          if (!contract) return
                          try {
                            await changeStatusUser(contract, user.addr, 2)
                            await refetchPending()
                            toast.success(`${user.name || user.addr.slice(0, 8)} rechazado`)
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Error al rechazar")
                          }
                        }}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-800">Cómo Probar El Flujo Completo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-700 space-y-1">
            <p>1. Abre MetaMask y cambia a otra cuenta (Bob, Charlie, Dave, Eve)</p>
            <p>2. Recarga la página — verás el formulario de registro</p>
            <p>3. Esa cuenta solicita su rol (Productor, Fábrica, etc.)</p>
            <p>4. Vuelve a conectar con esta cuenta (Account 1 / Alice)</p>
            <p>5. Busca la dirección de esa cuenta aquí y apruébala</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar Y Gestionar Usuario</CardTitle>
            <CardDescription>Ingresa una dirección o usa las cuentas de prueba de abajo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="lookup" className="sr-only">Dirección</Label>
                <Input
                  id="lookup"
                  value={lookup}
                  onChange={(e) => setLookup(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                />
              </div>
              <Button onClick={() => handleLookup()} disabled={lookupLoading}>
                {lookupLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>

            <div className="space-y-1 pt-1">
              <p className="text-xs text-muted-foreground font-medium">Cuentas Anvil Rápidas:</p>
              {ANVIL_ACCOUNTS.map(({ addr, label }) => (
                <div key={addr} className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <button
                    onClick={() => { setLookup(addr); handleLookup(addr) }}
                    className="text-primary hover:underline font-medium shrink-0"
                  >
                    Buscar →
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {users.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Usuarios Encontrados ({users.length})</h2>
            {users.map((user) => (
              <Card key={user.addr}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{user.addr}</span>
                        <Badge variant={STATUS_VARIANT[Number(user.status)]}>
                          {STATUS_LABEL[Number(user.status)]}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium">
                        {user.name && <span className="mr-1">{user.name} —</span>}
                        {ROLE_LABEL[user.role] ?? user.role}
                        <span className="text-muted-foreground font-normal"> · ID #{user.id.toString()}</span>
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {Number(user.status) !== 1 && (
                        <Button
                          size="sm"
                          disabled={!!user.loading}
                          onClick={() => handleStatus(user.addr, 1)}
                        >
                          {user.loading ? "..." : "Aprobar"}
                        </Button>
                      )}
                      {Number(user.status) !== 2 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!!user.loading}
                          onClick={() => handleStatus(user.addr, 2)}
                        >
                          {user.loading ? "..." : "Rechazar"}
                        </Button>
                      )}
                      {Number(user.status) !== 3 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!user.loading}
                          onClick={() => handleStatus(user.addr, 3)}
                        >
                          {user.loading ? "..." : "Cancelar"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Separator />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Private Keys De Anvil (Para Importar En MetaMask)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-800 space-y-1">
              <p className="font-medium">Estas keys son válidas SOLO con el mnemónico por defecto de Anvil.</p>
              <p>Si Anvil muestra direcciones distintas al arrancar, copia las keys directamente desde la terminal donde corre <code className="bg-amber-100 px-1 rounded">anvil</code>.</p>
              <p>Verifica: al importar en MetaMask la cuenta debe tener <strong>10000 ETH</strong>. Si muestra 0, la key es incorrecta.</p>
            </div>
            <div className="space-y-2">
              {[
                { label: "Account 2 (Bob)",    addr: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", key: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" },
                { label: "Account 3 (Charlie)", addr: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", key: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" },
                { label: "Account 4 (Dave)",   addr: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", key: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" },
                { label: "Account 5 (Eve)",    addr: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", key: "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926b" },
              ].map(({ label, addr, key }) => (
                <div key={addr} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{addr.slice(0,10)}…{addr.slice(-6)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted px-2 py-1 rounded break-all">{key}</code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(key); toast.success(`Key de ${label} copiada`) }}
                      className="text-xs text-primary hover:underline shrink-0 font-medium"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground space-y-1 pt-1">
              <p className="font-medium">¿Cuenta importada con balance 0?</p>
              <p>Ejecuta <code className="bg-muted px-1 rounded">anvil</code> sin argumentos y copia la private key de la cuenta que quieras desde la salida de la terminal. Anvil las imprime todas al arrancar.</p>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Mnemónico Por Defecto De Anvil:</p>
              <code className="bg-muted px-2 py-1 rounded block">test test test test test test test test test test test junk</code>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
