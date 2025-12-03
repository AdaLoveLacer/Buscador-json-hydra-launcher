"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface FilterPanelProps {
  sortBy: "date" | "size" | "name"
  onSortChange: (sort: "date" | "size" | "name") => void
  dateRange: { from?: Date; to?: Date }
  onDateRangeChange: (range: { from?: Date; to?: Date }) => void
}

export default function FilterPanel({ sortBy, onSortChange, dateRange, onDateRangeChange }: FilterPanelProps) {
  return (
    <Card className="p-6 bg-card border-border h-fit sticky top-24">
      <h3 className="font-semibold text-foreground mb-4">Filtros</h3>

      {/* Sort */}
      <div className="mb-6">
        <Label className="text-sm font-medium text-foreground mb-2 block">Ordenar por</Label>
        <div className="space-y-2">
          {["date", "size", "name"].map((option) => (
            <button
              key={option}
              onClick={() => onSortChange(option as "date" | "size" | "name")}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                sortBy === option ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {option === "date" && "Data de Upload"}
              {option === "size" && "Tamanho do Arquivo"}
              {option === "name" && "Nome do Jogo"}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-foreground">Período</Label>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">De</label>
          <Input
            type="date"
            value={dateRange.from ? dateRange.from.toISOString().split("T")[0] : ""}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                from: e.target.value ? new Date(e.target.value) : undefined,
              })
            }
            className="bg-muted border-border text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Até</label>
          <Input
            type="date"
            value={dateRange.to ? dateRange.to.toISOString().split("T")[0] : ""}
            onChange={(e) =>
              onDateRangeChange({
                ...dateRange,
                to: e.target.value ? new Date(e.target.value) : undefined,
              })
            }
            className="bg-muted border-border text-sm"
          />
        </div>
        {(dateRange.from || dateRange.to) && (
          <Button variant="ghost" size="sm" onClick={() => onDateRangeChange({})} className="w-full text-xs">
            Limpar Filtro
          </Button>
        )}
      </div>
    </Card>
  )
}
