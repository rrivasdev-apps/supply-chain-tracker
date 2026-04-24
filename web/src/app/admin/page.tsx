"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { changeStatusUser, getUserInfo, UserInfo, UserStatus } from "@/services/Web3Service"
import { ethers } from "ethers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

const STATUS_LABEL: Record<number, string> = { 0: "Pendiente", 1: "Aprobado", 2: "Rechazado", 3: "Cancelado" }
const STATUS_VARIANT: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary", 1: "default", 2: "destructive", 3: "outline"
}
const ROLE_LABEL: Record<string, string> = {
  producer: "Productor", factory: "Fábrica", retailer: "Distribuidor", consumer: "Consumidor"
}

interface UserEntry extends UserInfo {
  loading?: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const { isConnected, isAdmin, contract } = useWeb3()
  const [lookup, setLookup] = useState("")
  const [users, setUsers] = useState<UserEntry[]>([])
  const [lookupLoading, setLookupLoading] = useState(false)

  useEffect(() => {
    if (!isConnected) { router.push("/"); return }
    if (!isAdmin) { router.push("/dashboard"); return }
  }, [isConnected, isAdmin, router])

  const handleLookup = async () => {
    if (!contract || !ethers.isAddress(lookup)) {
      toast.error("Dirección inválida")
      return
    }
    setLookupLoading(true)
    try {
      const info = await getUserInfo(contract, lookup)
      if (!info || info.id === 0n) {
        toast.info("Usuario no registrado")
      } else {
        setUsers((prev) => {
          const exists = prev.find((u) => u.addr.toLowerCase() === info.addr.toLowerCase())
          if (exists) return prev.map((u) => u.addr.toLowerCase() === info.addr.toLowerCase() ? info : u)
          return [info, ...prev]
        })
      }
    } catch {
      toast.error("Error al buscar usuario")
    } finally {
      setLookupLoading(false)
    }
  }

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
        <h1 className="text-2xl font-bold">Panel de Administración</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar usuario por dirección</CardTitle>
          </CardHeader>
          <CardContent>
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
              <Button onClick={handleLookup} disabled={lookupLoading}>
                {lookupLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {users.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Usuarios ({users.length})</h2>
            {users.map((user) => (
              <Card key={user.addr}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">{user.addr}</span>
                        <Badge variant={STATUS_VARIANT[Number(user.status)]}>
                          {STATUS_LABEL[Number(user.status)]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Rol: {ROLE_LABEL[user.role] ?? user.role} · ID: {user.id.toString()}
                      </p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {Number(user.status) !== 1 && (
                        <Button
                          size="sm"
                          disabled={!!user.loading}
                          onClick={() => handleStatus(user.addr, 1)}
                        >
                          Aprobar
                        </Button>
                      )}
                      {Number(user.status) !== 2 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!!user.loading}
                          onClick={() => handleStatus(user.addr, 2)}
                        >
                          Rechazar
                        </Button>
                      )}
                      {Number(user.status) !== 3 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!user.loading}
                          onClick={() => handleStatus(user.addr, 3)}
                        >
                          Cancelar
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
            <CardTitle className="text-base">Cuentas Anvil de prueba</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Pega una de estas direcciones en el buscador para gestionar sus roles:
            </p>
            <div className="space-y-1 font-mono text-xs text-muted-foreground">
              {[
                "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
                "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
                "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
              ].map((addr) => (
                <div key={addr} className="flex items-center gap-2">
                  <span>{addr}</span>
                  <button
                    onClick={() => { setLookup(addr); toast.info("Dirección copiada al buscador") }}
                    className="text-primary hover:underline"
                  >
                    usar
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
