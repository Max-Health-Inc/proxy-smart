import { useState, useRef, useCallback, useMemo } from 'react';
import { Badge } from '@proxy-smart/shared-ui';
import { X, Plus } from 'lucide-react';
import { FHIR_RESOURCES, SCOPE_CONTEXTS } from './constants';

// ─── SMART v2 scope validation ─────────────────────────────────────────────

const LAUNCH_SCOPES = ['launch', 'launch/patient', 'launch/encounter'] as const;
const OPENID_SCOPES = ['openid', 'profile', 'fhirUser', 'offline_access'] as const;
const PERMISSION_CHARS = new Set(['c', 'r', 'u', 'd', 's']);

function isValidSmartScope(scope: string): boolean {
  if ((LAUNCH_SCOPES as readonly string[]).includes(scope)) return true;
  if ((OPENID_SCOPES as readonly string[]).includes(scope)) return true;
  // Wildcard scopes: patient/*.rs, user/*.cruds, system/*.*
  const wildcardMatch = scope.match(/^(patient|user|system|agent)\/\*\.([cruds*]+)$/);
  if (wildcardMatch) return true;
  // Resource-specific: patient/Observation.rs, user/Patient.cruds
  const resourceMatch = scope.match(/^(patient|user|system|agent)\/([A-Z][a-zA-Z]+)\.([cruds]+)$/);
  if (resourceMatch) {
    const permissions = resourceMatch[3];
    return [...permissions].every(ch => PERMISSION_CHARS.has(ch));
  }
  // v1 compat: patient/Observation.read, patient/Observation.write, patient/Observation.*
  const v1Match = scope.match(/^(patient|user|system)\/([A-Z][a-zA-Z]+)\.(read|write|\*)$/);
  if (v1Match) return true;
  return false;
}

function getScopeCategory(scope: string): 'launch' | 'openid' | 'resource' | 'unknown' {
  if ((LAUNCH_SCOPES as readonly string[]).includes(scope)) return 'launch';
  if ((OPENID_SCOPES as readonly string[]).includes(scope)) return 'openid';
  if (scope.match(/^(patient|user|system|agent)\//)) return 'resource';
  return 'unknown';
}

// ─── Autocomplete suggestions ──────────────────────────────────────────────

function generateSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  const lower = input.toLowerCase();

  // Static scopes
  for (const scope of [...LAUNCH_SCOPES, ...OPENID_SCOPES]) {
    if (scope.toLowerCase().includes(lower)) suggestions.push(scope);
  }

  // Resource scopes based on input
  for (const ctx of SCOPE_CONTEXTS) {
    for (const resource of FHIR_RESOURCES) {
      const base = `${ctx.value}/${resource}`;
      if (base.toLowerCase().includes(lower) || resource.toLowerCase().includes(lower)) {
        suggestions.push(`${base}.rs`);
        suggestions.push(`${base}.cruds`);
        if (suggestions.length > 20) break;
      }
    }
    if (suggestions.length > 20) break;
  }

  // Wildcard scopes
  for (const ctx of SCOPE_CONTEXTS) {
    const wild = `${ctx.value}/*.rs`;
    const wildFull = `${ctx.value}/*.cruds`;
    if (wild.includes(lower)) suggestions.push(wild);
    if (wildFull.includes(lower)) suggestions.push(wildFull);
  }

  return [...new Set(suggestions)].slice(0, 12);
}

// ─── Component ─────────────────────────────────────────────────────────────

interface ScopeTagInputProps {
  value: string[];
  onChange: (scopes: string[]) => void;
  placeholder?: string;
  className?: string;
}

const CATEGORY_STYLES: Record<string, string> = {
  launch: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
  openid: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20',
  resource: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
  unknown: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20',
};

export function ScopeTagInput({ value, onChange, placeholder, className }: ScopeTagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!input.trim()) return [];
    return generateSuggestions(input).filter(s => !value.includes(s));
  }, [input, value]);

  const addScope = useCallback((scope: string) => {
    const trimmed = scope.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInput('');
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }, [value, onChange]);

  const removeScope = useCallback((scope: string) => {
    onChange(value.filter(s => s !== scope));
  }, [value, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        addScope(suggestions[highlightIndex]);
      } else if (input.trim()) {
        addScope(input);
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeScope(value[value.length - 1]);
    } else if (e.key === ',' || e.key === ' ') {
      if (input.trim()) {
        e.preventDefault();
        addScope(input);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      {/* Tag display + input */}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[42px] p-2 border border-foreground/10 rounded-md bg-transparent cursor-text focus-within:border-foreground/40 focus-within:ring-[3px] focus-within:ring-ring/50 transition-colors duration-200"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(scope => {
          const category = getScopeCategory(scope);
          const valid = isValidSmartScope(scope);
          const style = valid ? CATEGORY_STYLES[category] : CATEGORY_STYLES.unknown;
          return (
            <Badge
              key={scope}
              variant="outline"
              className={`text-xs font-mono px-2 py-0.5 gap-1 ${style}`}
            >
              {scope}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeScope(scope); }}
                className="ml-0.5 hover:text-foreground/90 transition-colors cursor-pointer"
                aria-label={`Remove ${scope}`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          );
        })}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); setHighlightIndex(-1); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => { setTimeout(() => setShowSuggestions(false), 150); }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? (placeholder ?? 'Type a scope...') : ''}
          className="flex-1 min-w-[180px] bg-transparent border-none outline-none text-sm font-mono text-foreground placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto border border-foreground/10 bg-popover rounded-md shadow-md">
          {suggestions.map((suggestion, idx) => {
            const category = getScopeCategory(suggestion);
            return (
              <button
                key={suggestion}
                type="button"
                className={`w-full text-left px-3 py-1.5 text-sm font-mono flex items-center gap-2 cursor-pointer transition-colors ${
                  idx === highlightIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                }`}
                onMouseDown={(e) => { e.preventDefault(); addScope(suggestion); }}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <Plus className="w-3 h-3 text-muted-foreground shrink-0" />
                <span>{suggestion}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/50">
                  {category}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Helper text */}
      <p className="mt-1.5 text-[11px] text-muted-foreground/60 font-mono">
        Type to search • Enter/comma/space to add • Backspace to remove last
      </p>
    </div>
  );
}
