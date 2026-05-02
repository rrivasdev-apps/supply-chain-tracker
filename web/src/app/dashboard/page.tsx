"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useTokens } from "@/hooks/useTokens"
import { useTransfers } from "@/hooks/useTransfers"
import { useAllTokens } from "@/hooks/useAllTokens"
import {
  Package, ArrowUpRight, ArrowDownLeft,
  Clock, AlertCircle, ShieldCheck, Activity, RotateCcw,
} from "lucide-react"

// ── tipos ─────────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string
  value: number | string
  sub?: string
  icon: React.ReactNode
  gradient: string
  loading?: boolean
  alert?: boolean
}

interface AlertCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  sub: string
  color: string
  href: string
}

// ── componentes de módulo ─────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, gradient, loading, alert }: KpiCardProps) {
  return (
    <div className={`rounded-xl overflow-hidden ${gradient}`} style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.18)" }}>
      <div className="p-5 relative">
        <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -right-1 -bottom-5 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-start justify-between mb-3">
            <div className="text-white [&>svg]:w-7 [&>svg]:h-7">{icon}</div>
            {alert && (
              <span className="text-[10px] font-semibold bg-white/25 rounded-full px-2 py-0.5 text-white">
                Acción
              </span>
            )}
          </div>
          {loading ? (
            <div className="h-8 w-14 rounded bg-white/25 animate-pulse mb-1" />
          ) : (
            <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
          )}
          <div className="text-[14px] font-semibold text-white/90 mt-0.5">{label}</div>
        </div>
      </div>
      {sub && (
        <div className="bg-white/50 px-5 py-2.5">
          <span className="text-[14px] font-semibold text-[#878787]">{sub}</span>
        </div>
      )}
    </div>
  )
}

function AlertCard({ icon, title, value, sub, color, href }: AlertCardProps) {
  return (
    <Link href={href}>
      <div className={`rounded-xl border-2 p-4 cursor-pointer hover:shadow-md transition-shadow ${color}`}>
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm font-semibold">{title}</span>
        </div>
        <div className="text-2xl font-extrabold">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </Link>
  )
}

// ── datos por rol ─────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  producer: "Fundición", certifier: "Certificador", factory: "Fábrica",
  retailer: "Distribuidor", consumer: "Cliente",
}

const CHAIN_STEPS = ["Fundición", "Certificador", "Fábrica", "Distribuidor", "Cliente"]

