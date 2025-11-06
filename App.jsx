import { useCallback, useEffect, useRef, useState } from 'react';
import { Terms } from './components/Terms';
import { QueryBuilder } from './components/QueryBuilder';
import { Studies } from './components/Studies';
import { NiiViewer } from './components/NiiViewer';
import { useUrlQueryState } from './hooks/useUrlQueryState';
import './App.css';

// Local storage hooks
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

function useBookmarks() {
  const [bookmarks, setBookmarks] = useLocalStorage('lotusbf_bookmarks', []);

  const toggleBookmark = useCallback((studyData) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.id === studyData.id);
      if (exists) {
        return prev.filter((b) => b.id !== studyData.id);
      } else {
        return [...prev, { ...studyData, bookmarkedAt: Date.now() }];
      }
    });
  }, [setBookmarks]);

  const removeBookmark = useCallback((id) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, [setBookmarks]);

  const bookmarkedIds = bookmarks.map((b) => b.id);

  return { bookmarks, toggleBookmark, removeBookmark, bookmarkedIds };
}

function useRecentSearches() {
  const [searches, setSearches] = useLocalStorage('lotusbf_recent_searches', []);

  const addSearch = useCallback((query) => {
    if (!query || !query.trim()) return;
    setSearches((prev) => {
      const filtered = prev.filter((s) => s !== query);
      return [query, ...filtered].slice(0, 10);
    });
  }, [setSearches]);

  const removeSearch = useCallback((query) => {
    setSearches((prev) => prev.filter((s) => s !== query));
  }, [setSearches]);

  return { searches, addSearch, removeSearch };
}

