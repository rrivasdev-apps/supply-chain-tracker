"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3 } from "@/contexts/Web3Context"
import { Sidebar } from "@/components/layout/Sidebar"
import { useAllTokens } from "@/hooks/useAllTokens"
import { useApprovedUsers } from "@/hooks/useApprovedUsers"
import { certifyToken } from "@/services/Web3Service"
import { Token } from "@/services/Web3Service"
import { fmtRaw } from "@/contracts/config"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { ethers } from "ethers"

// ── Componentes auxiliares (nivel módulo, estables entre renders) ─────────────

const EmptyState = ({ message }: { message: string }) => (
  <Card>
    <CardContent className="py-10 text-center text-muted-foreground text-sm">{message}</CardContent>
  </Card>
)

const SkeletonList = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
  </div>
)

function parseFeatures(raw: string): Record<string, string> | null {
  try { return JSON.parse(raw) } catch { return null }
}

interface BobinaCardProps {
  token: Token
  showCertify: boolean
  expanded: boolean
  onToggle: () => void
  onCertified: () => void
  producerName: (addr: string) => string
  contract: ethers.Contract
}

function BobinaCard({ token, showCertify, expanded, onToggle, onCertified, producerName, contract }: BobinaCardProps) {
  const [certHash, setCertHash] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const features = parseFeatures(token.features)

  const handleCertify = async () => {
    if (!certHash.trim()) return
    setSubmitting(true)
    try {
      await certifyToken(contract, token.id, certHash.trim())
      toast.success("Lote certificado correctamente")
      setCertHash("")
      onCertified()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al certificar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{token.name}</span>
              <span className="text-xs text-muted-foreground font-mono">#{token.id.toString()}</span>
              {token.certified && <Badge>Certificado</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              {producerName(token.creator)} · {fmtRaw(token.totalSupply)} unidades ·{" "}
              {new Date(Number(token.dateCreated) * 1000).toLocaleDateString("es-ES", {
                day: "2-digit", month: "short", year: "numeric",
              })}
            </p>
          </div>
          {showCertify && (
            <Button
              size="sm"
              variant={expanded ? "outline" : "default"}
              onClick={onToggle}
            >
              {expanded ? "Cancelar" : "Certificar"}
            </Button>
          )}
        </div>

        {features && Object.keys(features).length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(features).map(([k, v]) => (
              <div key={k} className="text-xs bg-muted rounded px-2 py-1">
                <span className="text-muted-foreground">{k}:</span>{" "}
                <span className="font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {expanded && (
          <div className="border-t pt-3 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`cert-${token.id}`} className="text-xs">
                Número De Certificado
              </Label>
              <Input
                id={`cert-${token.id}`}
                value={certHash}
                onChange={(e) => setCertHash(e.target.value)}
                placeholder="Ej: ISO-9001-2024-00123"
                className="font-mono text-xs h-8"
                autoFocus
              />
            </div>
            <Button
              size="sm"
              disabled={!certHash.trim() || submitting}
              onClick={handleCertify}
            >
              {submitting ? "Certificando..." : "Confirmar Certificación"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CertificationPage() {
  const router = useRouter()
  const { isConnected, role, userLoading, contract } = useWeb3()
  const { tokens, loading, refetch } = useAllTokens()
  const { users: producers } = useApprovedUsers("producer")

  const [filterProducer, setFilterProducer] = useState("all")
  const [certifying, setCertifying] = useState<bigint | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!isConnected) { router.push("/"); return }
    if (role !== "certifier") { router.push("/dashboard"); return }
  }, [isConnected, role, userLoading, router])

  const bobinas = tokens.filter((t) => t.parentId === 0n && !t.burned)

  const byProducer = (list: typeof bobinas) =>
    filterProducer === "all"
      ? list
      : list.filter((t) => t.creator.toLowerCase() === filterProducer.toLowerCase())

  const pending = byProducer(bobinas.filter((t) => !t.certified))
  const certified = byProducer(bobinas.filter((t) => t.certified))

  const producerName = (addr: string) => {
    const u = producers.find((p) => p.addr.toLowerCase() === addr.toLowerCase())
    return u ? u.name : `${addr.slice(0, 8)}…${addr.slice(-6)}`
  }

  if (!contract) return null

  return (
    <div className="flex flex-1">
      <Sidebar />
      <main className="flex-1 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Certificación De Lotes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revisa y certifica los lotes de bobinas registrados por la fundición.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={filterProducer} onValueChange={(v) => setFilterProducer(v ?? "all")}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Todos los productores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los productores</SelectItem>
              {producers.map((p) => (
                <SelectItem key={p.addr} value={p.addr}>
                  {p.name} — {p.addr.slice(0, 8)}…{p.addr.slice(-6)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pendientes{!loading && pending.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-orange-100 text-orange-800 text-xs w-5 h-5 font-semibold">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="certified">
              Certificados{!loading && certified.length > 0 && (
                <span className="ml-1.5 text-xs text-muted-foreground">({certified.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {loading ? (
              <SkeletonList />
            ) : pending.length === 0 ? (
              <EmptyState message="No hay lotes pendientes de certificación" />
            ) : (
              pending.map((t) => (
                <BobinaCard
                  key={t.id.toString()}
                  token={t}
                  showCertify
                  expanded={certifying === t.id}
                  onToggle={() => setCertifying(certifying === t.id ? null : t.id)}
                  onCertified={() => { setCertifying(null); refetch() }}
                  producerName={producerName}
                  contract={contract}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="certified" className="mt-4 space-y-3">
            {loading ? (
              <SkeletonList />
            ) : certified.length === 0 ? (
              <EmptyState message="No hay lotes certificados aún" />
            ) : (
              certified.map((t) => (
                <BobinaCard
                  key={t.id.toString()}
                  token={t}
                  showCertify={false}
                  expanded={false}
                  onToggle={() => {}}
                  onCertified={() => {}}
                  producerName={producerName}
                  contract={contract}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