// ── página ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const { isConnected, isAdmin, userStatus, userLoading, role, account, contract } = useWeb3()
  const { tokens, loading: tokensLoading } = useTokens()
  const { pending, incoming, outgoing, transfers, loading: transfersLoading } = useTransfers()
  const { tokens: allTokens, loading: allTokensLoading } = useAllTokens()
  const [redeemedCount, setRedeemedCount] = useState(0)

  useEffect(() => {
    if (userLoading) return
    if (!isConnected) { router.push("/"); return }
    if (isAdmin)       { router.push("/admin"); return }
    if (userStatus !== 1) { router.push("/"); return }
  }, [isConnected, isAdmin, userStatus, userLoading, router])

  // Cuenta eventos ProductRedeemed del consumer en la blockchain
  useEffect(() => {
    if (role !== "consumer" || !contract || !account) return
    const filter = contract.filters.ProductRedeemed(null, account)
    contract.queryFilter(filter).then((evs) => setRedeemedCount(evs.length)).catch(() => {})
  }, [role, contract, account])

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const loading        = tokensLoading || transfersLoading || allTokensLoading
  const activeCount    = tokens.filter((t) => !t.burned).length
  const pendingIn      = pending.length
  const sentCount      = outgoing.length
  const receivedCount  = incoming.length

  const bobinas          = allTokens.filter((t) => t.parentId === 0n)
  const certifiedCount   = bobinas.filter((t) =>  t.certified).length
  const pendingCertCount = bobinas.filter((t) => !t.certified && !t.burned).length

  const kpis: KpiCardProps[] = role === "certifier" ? [
    { label: "Certificadas", value: certifiedCount,   icon: <ShieldCheck size={18}/>, gradient: "bg-gradient-to-b from-violet-500 to-purple-300",  loading, sub: "lotes certificados" },
    { label: "Pendientes",   value: pendingCertCount, icon: <Clock size={18}/>,       gradient: pendingCertCount > 0 ? "bg-gradient-to-b from-red-500 to-rose-300" : "bg-gradient-to-b from-slate-500 to-gray-300", loading, alert: pendingCertCount > 0, sub: "por certificar" },
  ] : [
    { label: "Productos Totales", value: tokens.length, icon: <Package size={18}/>,  gradient: "bg-gradient-to-b from-blue-500 to-sky-300",       loading, sub: "registrados"   },
    { label: "Activos",           value: activeCount,   icon: <Activity size={18}/>, gradient: "bg-gradient-to-b from-emerald-500 to-green-300",  loading, sub: "en inventario" },
    ...(role === "consumer" ? [
      { label: "Redimidos", value: redeemedCount, icon: <RotateCcw size={18}/>, gradient: "bg-gradient-to-b from-violet-500 to-purple-300", loading, sub: "consumidos" } as KpiCardProps,
    ] : []),
    { label: "Por Aceptar", value: pendingIn,     icon: <Clock size={18}/>,        gradient: pendingIn > 0 ? "bg-gradient-to-b from-red-500 to-rose-300" : "bg-gradient-to-b from-slate-500 to-gray-300", loading, alert: pendingIn > 0, sub: "en tránsito hacia ti" },
    { label: "Enviadas",    value: sentCount,     icon: <ArrowUpRight size={18}/>,  gradient: "bg-gradient-to-b from-indigo-500 to-blue-300",    loading, sub: "emitidas"             },
    { label: "Recibidas",   value: receivedCount, icon: <ArrowDownLeft size={18}/>, gradient: "bg-gradient-to-b from-teal-500 to-cyan-300",      loading, sub: "aceptadas"            },
  ]

  const hasPending = pending.length > 0

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 py-6 pr-6 pl-10 space-y-7">

        {/* ── Encabezado ─────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {ROLE_LABELS[role ?? ""] ?? role} · <span className="font-mono">{account?.slice(0, 8)}…{account?.slice(-6)}</span>
          </p>
        </div>

        {/* ── Acción Requerida ────────────────────────────────────────────── */}
        {hasPending && (
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Acción Requerida
            </p>
            <div className="flex flex-wrap gap-4">
              <AlertCard
                icon={<AlertCircle size={16} className="text-red-500" />}
                title="Transferencias Por Aceptar"
                value={pending.length}
                sub={`${pending.length} pendiente${pending.length > 1 ? "s" : ""}`}
                color="border-red-200 bg-red-50 text-red-900"
                href="/transfers"
              />
            </div>
          </section>
        )}

        {/* ── KPIs ────────────────────────────────────────────────────────── */}
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Resumen
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
          </div>
        </section>

        {/* ── Acciones + Flujo ────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Acciones rápidas */}
          <div className="rounded-xl border bg-card p-5 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Acciones Rápidas
            </p>
            {role === "producer" && (
              <QuickLink href="/tokens" label="Registrar Nueva Bobina" />
            )}
            {role === "certifier" && (
              <QuickLink href="/certification" label="Ver Lotes A Certificar" />
            )}
            {role === "factory" && (
              <>
                <QuickLink href="/tokens"    label="Fabricar Nueva Lámina" />
                <QuickLink href="/transfers" label="Aceptar Transferencias" />
              </>
            )}
            {(role === "retailer" || role === "consumer") && (
              <QuickLink
                href="/transfers"
                label={pending.length > 0 ? `Revisar ${pending.length} Transferencia(s) Pendiente(s)` : "Ver Transferencias"}
                highlight={pending.length > 0}
              />
            )}
          </div>

          {/* Flujo de la cadena */}
          <div className="rounded-xl border bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Tu Posición En La Cadena
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CHAIN_STEPS.map((step, i, arr) => (
                <div key={step} className="flex items-center gap-1.5">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    ROLE_LABELS[role ?? ""] === step
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {step}
                  </span>
                  {i < arr.length - 1 && (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function QuickLink({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between p-3 rounded-lg text-sm font-medium transition-colors ${
        highlight
          ? "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200"
          : "bg-muted hover:bg-muted/70 text-foreground"
      }`}
    >
      {label}
      <ArrowUpRight size={14} className="opacity-50" />
    </Link>
  )
}
