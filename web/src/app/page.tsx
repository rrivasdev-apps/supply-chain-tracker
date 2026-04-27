"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { requestUserRole } from "@/services/Web3Service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

const ROLES = [
  { value: "producer", label: "Productor (Fundición)", description: "Crea láminas de hierro tokenizadas" },
  { value: "factory", label: "Fábrica", description: "Fabrica puertas, rejas y marcos" },
  { value: "retailer", label: "Distribuidor", description: "Distribuye productos a clientes" },
  { value: "consumer", label: "Consumidor", description: "Recibe y redime productos" },
]

const STATUS_INFO: Record<number, { title: string; description: string }> = {
  0: { title: "Solicitud Pendiente", description: "Tu solicitud está siendo revisada por el administrador." },
  1: { title: "Cuenta Aprobada", description: "Tu cuenta está activa." },
  2: { title: "Solicitud Rechazada", description: "Tu solicitud fue rechazada. Contacta al administrador." },
  3: { title: "Cuenta Cancelada", description: "Tu cuenta fue cancelada. Contacta al administrador." },
}

export default function HomePage() {
  const router = useRouter()
  const { isConnected, isAdmin, userStatus, role, contract, connectWallet, refreshUser } = useWeb3()
  const [selectedRole, setSelectedRole] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isConnected) { setIsRegistered(null); return }
    if (isAdmin) { router.push("/admin"); return }
    if (userStatus === null) { setIsRegistered(false); return }
    if (userStatus === 1) { router.push("/dashboard"); return }
    setIsRegistered(true)
  }, [isConnected, isAdmin, userStatus, router])

  const handleRequestRole = async () => {
    if (!contract || !selectedRole) return
    setRequesting(true)
    try {
      await requestUserRole(contract, selectedRole)
      await refreshUser()
      toast.success("Solicitud enviada correctamente")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al solicitar rol")
    } finally {
      setRequesting(false)
    }
  }

  if (!isConnected) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">Metal Trace</h1>
            <p className="text-muted-foreground text-lg">
              Trazabilidad blockchain para cadena de suministro industrial.
              Desde la fundición hasta el cliente final.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {["Productor", "Fábrica", "Distribuidor", "Consumidor"].map((r) => (
              <div key={r} className="bg-muted rounded-lg p-3 text-muted-foreground">{r}</div>
            ))}
          </div>

          <Button size="lg" onClick={connectWallet} className="w-full">
            Conectar MetaMask Para Acceder
          </Button>

          <p className="text-xs text-muted-foreground">
            Red: Anvil local · chainId 31337
          </p>
        </div>
      </main>
    )
  }

  if (isRegistered === false) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Registro De Usuario</CardTitle>
            <CardDescription>Selecciona Tu Rol En La Cadena De Suministro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelectedRole(r.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedRole === r.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                >
                  <div className="font-medium text-sm">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.description}</div>
                </button>
              ))}
            </div>
            <Button onClick={handleRequestRole} disabled={!selectedRole || requesting} className="w-full">
              {requesting ? "Enviando solicitud..." : "Solicitar Acceso"}
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (isRegistered && userStatus !== 1) {
    const info = STATUS_INFO[userStatus ?? 0]
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <Badge variant={userStatus === 0 ? "secondary" : userStatus === 2 ? "destructive" : "outline"}>
              {info.title}
            </Badge>
            <CardDescription className="pt-2">{info.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Rol solicitado: <span className="font-medium capitalize">{role}</span>
            </p>
            <Button variant="outline" className="mt-4 w-full" onClick={refreshUser}>
              Actualizar estado
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return null
}
