"use client"

import { Card } from "@/components/ui/card"
import { useTranslations } from "@/components/i18n-provider"

interface SearchStatsProps {
  total: number
  filtered: number
  query: string
}

export default function SearchStats({ total, filtered, query }: SearchStatsProps) {
  const isFiltered = filtered !== total || query.length > 0

  const t = useTranslations()

  return (
    <div className="mb-6 space-y-2">
      {isFiltered && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-sm text-foreground">
            {t('search.stats.filtered')
              .replace('{filtered}', filtered.toString())
              .replace('{total}', total.toString())}
            {query && <span className="text-muted-foreground"> {t('search.stats.for_query').replace('{query}', query)}</span>}
          </p>
        </Card>
      )}
    </div>
  )
}
