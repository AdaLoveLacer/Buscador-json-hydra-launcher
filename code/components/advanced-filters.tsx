"use client"

import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RotateCcw } from "lucide-react"
import { useTranslations } from "@/components/i18n-provider"

interface FilterState {
  searchQuery: string
  sortBy: "date" | "size" | "name"
  dateRange: { from?: Date; to?: Date }
  sizeRange: { min?: number; max?: number }
  searchMode: "all" | "any"
}

interface AdvancedFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  totalResults: number
}

export default function AdvancedFilters({ filters, onFiltersChange, totalResults }: AdvancedFiltersProps) {
  const resetFilters = () => {
    onFiltersChange({
      searchQuery: filters.searchQuery,
      sortBy: "date",
      dateRange: {},
      sizeRange: {},
      searchMode: "all",
    })
  }

  const updateDateRange = (field: "from" | "to", value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value ? new Date(value) : undefined,
      },
    })
  }

  const updateSizeRange = (field: "min" | "max", value: string) => {
    onFiltersChange({
      ...filters,
      sizeRange: {
        ...filters.sizeRange,
        [field]: value ? Number.parseFloat(value) * 1024 * 1024 * 1024 : undefined,
      },
    })
  }

  const t = useTranslations()
  
  return (
    <Card className="p-6 bg-card border-border h-fit sticky top-24 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{t('filters.title')}</h3>
        <button
          onClick={resetFilters}
          className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          {t('filters.clear')}
        </button>
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">{t('filters.search_mode.title')}</Label>
        <div className="space-y-2">
          {[
            { id: "all", label: t('filters.search_mode.all') },
            { id: "any", label: t('filters.search_mode.any') },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  searchMode: option.id as "all" | "any",
                })
              }
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                filters.searchMode === option.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sorting */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">{t('filters.sort.title')}</Label>
        <div className="space-y-2">
          {[
            { id: "date", label: t('filters.sort.date') },
            { id: "size", label: t('filters.sort.size') },
            { id: "name", label: t('filters.sort.name') },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  sortBy: option.id as "date" | "size" | "name",
                })
              }
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                filters.sortBy === option.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">{t('filters.date_range.title')}</Label>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t('filters.date_range.from')}</label>
          <Input
            type="date"
            value={filters.dateRange.from ? filters.dateRange.from.toISOString().split("T")[0] : ""}
            onChange={(e) => updateDateRange("from", e.target.value)}
            className="bg-muted border-border text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t('filters.date_range.to')}</label>
          <Input
            type="date"
            value={filters.dateRange.to ? filters.dateRange.to.toISOString().split("T")[0] : ""}
            onChange={(e) => updateDateRange("to", e.target.value)}
            className="bg-muted border-border text-sm"
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">{t('filters.size_range.title')}</Label>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t('filters.size_range.min')}</label>
          <Input
            type="number"
            min="0"
            step="0.5"
            placeholder={t('filters.size_range.placeholder.min')}
            value={filters.sizeRange.min ? (filters.sizeRange.min / (1024 * 1024 * 1024)).toFixed(1) : ""}
            onChange={(e) => updateSizeRange("min", e.target.value)}
            className="bg-muted border-border text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">{t('filters.size_range.max')}</label>
          <Input
            type="number"
            min="0"
            step="0.5"
            placeholder={t('filters.size_range.placeholder.max')}
            value={filters.sizeRange.max ? (filters.sizeRange.max / (1024 * 1024 * 1024)).toFixed(1) : ""}
            onChange={(e) => updateSizeRange("max", e.target.value)}
            className="bg-muted border-border text-sm"
          />
        </div>
      </div>

      {/* Results Counter */}
      <div className="pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground">
          {t('filters.results.show', {
            count: totalResults,
            type: totalResults === 1 ? t('filters.results.count_singular') : t('filters.results.count_plural')
          })}
        </div>
      </div>
    </Card>
  )
}
