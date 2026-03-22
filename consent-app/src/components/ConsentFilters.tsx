import { Input } from "@proxy-smart/shared-ui"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@proxy-smart/shared-ui"
import { Search } from "lucide-react"
import type { ConsentStatusFilter, ConsentSortKey } from "@/hooks/useConsents"

interface ConsentFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: ConsentStatusFilter
  onStatusChange: (value: ConsentStatusFilter) => void
  sortKey: ConsentSortKey
  onSortChange: (value: ConsentSortKey) => void
  resultCount: number
}

export function ConsentFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  sortKey,
  onSortChange,
  resultCount,
}: ConsentFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by practitioner or resource type..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as ConsentStatusFilter)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Revoked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(v) => onSortChange(v as ConsentSortKey)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">Newest First</SelectItem>
            <SelectItem value="date-asc">Oldest First</SelectItem>
            <SelectItem value="status">By Status</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <span className="text-xs text-muted-foreground self-center whitespace-nowrap">
        {resultCount} result{resultCount !== 1 ? "s" : ""}
      </span>
    </div>
  )
}
