import type { FlagFilters, Environment, FlagType } from '@shared/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FlagsFilterBarProps {
  filters: FlagFilters
  onChange: (filters: FlagFilters) => void
  onClear: () => void
}

const environments: Environment[] = ['development', 'staging', 'production']
const flagTypes: FlagType[] = ['release', 'experiment', 'operational', 'permission']

function hasActiveFilters(filters: FlagFilters): boolean {
  return (
    filters.environment !== undefined ||
    filters.type !== undefined ||
    filters.enabled !== undefined ||
    filters.owner !== undefined ||
    (filters.search !== undefined && filters.search !== '')
  )
}

export function FlagsFilterBar({ filters, onChange, onClear }: FlagsFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-2 items-center mb-4">
      <Input
        placeholder="Search by name..."
        value={filters.search ?? ''}
        onChange={(e) => onChange({ ...filters, search: e.target.value || undefined })}
        className="w-48"
      />

      <Select
        value={filters.environment ?? 'all'}
        onValueChange={(value) =>
          onChange({ ...filters, environment: value === 'all' ? undefined : (value as Environment) })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Environment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All environments</SelectItem>
          {environments.map((env) => (
            <SelectItem key={env} value={env}>
              {env}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.type ?? 'all'}
        onValueChange={(value) =>
          onChange({ ...filters, type: value === 'all' ? undefined : (value as FlagType) })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {flagTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.enabled === undefined ? 'all' : String(filters.enabled)}
        onValueChange={(value) =>
          onChange({ ...filters, enabled: value === 'all' ? undefined : value === 'true' })
        }
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="true">Enabled</SelectItem>
          <SelectItem value="false">Disabled</SelectItem>
        </SelectContent>
      </Select>

      {hasActiveFilters(filters) && (
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  )
}