export default function App() {
  const [query, setQuery] = useUrlQueryState('q');
  const { bookmarks, toggleBookmark, removeBookmark, bookmarkedIds } = useBookmarks();
  const { searches, addSearch, removeSearch } = useRecentSearches();
  
  const [showGuide, setShowGuide] = useState(() => {
    return !localStorage.getItem('lotusbf_guide_dismissed');
  });

  // Settings
  const [theme, setTheme] = useLocalStorage('lotusbf_theme', 'light');
  const [fontSize, setFontSize] = useLocalStorage('lotusbf_font_size', 'standard');
  const [fontFamily, setFontFamily] = useLocalStorage('lotusbf_font_family', 'inter');
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarkPanel, setShowBookmarkPanel] = useState(false);

  // Apply theme and settings
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-size', fontSize);
    document.documentElement.setAttribute('data-font-family', fontFamily);
  }, [theme, fontSize, fontFamily]);

  // Add search to recent when query changes
  useEffect(() => {
    if (query) {
      addSearch(query);
    }
  }, [query, addSearch]);

  const handlePickTerm = useCallback((t) => {
    setQuery((q) => (q ? `${q} ${t}` : t));
  }, [setQuery]);

  // Resizable panes state - adjusted widths per requirement
  const gridRef = useRef(null);
  const [sizes, setSizes] = useState([18, 52, 30]); // Reduced tab1, increased tab2
  const MIN_PX = 260;

  const startDrag = (which, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const rect = gridRef.current.getBoundingClientRect();
    const total = rect.width;
    const curPx = sizes.map((p) => (p / 100) * total);

    const onMouseMove = (ev) => {
      const dx = ev.clientX - startX;
      if (which === 0) {
        let newLeft = curPx[0] + dx;
        let newMid = curPx[1] - dx;
        if (newLeft < MIN_PX) {
          newMid -= MIN_PX - newLeft;
          newLeft = MIN_PX;
        }
        if (newMid < MIN_PX) {
          newLeft -= MIN_PX - newMid;
          newMid = MIN_PX;
        }
        const s0 = (newLeft / total) * 100;
        const s1 = (newMid / total) * 100;
        const s2 = 100 - s0 - s1;
        setSizes([s0, s1, Math.max(s2, 0)]);
      } else {
        let newMid = curPx[1] + dx;
        let newRight = curPx[2] - dx;
        if (newMid < MIN_PX) {
          newRight -= MIN_PX - newMid;
          newMid = MIN_PX;
        }
        if (newRight < MIN_PX) {
          newMid -= MIN_PX - newRight;
          newRight = MIN_PX;
        }
        const s1 = (newMid / total) * 100;
        const s2 = (newRight / total) * 100;
        const s0 = (curPx[0] / total) * 100;
        setSizes([s0, s1, Math.max(s2, 0)]);
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const dismissGuide = () => {
    localStorage.setItem('lotusbf_guide_dismissed', 'true');
    setShowGuide(false);
  };

  return (
    <div className="app">
      {/* User Guide Modal */}
      {showGuide && (
        <div className="guide-overlay" onClick={dismissGuide}>
          <div className="guide-modal" onClick={(e) => e.stopPropagation()}>
            <div className="guide-title">Welcome to LoTUS-BF!</div>
            <div className="guide-content">
              <p>
                <strong>LoTUS-BF</strong> (Location-or-Term Unified Search for Brain Functions) 
                helps you explore neuroscience research through meta-analysis.
              </p>

              <h3>Getting Started</h3>
              <ul>
                <li><strong>Left Panel:</strong> Browse and click terms to build your query</li>
                <li><strong>Middle Panel:</strong> Build complex queries using AND, OR, NOT operators</li>
                <li><strong>Right Panel:</strong> Visualize brain activation maps and manage bookmarks</li>
              </ul>

              <h3>Query Examples</h3>
              <ul>
                <li>Simple: <code>amygdala emotion</code></li>
                <li>With operators: <code>amygdala AND emotion NOT anxiety</code></li>
                <li>With coordinates: <code>[-22,-4,18] AND emotion</code></li>
                <li>Complex: <code>(amygdala OR hippocampus) AND emotion</code></li>
              </ul>

              <h3>Features</h3>
              <ul>
                <li>Click studies to view their PubMed page</li>
                <li>Bookmark studies for later reference</li>
                <li>Interactive brain viewer with MNI coordinates</li>
                <li>Adjustable thresholds and smoothing parameters</li>
              </ul>
            </div>
            <div className="guide-actions">
              <button className="guide-btn guide-btn-primary" onClick={dismissGuide}>
                Got it! Let's explore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bookmark Panel */}
      {showBookmarkPanel && (
        <div className="guide-overlay" onClick={() => setShowBookmarkPanel(false)}>
          <div className="guide-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="guide-title">Bookmarked Studies ({bookmarks.length})</div>
            <div className="guide-content">
              {bookmarks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '16px', marginBottom: '8px' }}>No bookmarks yet</p>
                  <p style={{ fontSize: '14px' }}>Click the star icon next to studies to bookmark them</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto' }}>
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} style={{
                      padding: '16px',
                      background: 'var(--bg-white)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
                          {bookmark.title || 'Untitled Study'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                          {bookmark.journal} • {bookmark.year} • {bookmark.authors}
                        </div>
                        {bookmark.pmid && (
                          <a
                            href={`https://pubmed.ncbi.nlm.nih.gov/${bookmark.pmid}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '12px',
                              color: 'var(--matcha-primary)',
                              textDecoration: 'none',
                              fontWeight: 500
                            }}
                          >
                            View on PubMed →
                          </a>
                        )}
                      </div>
                      <button
                        onClick={() => removeBookmark(bookmark.id)}
                        style={{
                          padding: '6px 12px',
                          background: 'transparent',
                          border: '1px solid var(--border-medium)',
                          color: 'var(--text-muted)',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          flexShrink: 0
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="guide-actions">
              <button className="guide-btn guide-btn-primary" onClick={() => setShowBookmarkPanel(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="app__header">
        <div className="app__header-left">
          <div className="app__logo-container">
            <div className="app__logo-icon">L</div>
            <h1 className="app__title">LoTUS-BF</h1>
          </div>
        </div>

        <div className="app__header-right">
          {/* Bookmark Button */}
          <button className="bookmark-btn" onClick={() => setShowBookmarkPanel(true)}>
            <span>★</span>
            <span>Bookmarks</span>
            {bookmarks.length > 0 && (
              <span className="bookmark-count">{bookmarks.length}</span>
            )}
          </button>

          {/* Help Button */}
          <button className="settings-btn" onClick={() => setShowGuide(true)}>
            <span>?</span>
            <span>Help</span>
          </button>

          {/* Settings Button */}
          <div style={{ position: 'relative' }}>
            <button className="settings-btn" onClick={() => setShowSettings(!showSettings)}>
              <span>⚙</span>
              <span>Settings</span>
            </button>

            {showSettings && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999
                  }}
                  onClick={() => setShowSettings(false)}
                />
                <div className="settings-dropdown">
                  <div className="settings-section">
                    <label className="settings-label">Theme</label>
                    <div
                      className="settings-toggle"
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    >
                      <span style={{ fontSize: '13px' }}>
                        {theme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                      </span>
                      <div className={`toggle-switch ${theme === 'dark' ? 'active' : ''}`}>
                        <div className="toggle-switch-handle" />
                      </div>
                    </div>
                  </div>

                  <div className="settings-section">
                    <label className="settings-label">Font Size</label>
                    <select
                      className="settings-select"
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                    >
                      <option value="standard">Standard</option>
                      <option value="big">Big</option>
                      <option value="biggest">Biggest</option>
                    </select>
                  </div>

                  <div className="settings-section">
                    <label className="settings-label">Font Style</label>
                    <select
                      className="settings-select"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                    >
                      <option value="inter">Inter (Modern)</option>
                      <option value="system">System (Default)</option>
                      <option value="serif">Serif (Classic)</option>
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app__grid" ref={gridRef}>
        {/* Left Panel: Terms */}
        <section className="card" style={{ flexBasis: `${sizes[0]}%` }}>
          <div className="card__title">Terms</div>
          <Terms
            onPickTerm={handlePickTerm}
            recentSearches={searches}
            onRemoveSearch={removeSearch}
            hasQuery={!!query}
          />
        </section>

        <div
          className="resizer"
          aria-label="Resize left/middle"
          onMouseDown={(e) => startDrag(0, e)}
        />

        {/* Middle Panel: Query Builder + Studies */}
        <section className="card card--stack" style={{ flexBasis: `${sizes[1]}%` }}>
          <QueryBuilder query={query} setQuery={setQuery} />
          
          <div className="divider" />
          
          <div>
            <div className="card__title">Related Studies</div>
            <Studies
              query={query}
              onBookmarkToggle={(studyData) => toggleBookmark(studyData)}
              bookmarkedIds={bookmarkedIds}
            />
          </div>
        </section>

        <div
          className="resizer"
          aria-label="Resize middle/right"
          onMouseDown={(e) => startDrag(1, e)}
        />

        {/* Right Panel: Brain Viewer */}
        <section className="card" style={{ flexBasis: `${sizes[2]}%` }}>
          <NiiViewer
            query={query}
            bookmarks={bookmarks}
            onRemoveBookmark={removeBookmark}
          />
        </section>
      </main>

      <footer className="app__footer">
        <span>© 2025 LoTUS-BF</span>
        <span>·</span>
        <a href="#" onClick={(e) => { e.preventDefault(); setShowGuide(true); }}>
          User Guide
        </a>
        <span>·</span>
        <span>Powered by Neurosynth</span>
      </footer>

      <style>{`
        .guide-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .guide-modal {
          background: var(--bg-card);
          border-radius: 16px;
          padding: 32px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .guide-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--matcha-primary-dark);
          margin-bottom: 16px;
        }

        .guide-content {
          font-size: 14px;
          line-height: 1.8;
          color: var(--text-primary);
          margin-bottom: 24px;
        }

        .guide-content h3 {
          color: var(--matcha-primary-dark);
          font-size: 16px;
          font-weight: 600;
          margin: 20px 0 10px 0;
        }

        .guide-content ul {
          margin: 10px 0;
          padding-left: 20px;
        }

        .guide-content li {
          margin: 8px 0;
        }

        .guide-content code {
          background: var(--bg-cream);
          padding: 2px 8px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 12px;
          border: 1px solid var(--border-light);
        }

        .guide-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .guide-btn {
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .guide-btn-primary {
          background: var(--matcha-primary);
          color: white;
        }

        .guide-btn-primary:hover {
          background: var(--matcha-primary-dark);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}