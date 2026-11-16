import { useState } from 'react'
import type { EspnOwnership } from '../../api/types'
import { nextEspnSort, sortByEspn, type EspnSort, type EspnSortKey } from './espnMarket'

/** Number of table columns the ESPN block adds, for skeleton rows. */
export const ESPN_COLUMN_COUNT = 4

export function useEspnSort<T>(rows: T[] | undefined, getEspn: (row: T) => EspnOwnership | null | undefined) {
  const [sort, setSort] = useState<EspnSort | null>(null)
  const sorted = rows ? sortByEspn(rows, getEspn, sort) : rows
  return { sorted, sort, toggle: (key: EspnSortKey) => setSort((current) => nextEspnSort(current, key)) }
}
