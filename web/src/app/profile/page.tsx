"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useAllUsers } from "@/hooks/useAllUsers"
import { useAdminStats } from "@/hooks/useAdminStats"
import { getUserDates, UserDates } from "@/services/Web3Service"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Package, Layers, ArrowUpRight, Clock,
  ShieldCheck, RotateCcw, Users, Award, Activity,
  CalendarDays, Wallet, Hash, BadgeCheck,
} from "lucide-react"

// ── helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  producer: "Fundición", certifier: "Certificador", factory: "Fábrica",
  retailer: "Distribuidor", consumer: "Cliente",
}
const STATUS_LABELS: Record<number, string> = { 0: "Pendiente", 1: "Aprobado", 2: "Rechazado", 3: "Cancelado" }
const STATUS_VARIANTS: Record<number, "default" | "secondary" | "destructive" | "outline"> = {
  0: "secondary", 1: "default", 2: "destructive", 3: "outline",
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })
}

// ── KPI card coloreada ────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  gradient: string
  loading?: boolean
}

function KpiCard({ label, value, sub, icon, gradient, loading }: KpiCardProps) {
  return (
    <div className={`rounded-xl overflow-hidden ${gradient}`} style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.18)" }}>
      {/* zona principal */}
      <div className="p-5 relative">
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -right-1 -bottom-5 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative">
          <div className="mb-3 text-white [&>svg]:w-7 [&>svg]:h-7">{icon}</div>
          {loading ? (
            <div className="h-8 w-14 rounded bg-white/25 animate-pulse mb-1" />
          ) : (
            <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
          )}
          <div className="text-[14px] font-semibold text-white/90 mt-0.5">{label}</div>
        </div>
      </div>
      {/* zona inferior más clara */}
      {sub && (
        <div className="bg-white/50 px-5 py-2.5">
          <span className="text-[14px] font-semibold text-[#878787]">{sub}</span>
        </div>
      )}
    </div>
  )
}

// ── fila de info de cuenta ────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

// ── KPIs globales del admin ───────────────────────────────────────────────────

