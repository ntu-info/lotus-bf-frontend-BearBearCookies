import { API_BASE } from '../api';
import { useEffect, useMemo, useState } from 'react';

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

export function Studies({ query, onBookmarkToggle, bookmarkedIds = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [sortKey, setSortKey] = useState('year');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (!query) return;
    let alive = true;
    const ac = new AbortController();

    (async () => {
      setLoading(true);
      setErr('');
      try {
        const url = `${API_BASE}/query/${encodeURIComponent(query)}/studies`;
        const res = await fetch(url, { signal: ac.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        if (!alive) return;
        const list = Array.isArray(data?.results) ? data.results : [];
        setRows(list);
      } catch (e) {
        if (!alive) return;
        setErr(`Unable to fetch studies: ${e?.message || e}`);
        setRows([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [query]);

  // (Removed topic/year/source extraction per user request)

  // No topic/year/source filters - show all fetched rows
  const filtered = useMemo(() => rows, [rows]);

  const changeSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const A = a?.[sortKey];
      const B = b?.[sortKey];
      if (sortKey === 'year') return (Number(A || 0) - Number(B || 0)) * dir;
      return String(A || '').localeCompare(String(B || ''), 'en') * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Helper to construct PubMed URL
  const getPubMedUrl = (pmid) => {
    if (!pmid) return null;
    return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  };

  return (
    <div className="studies">
      <style>{`
        .studies {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .studies__filters {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          padding: 12px;
          background: var(--bg-cream);
          border-radius: 10px;
          border: 1px solid var(--border-light);
        }

        .studies__filter {
          flex: 1;
          min-width: 140px;
        }

        .studies__filter-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .studies__filter-select {
          width: 100%;
          padding: 6px 10px;
          border: 1.5px solid var(--border-medium);
          border-radius: 8px;
          background: var(--bg-white);
          color: var(--text-primary);
          font-size: 13px;
          cursor: pointer;
        }

        .studies__empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 14px;
        }

        .studies__empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.3;
        }

        .studies__loading {
          display: grid;
          gap: 10px;
          padding: 12px 0;
        }

        .studies__skeleton {
          height: 80px;
          background: linear-gradient(
            90deg,
            var(--bg-cream) 0%,
            var(--border-light) 50%,
            var(--bg-cream) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .studies__table-wrapper {
          overflow-x: auto;
          border-radius: 10px;
          border: 1px solid var(--border-light);
          background: var(--bg-white);
        }

        .studies__table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: var(--font-size-table);
        }

        .studies__thead {
          position: sticky;
          top: 0;
          z-index: 10;
          background: var(--bg-cream);
        }

        .studies__th {
          padding: 10px 12px;
          text-align: left;
          font-weight: 600;
          color: var(--text-primary);
          border-bottom: 2px solid var(--border-medium);
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
          transition: background 0.2s ease;
        }

        .studies__th:hover {
          background: rgba(124, 157, 124, 0.08);
        }

        .studies__th-content {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .studies__sort-icon {
          font-size: 10px;
          color: var(--matcha-primary);
        }

        .studies__td {
          padding: 12px;
          border-bottom: 1px solid var(--border-light);
          vertical-align: top;
        }

        .studies__row {
          transition: background 0.15s ease;
        }

        .studies__row:hover {
          background: rgba(124, 157, 124, 0.05);
        }

        .studies__row:last-child .studies__td {
          border-bottom: none;
        }

        .studies__title {
          max-width: 400px;
          line-height: 1.5;
          color: var(--text-primary);
        }

        .studies__year {
          white-space: nowrap;
          font-weight: 600;
          color: var(--matcha-primary-dark);
        }

        .studies__actions {
          display: flex;
          gap: 8px;
          align-items: center;
          white-space: nowrap;
        }

        .studies__link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: var(--matcha-primary);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .studies__link:hover {
          background: var(--matcha-primary-dark);
          transform: translateY(-1px);
        }

        .studies__bookmark {
          padding: 6px 10px;
          background: var(--btn-bg);
          border: 1.5px solid var(--btn-border);
          color: var(--text-muted);
          font-size: 16px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .studies__bookmark:hover {
          border-color: var(--matcha-primary);
          color: var(--matcha-primary);
          transform: scale(1.1);
        }

        .studies__bookmark--active {
          background: var(--matcha-primary);
          border-color: var(--matcha-primary);
          color: white;
        }

        .studies__footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          border-top: 1px solid var(--border-light);
          font-size: 13px;
          background: var(--bg-cream);
          border-radius: 0 0 10px 10px;
        }

        .studies__pagination {
          display: flex;
          gap: 6px;
        }

        .studies__page-btn {
          padding: 6px 12px;
          background: var(--btn-bg);
          border: 1.5px solid var(--btn-border);
          color: var(--btn-text);
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .studies__page-btn:hover:not(:disabled) {
          background: var(--matcha-primary);
          color: white;
          border-color: var(--matcha-primary);
        }

        .studies__page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .studies__td {
            padding: 10px 8px;
            font-size: 12px;
          }

          .studies__title {
            max-width: 250px;
          }
        }
      `}</style>

      {!query && (
        <div className="studies__empty">
          <div className="studies__empty-icon">🔍</div>
          <p>Enter a query above to search for studies</p>
        </div>
      )}

      {/* topic/year/source filters removed per user request */}

      {query && loading && (
        <div className="studies__loading">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="studies__skeleton" />
          ))}
        </div>
      )}

      {query && err && (
        <div className="alert alert--error">
          {err}
        </div>
      )}

      {query && !loading && !err && (
        <>
          <div className="studies__table-wrapper">
            <table className="studies__table">
              <thead className="studies__thead">
                <tr>
                  {[
                    { key: 'year', label: 'Year' },
                    { key: 'title', label: 'Title' },
                    { key: 'journal', label: 'Journal' },
                    { key: 'authors', label: 'Authors' },
                  ].map(({ key, label }) => (
                    <th
                      key={key}
                      className="studies__th"
                      onClick={() => changeSort(key)}
                    >
                      <span className="studies__th-content">
                        {label}
                        {sortKey === key && (
                          <span className="studies__sort-icon">
                            {sortDir === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                  <th className="studies__th">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="studies__td" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      No studies found with current filters
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r, i) => {
                    const studyId = r.id || r.study_id || r.pmid || i;
                    const pmid = r.pmid || r.pubmed_id || r.id;
                    const pubmedUrl = getPubMedUrl(pmid);
                    const isBookmarked = bookmarkedIds.includes(studyId);

                    return (
                      <tr key={i} className="studies__row">
                        <td className="studies__td">
                          <span className="studies__year">{r.year ?? '—'}</span>
                        </td>
                        <td className="studies__td">
                          <div className="studies__title">
                            {r.title || 'Untitled'}
                          </div>
                        </td>
                        <td className="studies__td">{r.journal || '—'}</td>
                        <td className="studies__td">{r.authors || '—'}</td>
                        <td className="studies__td">
                          <div className="studies__actions">
                            {pubmedUrl && (
                              <a
                                href={pubmedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="studies__link"
                                title="View on PubMed"
                              >
                                PubMed
                              </a>
                            )}
                            {onBookmarkToggle && (
                              <button
                                onClick={() => onBookmarkToggle({
                                  id: studyId,
                                  title: r.title,
                                  journal: r.journal,
                                  year: r.year,
                                  authors: r.authors,
                                  pmid: pmid,
                                  topic: r.topic,
                                  source: r.source
                                })}
                                className={classNames(
                                  'studies__bookmark',
                                  isBookmarked && 'studies__bookmark--active'
                                )}
                                title={isBookmarked ? 'Remove bookmark' : 'Bookmark study'}
                              >
                                {isBookmarked ? '★' : '☆'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="studies__footer">
            <div>
              Showing <strong>{sorted.length}</strong> studies · Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </div>
            <div className="studies__pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage(1)}
                className="studies__page-btn"
                title="First page"
              >
                First
              </button>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="studies__page-btn"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="studies__page-btn"
              >
                Next
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                className="studies__page-btn"
                title="Last page"
              >
                Last
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}