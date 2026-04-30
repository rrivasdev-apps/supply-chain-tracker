"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FeaturesEditorProps {
  value: Record<string, string>
  onChange: (v: Record<string, string>) => void
  suggestions?: string[]
}

export function FeaturesEditor({ value, onChange, suggestions = [] }: FeaturesEditorProps) {
  const entries = Object.entries(value)

  const updateAt = (index: number, newKey: string, newVal: string) => {
    const next = entries.map(([k, v], i) =>
      i === index ? [newKey, newVal] as [string, string] : [k, v] as [string, string]
    )
    onChange(Object.fromEntries(next))
  }

  const removeAt = (index: number) => {
    onChange(Object.fromEntries(entries.filter((_, i) => i !== index)))
  }

  const addEntry = (key = "") => {
    onChange({ ...value, [key]: "" })
  }

  const unusedSuggestions = suggestions.filter((s) => !entries.some(([k]) => k === s))

  return (
    <div className="space-y-2">
      {entries.map(([k, v], i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            className="w-36 text-sm h-8"
            value={k}
            onChange={(e) => updateAt(i, e.target.value, v)}
            placeholder="Campo"
          />
          <Input
            className="flex-1 text-sm h-8"
            value={v}
            onChange={(e) => updateAt(i, k, e.target.value)}
            placeholder="Valor"
          />
          <button
            type="button"
            onClick={() => removeAt(i)}
            className="text-muted-foreground hover:text-destructive text-sm px-1 shrink-0 leading-none"
            aria-label="Eliminar campo"
          >
            ✕
          </button>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={() => addEntry()}>
        + Añadir campo
      </Button>

      {unusedSuggestions.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pt-0.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => addEntry(s)}
              className="text-xs border rounded px-2 py-0.5 text-muted-foreground hover:border-primary hover:text-foreground transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
