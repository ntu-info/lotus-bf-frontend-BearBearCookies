import { useState } from 'react';

export function QueryBuilder({ query, setQuery }) {
  const [showHelp, setShowHelp] = useState(false);

  const append = (token) => {
    setQuery((q) => {
      const trimmed = q.trim();
      // Smart spacing
      if (trimmed && !trimmed.endsWith(' ') && !trimmed.endsWith('(')) {
        return `${trimmed} ${token}`;
      }
      return trimmed ? `${trimmed}${token}` : token;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    }
  };

  const clearQuery = () => {
    setQuery('');
  };

  // Text-only operators (no symbols)
  const operators = [
    { label: 'AND', tooltip: 'Both terms must appear' },
    { label: 'OR', tooltip: 'Either term can appear' },
    { label: 'NOT', tooltip: 'Exclude this term' },
    { label: '(', tooltip: 'Start grouping' },
    { label: ')', tooltip: 'End grouping' },
  ];

  return (
    <div className="query-builder">
      <style>{`
        .query-builder {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .qb__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .qb__help-btn {
          background: transparent;
          border: 1px solid var(--border-medium);
          color: var(--text-secondary);
          padding: 6px 12px;
          font-size: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .qb__help-btn:hover {
          background: var(--matcha-primary-light);
          color: white;
          border-color: var(--matcha-primary-light);
        }

        .qb__input-wrapper {
          position: relative;
        }

        .qb__input {
          width: 100%;
          min-height: 80px;
          padding: 14px;
          border: 2px solid var(--border-medium);
          border-radius: 12px;
          font-size: 14px;
          font-family: var(--font-primary);
          line-height: 1.6;
          resize: vertical;
          transition: all 0.2s ease;
          background: var(--bg-white);
          color: var(--text-primary);
        }

        .qb__input:focus {
          outline: none;
          border-color: var(--matcha-primary);
          box-shadow: 0 0 0 3px rgba(124, 157, 124, 0.15);
        }

        .qb__input::placeholder {
          color: var(--text-muted);
        }

        .qb__char-count {
          position: absolute;
          bottom: 8px;
          right: 12px;
          font-size: 11px;
          color: var(--text-muted);
          background: var(--bg-card);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .qb__toolbar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .qb__operator {
          background: var(--matcha-primary);
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          font-family: var(--font-primary);
          letter-spacing: 0.3px;
        }

        .qb__operator:hover {
          background: var(--matcha-primary-dark);
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(124, 157, 124, 0.25);
        }

        .qb__operator:active {
          transform: translateY(0);
        }

        .qb__divider {
          width: 1px;
          height: 24px;
          background: var(--border-medium);
          margin: 0 4px;
        }

        .qb__clear {
          background: var(--accent-warm);
          color: white;
          margin-left: auto;
        }

        .qb__clear:hover {
          background: #c69563;
        }

        .qb__help {
          padding: 12px;
          background: var(--bg-cream);
          border: 1px solid var(--border-light);
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .qb__help strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        .qb__help-examples {
          margin-top: 8px;
          padding-left: 16px;
        }

        .qb__help-examples li {
          margin: 4px 0;
        }

        .qb__help-example {
          font-family: var(--font-mono);
          background: var(--bg-white);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          border: 1px solid var(--border-light);
        }

        @media (max-width: 768px) {
          .qb__toolbar {
            gap: 6px;
          }

          .qb__operator {
            padding: 6px 10px;
            font-size: 12px;
          }

          .qb__input {
            min-height: 60px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="qb__header">
        <div className="card__title" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
          Query Builder
        </div>
        <button 
          className="qb__help-btn"
          onClick={() => setShowHelp(!showHelp)}
          title="Show help"
        >
          {showHelp ? '✕ Close Help' : '? Help'}
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="qb__help">
          <strong>How to build queries:</strong>
          <ul className="qb__help-examples">
            <li>
              <strong>Simple:</strong>{' '}
              <code className="qb__help-example">amygdala emotion</code>
            </li>
            <li>
              <strong>With operators:</strong>{' '}
              <code className="qb__help-example">amygdala AND emotion</code>
            </li>
            <li>
              <strong>Exclude terms:</strong>{' '}
              <code className="qb__help-example">emotion NOT anxiety</code>
            </li>
            <li>
              <strong>With coordinates:</strong>{' '}
              <code className="qb__help-example">[-22,-4,18] AND emotion</code>
            </li>
            <li>
              <strong>Complex:</strong>{' '}
              <code className="qb__help-example">(amygdala OR hippocampus) AND emotion NOT anxiety</code>
            </li>
          </ul>
        </div>
      )}

      {/* Input Area */}
      <div className="qb__input-wrapper">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your query here... e.g., 'amygdala AND emotion' or '[-22,-4,18] NOT anxiety'

Use AND, OR, NOT operators and parentheses for complex queries.
You can also include MNI coordinates like [-22,-4,18]."
          className="qb__input"
          spellCheck="false"
        />
        <div className="qb__char-count">
          {query.length} chars
        </div>
      </div>

      {/* Operator Toolbar */}
      <div className="qb__toolbar">
        {operators.map((op) => (
          <button
            key={op.label}
            onClick={() => append(op.label)}
            className="qb__operator"
            title={op.tooltip}
          >
            {op.label}
          </button>
        ))}
        
        <div className="qb__divider" />
        
        <button
          onClick={clearQuery}
          className="qb__operator qb__clear"
          title="Clear query"
        >
          Clear
        </button>
      </div>
    </div>
  );
}