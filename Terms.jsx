import { API_BASE } from '../api';
import { useEffect, useMemo, useState } from 'react';

export function Terms({ onPickTerm, recentSearches = [], onRemoveSearch, hasQuery }) {
  const [terms, setTerms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();
    
    const load = async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await fetch(`${API_BASE}/terms`, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setTerms(Array.isArray(data?.terms) ? data.terms : []);
      } catch (e) {
        if (!alive) return;
        setErr(`Failed to fetch terms: ${e?.message || e}`);
      } finally {
        if (alive) setLoading(false);
      }
    };
    
    load();
    return () => {
      alive = false;
      ac.abort();
    };
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return terms;
    return terms.filter((t) => t.toLowerCase().includes(s));
  }, [terms, search]);

  // Show recent searches if no query and no search term
  const showRecent = !hasQuery && !search && recentSearches.length > 0;

  return (
    <div className="terms">
      <style>{`
        .terms {
          display: flex;
          flex-direction: column;
          gap: 14px;
          height: 100%;
        }

        .terms__controls {
          display: flex;
          gap: 8px;
          padding: 0 2px;
        }

        .terms__search {
          flex: 1;
          padding: 10px 14px;
          border: 1.5px solid var(--border-medium);
          border-radius: 10px;
          font-size: var(--font-size-input);
          transition: all 0.2s ease;
          background: var(--bg-white);
          color: var(--text-primary);
        }

        .terms__search:focus {
          outline: none;
          border-color: var(--matcha-primary);
          box-shadow: 0 0 0 3px rgba(124, 157, 124, 0.1);
        }

        .terms__search::placeholder {
          color: var(--text-muted);
        }

        .terms__clear {
          padding: 10px 16px;
          background: var(--accent-warm);
          color: white;
          border: none;
          border-radius: 10px;
          font-size: var(--font-size-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .terms__clear:hover {
          background: #c69563;
          transform: translateY(-1px);
        }

        .terms__clear:active {
          transform: translateY(0);
        }

        .terms__info {
          padding: 8px 12px;
          background: rgba(124, 157, 124, 0.1);
          border-radius: 8px;
          font-size: 12px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .terms__count {
          font-weight: 600;
          color: var(--matcha-primary-dark);
        }

        .terms__skeleton {
          display: grid;
          gap: 8px;
        }

        .terms__skeleton-row {
          height: 36px;
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

        .terms__list {
          flex: 1;
          overflow-y: auto;
          padding: 4px;
        }

        .terms__section-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
          padding: 8px 4px 4px 4px;
        }

        .terms__ul {
          list-style: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 6px;
        }

        .terms__li {
          position: relative;
        }

        .terms__name {
          display: block;
          padding: 10px 14px;
          background: var(--bg-white);
          border: 1.5px solid var(--border-light);
          border-radius: 8px;
          color: var(--text-primary);
          text-decoration: none;
          font-size: 13px;
          transition: all 0.2s ease;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .terms__name:hover {
          background: var(--matcha-primary);
          color: white;
          border-color: var(--matcha-primary);
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(124, 157, 124, 0.3);
        }

        .terms__name:active {
          transform: translateX(2px);
        }

        .terms__recent-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          background: var(--bg-white);
          border: 1.5px solid var(--border-light);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .terms__recent-item:hover {
          border-color: var(--matcha-primary);
        }

        .terms__recent-text {
          flex: 1;
          font-size: 13px;
          color: var(--text-primary);
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .terms__recent-text:hover {
          color: var(--matcha-primary);
        }

        .terms__recent-remove {
          padding: 4px 8px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .terms__recent-remove:hover {
          color: var(--error);
          transform: scale(1.2);
        }

        .terms__empty {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
        }

        .terms__empty-icon {
          font-size: 36px;
          margin-bottom: 8px;
          opacity: 0.5;
        }

        /* Scrollbar styling */
        .terms__list::-webkit-scrollbar {
          width: 8px;
        }

        .terms__list::-webkit-scrollbar-track {
          background: transparent;
        }

        .terms__list::-webkit-scrollbar-thumb {
          background: var(--border-medium);
          border-radius: 4px;
        }

        .terms__list::-webkit-scrollbar-thumb:hover {
          background: var(--matcha-primary-light);
        }

        @media (max-width: 768px) {
          .terms__controls {
            flex-direction: column;
          }

          .terms__clear {
            width: 100%;
          }
        }
      `}</style>

      <div className="terms__controls">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search terms..."
          className="terms__search"
          autoComplete="off"
        />
        <button onClick={() => setSearch('')} className="terms__clear">
          Clear
        </button>
      </div>

      {!loading && !err && filtered.length > 0 && !showRecent && (
        <div className="terms__info">
          <span>
            Showing <span className="terms__count">{filtered.length}</span> term
            {filtered.length !== 1 ? 's' : ''}
            {search && ` matching "${search}"`}
          </span>
        </div>
      )}

      {loading && (
        <div className="terms__skeleton">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="terms__skeleton-row" />
          ))}
        </div>
      )}

      {err && <div className="alert alert--error">{err}</div>}

      {!loading && !err && (
        <div className="terms__list">
          {showRecent ? (
            <>
              <div className="terms__section-title">Recent Searches</div>
              <ul className="terms__ul">
                {recentSearches.map((search, idx) => (
                  <li key={idx} className="terms__li">
                    <div className="terms__recent-item">
                      <span
                        className="terms__recent-text"
                        onClick={() => onPickTerm?.(search)}
                        title={`Use search: ${search}`}
                      >
                        {search}
                      </span>
                      {onRemoveSearch && (
                        <button
                          className="terms__recent-remove"
                          onClick={() => onRemoveSearch(search)}
                          title="Remove from recent"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : filtered.length === 0 ? (
            <div className="terms__empty">
              <div className="terms__empty-icon">🔍</div>
              <p>
                {search ? `No terms matching "${search}"` : 'No terms found'}
              </p>
            </div>
          ) : (
            <ul className="terms__ul">
              {filtered.slice(0, 500).map((t, idx) => (
                <li key={`${t}-${idx}`} className="terms__li">
                  <a
                    href="#"
                    className="terms__name"
                    title={`Add "${t}" to query`}
                    aria-label={`Add term ${t}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onPickTerm?.(t);
                    }}
                  >
                    {t}
                  </a>
                </li>
              ))}
              {filtered.length > 500 && (
                <li className="terms__empty" style={{ padding: '20px 10px' }}>
                  <p style={{ fontSize: '12px' }}>
                    Showing first 500 terms. Use search to narrow results.
                  </p>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}