import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Badge } from './Badge';

export interface DataTableProps {
  data: Record<string, any>[];
  addedColumns?: string[];
  maxHeight?: string;
  onRowSelect?: (row: Record<string, any>) => void;
  selectedRowId?: string | number | null;
}

type SortDirection = 'asc' | 'desc' | null;

export const DataTable: React.FC<DataTableProps> = ({
  data,
  addedColumns = [],
  maxHeight = '500px',
  onRowSelect,
  selectedRowId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('ALL');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Derive columns from data
  const columns = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]).filter(
      (k) => !k.startsWith('_')
    );
    // Put added/enriched columns on the right
    const baseKeys = keys.filter((k) => !addedColumns.includes(k) && k !== 'match_confidence');
    const enrichedKeys = keys.filter((k) => addedColumns.includes(k) || k === 'match_confidence');
    return [...baseKeys, ...enrichedKeys];
  }, [data, addedColumns]);

  // Filter counts
  const counts = useMemo(() => {
    let exact = 0;
    let fallback = 0;
    let borderline = 0;
    let unmatched = 0;
    for (const r of data) {
      const conf = r.match_confidence || (r._matched ? 'HIGH_EXACT' : 'UNMATCHED');
      if (conf === 'HIGH_EXACT') exact++;
      else if (conf === 'CENTROID_FALLBACK') fallback++;
      else if (conf === 'BORDERLINE_REVIEW' || conf === 'AMBIGUOUS_OVERLAP') borderline++;
      else unmatched++;
    }
    return { total: data.length, exact, fallback, borderline, unmatched };
  }, [data]);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = data;

    // Filter by confidence category
    if (confidenceFilter !== 'ALL') {
      result = result.filter((row) => {
        const conf = row.match_confidence || (row._matched ? 'HIGH_EXACT' : 'UNMATCHED');
        return conf === confidenceFilter;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          val !== null && val !== undefined && String(val).toLowerCase().includes(q)
        )
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result = [...result].sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];

        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        return sortDirection === 'asc'
          ? strA.localeCompare(strB)
          : strB.localeCompare(strA);
      });
    }

    return result;
  }, [data, confidenceFilter, searchQuery, sortColumn, sortDirection]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedData = useMemo(
    () => filteredData.slice(startIndex, startIndex + pageSize),
    [filteredData, startIndex, pageSize]
  );

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  const renderConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'HIGH_EXACT':
        return <Badge variant="success" size="sm" dot>Exact Match</Badge>;
      case 'CENTROID_FALLBACK':
        return <Badge variant="neutral" size="sm" dot>Postal Centroid</Badge>;
      case 'AMBIGUOUS_OVERLAP':
        return <Badge variant="warning" size="sm" dot>Overlap</Badge>;
      case 'BORDERLINE_REVIEW':
        return <Badge variant="warning" size="sm" dot>Review</Badge>;
      case 'UNMATCHED':
      default:
        return <Badge variant="danger" size="sm" dot>Unassigned</Badge>;
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50/50">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search all records..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
          />
        </div>

        {/* Right: Category filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs select-none">
          <button
            type="button"
            onClick={() => {
              setConfidenceFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
              confidenceFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            All ({counts.total})
          </button>
          <button
            type="button"
            onClick={() => {
              setConfidenceFilter('HIGH_EXACT');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
              confidenceFilter === 'HIGH_EXACT'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-emerald-800 border border-slate-200'
            }`}
          >
            Exact ({counts.exact})
          </button>
          {counts.fallback > 0 && (
            <button
              type="button"
              onClick={() => {
                setConfidenceFilter('CENTROID_FALLBACK');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                confidenceFilter === 'CENTROID_FALLBACK'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              Postal ({counts.fallback})
            </button>
          )}
          {counts.unmatched > 0 && (
            <button
              type="button"
              onClick={() => {
                setConfidenceFilter('UNMATCHED');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                confidenceFilter === 'UNMATCHED'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
              }`}
            >
              Unmatched ({counts.unmatched})
            </button>
          )}
        </div>
      </div>

      {/* Table Viewport */}
      <div
        className="overflow-x-auto overflow-y-auto border-b border-slate-100"
        style={{ maxHeight }}
      >
        <table className="w-full text-left border-collapse border-spacing-0 text-xs">
          <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
            <tr>
              <th className="py-3 px-3.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-12 text-center border-r border-slate-100">
                #
              </th>
              {columns.map((col) => {
                const isEnriched = addedColumns.includes(col) || col === 'match_confidence';
                const isSorted = sortColumn === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className={`py-3 px-3.5 font-semibold text-xs cursor-pointer select-none transition-colors border-r border-slate-100 ${
                      isEnriched
                        ? 'bg-slate-100/90 text-slate-900 border-l border-slate-200/80 font-mono'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>{col}</span>
                      <span className="text-slate-400">
                        {isSorted ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-slate-900" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-slate-900" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                        )}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="py-12 text-center text-slate-400 text-xs"
                >
                  <Filter className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                  <span>No records match the current filter or search criteria.</span>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => {
                const globalIndex = startIndex + idx + 1;
                const isSelected = selectedRowId !== undefined && selectedRowId === (row.id || globalIndex);
                return (
                  <tr
                    key={idx}
                    onClick={() => onRowSelect && onRowSelect(row)}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70'
                        : 'hover:bg-slate-50/80'
                    } ${onRowSelect ? 'cursor-pointer' : ''}`}
                  >
                    <td className="py-3 px-3.5 font-mono text-xs text-slate-400 text-center border-r border-slate-100 tabular-nums">
                      {globalIndex}
                    </td>
                    {columns.map((col) => {
                      const val = row[col];
                      const isEnriched = addedColumns.includes(col) || col === 'match_confidence';

                      if (col === 'match_confidence') {
                        return (
                          <td
                            key={col}
                            className="py-3 px-3.5 border-r border-slate-100"
                          >
                            {renderConfidenceBadge(String(val))}
                          </td>
                        );
                      }

                      // Format numerical coordinates or distances
                      const isNumeric = typeof val === 'number';
                      const isCoord = col.toLowerCase().includes('lat') || col.toLowerCase().includes('lng') || col.toLowerCase().includes('lon');

                      return (
                        <td
                          key={col}
                          className={`py-3 px-3.5 border-r border-slate-100 truncate max-w-[220px] ${
                            isEnriched ? 'bg-slate-50/50 font-semibold text-slate-900' : 'text-slate-700'
                          } ${isNumeric || isCoord ? 'tabular-nums font-mono text-xs' : 'text-xs'}`}
                          title={String(val ?? '')}
                        >
                          {val === null || val === undefined
                            ? '-'
                            : isCoord && isNumeric
                            ? (val as number).toFixed(4)
                            : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Bar */}
      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs font-mono text-slate-800"
          >
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-slate-300">|</span>
          <span className="tabular-nums font-mono">
            Showing {filteredData.length === 0 ? 0 : startIndex + 1} -{' '}
            {Math.min(startIndex + pageSize, filteredData.length)} of{' '}
            {filteredData.length.toLocaleString()} records
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            disabled={validPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-mono text-xs tabular-nums text-slate-700">
            Page {validPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={validPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
