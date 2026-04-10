import { useState } from 'react'
import type { FeatureFlag, Environment, FlagType } from '@shared/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

type SortDirection = 'asc' | 'desc'
type SortColumn = 'name' | 'enabled' | 'environment' | 'type' | 'rolloutPercentage' | 'owner'

interface FlagsTableProps {
  flags: FeatureFlag[]
  onEdit: (flag: FeatureFlag) => void
  onDelete: (flag: FeatureFlag) => void
}

const environmentColors: Record<Environment, string> = {
  development: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  staging: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  production: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
}

const typeColors: Record<FlagType, string> = {
  release: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  experiment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  operational: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  permission: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
}

function SortIcon({ column, sortColumn, sortDirection }: { column: SortColumn; sortColumn: SortColumn | null; sortDirection: SortDirection }) {
  if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
  if (sortDirection === 'asc') return <ArrowUp className="h-3 w-3" />
  return <ArrowDown className="h-3 w-3" />
}

export function FlagsTable({ flags, onEdit, onDelete }: FlagsTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortedFlags = sortColumn === null ? flags : [...flags].sort((a, b) => {
    const aVal = a[sortColumn]
    const bVal = b[sortColumn]
    const cmp =
      typeof aVal === 'boolean'
        ? Number(aVal) - Number(bVal)
        : String(aVal).localeCompare(String(bVal))
    return sortDirection === 'asc' ? cmp : -cmp
  })

  if (flags.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No feature flags found. Create your first flag to get started.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
              <span className="flex items-center gap-1">Name <SortIcon column="name" sortColumn={sortColumn} sortDirection={sortDirection} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('enabled')}>
              <span className="flex items-center gap-1">Status <SortIcon column="enabled" sortColumn={sortColumn} sortDirection={sortDirection} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('environment')}>
              <span className="flex items-center gap-1">Environment <SortIcon column="environment" sortColumn={sortColumn} sortDirection={sortDirection} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('type')}>
              <span className="flex items-center gap-1">Type <SortIcon column="type" sortColumn={sortColumn} sortDirection={sortDirection} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('rolloutPercentage')}>
              <span className="flex items-center gap-1">Rollout <SortIcon column="rolloutPercentage" sortColumn={sortColumn} sortDirection={sortDirection} /></span>
            </TableHead>
            <TableHead className="cursor-pointer select-none" onClick={() => handleSort('owner')}>
              <span className="flex items-center gap-1">Owner <SortIcon column="owner" sortColumn={sortColumn} sortDirection={sortDirection} /></span>
            </TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedFlags.map((flag) => (
            <TableRow key={flag.id}>
              <TableCell className="font-medium">{flag.name}</TableCell>
              <TableCell>
                <Badge variant={flag.enabled ? 'default' : 'secondary'}>
                  {flag.enabled ? 'ON' : 'OFF'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={environmentColors[flag.environment]} variant="outline">
                  {flag.environment}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={typeColors[flag.type]} variant="outline">
                  {flag.type}
                </Badge>
              </TableCell>
              <TableCell>{flag.rolloutPercentage}%</TableCell>
              <TableCell>{flag.owner}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {flag.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {flag.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{flag.tags.length - 3}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(flag)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(flag)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