function AdminKPIs() {
  const { users, approved } = useAllUsers()
  const [filterAddr, setFilterAddr] = useState("__all__")
  const { stats, loading } = useAdminStats(filterAddr === "__all__" ? undefined : filterAddr)

  const byRole = (role: string) => approved.filter((u) => u.role === role).length
  const isFiltered = filterAddr !== "__all__"

  const kpis: KpiCardProps[] = stats ? [
    { label: "Lotes Registrados",      value: stats.totalRawMaterials,    icon: <Layers size={18}/>,       gradient: "bg-gradient-to-b from-orange-500 to-amber-300",    sub: "bobinas en la cadena"         },
    { label: "Productos Fabricados",   value: stats.totalProducts,        icon: <Package size={18}/>,      gradient: "bg-gradient-to-b from-blue-500 to-sky-300",       sub: "láminas generadas"            },
    { label: "Certificaciones",        value: stats.totalCertifications,  icon: <ShieldCheck size={18}/>,  gradient: "bg-gradient-to-b from-violet-500 to-purple-300",   sub: "emitidas por certificadores"  },
    { label: "Transferencias Totales", value: stats.totalTransfers,       icon: <ArrowUpRight size={18}/>, gradient: "bg-gradient-to-b from-emerald-500 to-green-300",   sub: "movimientos en la cadena"     },
    { label: "En Tránsito",            value: stats.pendingTransfers,     icon: <Clock size={18}/>,        gradient: stats.pendingTransfers > 0 ? "bg-gradient-to-b from-red-500 to-rose-300" : "bg-gradient-to-b from-slate-500 to-gray-300", sub: "pendientes de aceptar" },
    { label: "Redenciones",            value: stats.totalRedemptions,     icon: <RotateCcw size={18}/>,    gradient: "bg-gradient-to-b from-teal-500 to-cyan-300",       sub: "consumos finales"             },
    { label: "Unidades Redimidas",     value: stats.redeemedUnits.toString(), icon: <Activity size={18}/>, gradient: "bg-gradient-to-b from-indigo-500 to-blue-300",    sub: "total consumido"              },
  ] : []

  const roleSummary = [
    { role: "producer",  label: "Fundición",   gradient: "bg-orange-100 text-orange-800" },
    { role: "certifier", label: "Certificador", gradient: "bg-violet-100 text-violet-800" },
    { role: "factory",   label: "Fábrica",      gradient: "bg-blue-100 text-blue-800" },
    { role: "retailer",  label: "Distribuidor", gradient: "bg-emerald-100 text-emerald-800" },
    { role: "consumer",  label: "Cliente",      gradient: "bg-teal-100 text-teal-800" },
  ]

  return (
    <div className="space-y-6">
      {/* Filtro */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[14px] font-semibold text-muted-foreground">
            Actividad De La Cadena
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isFiltered ? "Métricas del usuario seleccionado" : "Métricas globales de toda la cadena"}
          </p>
        </div>
        <Select value={filterAddr} onValueChange={(v) => setFilterAddr(v ?? "__all__")}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos los usuarios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Toda la cadena</SelectItem>
            {approved.map((u) => (
              <SelectItem key={u.addr} value={u.addr}>
                {u.name || u.addr.slice(0, 10)} — {ROLE_LABELS[u.role] ?? u.role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cards KPI */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k) => <KpiCard key={k.label} {...k} loading={false} />)}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No se pudieron cargar los datos.</p>
      )}

      {/* Usuarios por rol — solo en vista global */}
      {!isFiltered && (
        <div className="rounded-xl border bg-card p-5">
          <p className="text-[14px] font-semibold text-muted-foreground mb-4">
            Usuarios Aprobados Por Rol
          </p>
          <div className="grid grid-cols-5 gap-3">
            {roleSummary.map(({ role, label, gradient }) => (
              <div key={role} className={`rounded-xl p-3 text-center ${gradient}`}>
                <div className="text-2xl font-extrabold">{byRole(role)}</div>
                <div className="text-xs font-medium mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── página principal ──────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { isConnected, userStatus, userLoading, account, role, isAdmin, userInfo, contract, disconnectWallet, refreshUser } = useWeb3()
  const [dates, setDates] = useState<UserDates | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!isConnected) router.push("/")
  }, [isConnected, userLoading, router])

  useEffect(() => {
    if (!contract || !account || isAdmin) return
    getUserDates(contract, account).then(setDates).catch(() => {})
  }, [contract, account, isAdmin])

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 py-6 pr-6 pl-10 space-y-8 max-w-5xl">
        <h1 className="text-2xl font-bold">{isAdmin ? "Dashboard" : "Mi Perfil"}</h1>

        {/* ── KPIs admin — va primero para admin ────────────────────────── */}
        {isAdmin && (
          <section>
            <AdminKPIs />
          </section>
        )}

        {/* ── Información de cuenta ──────────────────────────────────────── */}
        <section>
          <p className="text-[14px] font-semibold text-muted-foreground mb-3">
            Información De Cuenta
          </p>
          <div className="rounded-xl border bg-card p-5 space-y-0">
            <div className="flex items-center justify-between mb-2">
              <span />
              <Button variant="outline" size="sm" onClick={refreshUser}>Actualizar</Button>
            </div>

            <InfoRow
              icon={<Wallet size={15} />}
              label="Dirección"
              value={<span className="font-mono text-xs break-all">{account}</span>}
            />
            <InfoRow
              icon={<Users size={15} />}
              label="Rol"
              value={isAdmin ? "Administrador" : ROLE_LABELS[role ?? ""] ?? role ?? "—"}
            />
            <InfoRow
              icon={<BadgeCheck size={15} />}
              label="Estado"
              value={
                <Badge variant={STATUS_VARIANTS[userStatus ?? 0]}>
                  {isAdmin ? "Admin" : STATUS_LABELS[userStatus ?? 0]}
                </Badge>
              }
            />
            {userInfo && (
              <>
                <InfoRow icon={<Award size={15} />}  label="Nombre / Razón Social" value={userInfo.name || "—"} />
                <InfoRow icon={<Hash size={15} />}   label="ID Usuario"            value={userInfo.id.toString()} />
              </>
            )}
            {!isAdmin && dates && (
              <>
                {dates.approvedAt && (
                  <InfoRow icon={<CalendarDays size={15} />} label="Fecha de aprobación" value={fmtDate(dates.approvedAt)} />
                )}
                {!dates.approvedAt && dates.registeredAt && (
                  <InfoRow icon={<CalendarDays size={15} />} label="Fecha de registro" value={fmtDate(dates.registeredAt)} />
                )}
              </>
            )}
          </div>
        </section>

        {/* ── Red ──────────────────────────────────────────────────────── */}
        <section>
          <p className="text-[14px] font-semibold text-muted-foreground mb-3">
            Red
          </p>
          <div className="rounded-xl border bg-card divide-y text-sm">
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">Red</span><span>Ethereum Sepolia</span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">Chain ID</span><span>11155111</span>
            </div>
            <div className="flex justify-between px-5 py-3">
              <span className="text-muted-foreground">RPC</span>
              <span className="font-mono text-xs">sepolia.infura.io</span>
            </div>
          </div>
        </section>

        <Button variant="destructive" onClick={disconnectWallet} className="w-full">
          Desconectar Wallet
        </Button>
      </main>
    </div>
  )
}
