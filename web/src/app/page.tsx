"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { requestUserRole } from "@/services/Web3Service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const ROLES = [
  { value: "producer",  label: "Fundición",    description: "Produce y registra lotes de bobinas de acero" },
  { value: "certifier", label: "Certificador", description: "Certifica los lotes de producción de la fundición" },
  { value: "factory",   label: "Fábrica",      description: "Procesa bobinas y produce láminas de acero" },
  { value: "retailer",  label: "Distribuidor", description: "Distribuye láminas a clientes" },
  { value: "consumer",  label: "Cliente",      description: "Recibe láminas como materia prima y las redime" },
]

const STATUS_INFO: Record<number, { title: string; description: string }> = {
  0: { title: "Solicitud Pendiente", description: "Tu solicitud está siendo revisada por el administrador." },
  1: { title: "Cuenta Aprobada",    description: "Tu cuenta está activa." },
  2: { title: "Solicitud Rechazada", description: "Tu solicitud fue rechazada. Contacta al administrador." },
  3: { title: "Cuenta Cancelada",   description: "Tu cuenta fue cancelada. Contacta al administrador." },
}

export default function HomePage() {
  const router = useRouter()
  const { isConnected, isAdmin, userStatus, role, contract, account, connectWallet, refreshUser } = useWeb3()
  const [selectedRole, setSelectedRole] = useState("")
  const [entityName, setEntityName] = useState("")
  const [requesting, setRequesting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Redirect approved users and admin
  useEffect(() => {
    if (isAdmin) { router.push("/admin"); return }
    if (isConnected && userStatus === 1) { router.push("/dashboard"); return }
  }, [isConnected, isAdmin, userStatus, router])

  // Reset form when account changes
  useEffect(() => {
    setSelectedRole("")
    setEntityName("")
    setSubmitted(false)
  }, [account])

  const handleRequestRole = async () => {
    if (!contract || !selectedRole) return
    if (!entityName.trim()) {
      toast.error("El nombre o razón social es obligatorio")
      return
    }
    setRequesting(true)
    try {
      await requestUserRole(contract, entityName.trim(), selectedRole)
      // Hide the form immediately — don't wait for getUserInfo to settle
      setSubmitted(true)
      toast.success("Solicitud enviada correctamente")
      // Refresh in background; if it fails the status card is already showing
      refreshUser().catch(() => {})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al solicitar rol")
    } finally {
      setRequesting(false)
    }
  }

  // ── Not connected ──────────────────────────────────────────────────────────
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
            {["Fundición", "Certificador", "Distribuidor", "Cliente"].map((r) => (
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

  // Redirecting (admin or approved) — render nothing while router works
  if (isAdmin || userStatus === 1) return null

  // ── Connected, not registered ──────────────────────────────────────────────
  if (userStatus === null && !submitted) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Registro De Usuario</CardTitle>
            <CardDescription>Selecciona Tu Rol En La Cadena De Suministro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="entityName">Nombre O Razón Social</Label>
              <Input
                id="entityName"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="Ej: Acería del Norte S.A."
              />
            </div>
            <div className="space-y-2">
              <Label>Rol En La Cadena</Label>
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelectedRole(r.value)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedRole === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="font-medium text-sm">{r.label}</div>
                  <div className="text-xs text-muted-foreground">{r.description}</div>
                </button>
              ))}
            </div>
            <Button
              onClick={handleRequestRole}
              disabled={!selectedRole || !entityName.trim() || requesting}
              className="w-full"
            >
              {requesting ? "Enviando solicitud..." : "Solicitar Acceso"}
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  // ── Connected, registered (pending / rejected / cancelled) ─────────────────
  const displayRole = role ?? selectedRole
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
            Rol solicitado: <span className="font-medium capitalize">{displayRole}</span>
          </p>
          <Button variant="outline" className="mt-4 w-full" onClick={refreshUser}>
            Actualizar estado
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
