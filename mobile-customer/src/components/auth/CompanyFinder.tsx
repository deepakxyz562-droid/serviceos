/**
 * CompanyFinder — debounced search-as-you-type company picker.
 *
 * Mirrors the PWA's `CompanyFinder` (src/components/auth/company-finder.tsx):
 *   - 2+ chars triggers a search via /api/companies/search?q=
 *   - Debounced 280ms (matches PWA)
 *   - Shows logo + name + industry for each result
 *   - Tap a result → onSelect(company)
 *   - Empty state when 0 results found after a search
 *
 * Used by the employee login flow (and as a fallback for customer password
 * login when the user doesn't know their identifier yet).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Pressable,
  Keyboard,
} from 'react-native';
import { Search, SearchX } from 'lucide-react-native';
import type { Company } from '@/types';
import { useAuthStore } from '@/stores/auth-store';
import { COLORS } from '@/lib/constants';
import { CompanyRow } from './CompanyCard';

const DEBOUNCE_MS = 280;

interface CompanyFinderProps {
  /** Called when a company is selected. */
  onSelect: (company: Company) => void;
  /** Placeholder text. */
  placeholder?: string;
  /** Auto-focus the search input on mount. */
  autoFocus?: boolean;
  /** Accent color for icons / fallback logos. */
  accent?: string;
}

export function CompanyFinder({
  onSelect,
  placeholder = 'Find your company by name or slug…',
  autoFocus,
  accent = COLORS.primary,
}: CompanyFinderProps) {
  const searchCompanies = useAuthStore((s) => s.searchCompanies);
  const loadLastCompany = useAuthStore((s) => s.loadLastCompany);
  const lastCompany = useAuthStore((s) => s.lastCompany);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Debounced search ────────────────────────────────────────────────
  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      if (trimmed.length < 2) {
        setResults([]);
        setIsLoading(false);
        setHasSearched(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const companies = await searchCompanies(trimmed);
          setResults(companies);
          setHasSearched(true);
        } catch (err) {
          console.error('[CompanyFinder] search failed', err);
          setResults([]);
          setHasSearched(true);
        } finally {
          setIsLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [searchCompanies]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSelect = (company: Company) => {
    Keyboard.dismiss();
    onSelect(company);
  };

  // ─── Recently used (from SecureStore) ────────────────────────────────
  const showRecent = !query && lastCompany;

  return (
    <View className="flex-1">
      {/* Search input */}
      <View className="mb-3 flex-row items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
        <Search size={18} color={COLORS.mutedForeground} />
        <TextInput
          autoFocus={autoFocus}
          value={query}
          onChangeText={(text) => {
            // Update visible text immediately AND trigger debounced search.
            // (Previously only runSearch was wired here, so `query` state never
            //  updated and the controlled input rejected every keystroke.)
            setQuery(text);
            runSearch(text);
          }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          className="flex-1 text-base text-gray-900"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {isLoading && <ActivityIndicator size="small" color={accent} />}
      </View>

      {/* Recent company (shown when no query) */}
      {showRecent && (
        <View className="mb-3">
          <Text className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Recently used
          </Text>
          <CompanyRow
            company={lastCompany}
            accent={accent}
            onPress={() => handleSelect(lastCompany)}
          />
        </View>
      )}

      {/* Results — rendered with View+map (not FlatList) to avoid the
          "VirtualizedLists should never be nested inside plain ScrollViews"
          warning. The search returns max 10 results, so virtualization
          provides no benefit and the nesting breaks windowing. */}
      {query.trim().length >= 2 && (
        <View>
          {results.map((item) => (
            <View key={item.id} className="mb-2">
              <CompanyRow company={item} accent={accent} onPress={() => handleSelect(item)} />
            </View>
          ))}

          {/* Empty state */}
          {hasSearched && !isLoading && results.length === 0 && (
            <View className="mt-8 items-center">
              <View className="mb-3 size-12 items-center justify-center rounded-full bg-gray-100">
                <SearchX size={22} color={COLORS.mutedForeground} />
              </View>
              <Text className="text-sm font-medium text-gray-700">No companies found</Text>
              <Text className="mt-1 text-center text-xs text-gray-400">
                Try a different name or check the spelling.
              </Text>
            </View>
          )}

          {/* Loading footer */}
          {isLoading && (
            <View className="mt-4 items-center">
              <ActivityIndicator size="small" color={accent} />
            </View>
          )}
        </View>
      )}

      {/* Hint when query is too short */}
      {query.trim().length > 0 && query.trim().length < 2 && (
        <Text className="mt-2 px-2 text-xs text-gray-400">
          Type at least 2 characters to search.
        </Text>
      )}

      {/* Help link */}
      {!query && (
        <Pressable
          onPress={() => loadLastCompany().catch(() => {})}
          className="mt-4 items-center"
          hitSlop={{ top: 10, bottom: 10 }}
        >
          <Text className="text-xs text-gray-400">
            Don't know your company link? Search by name above.
          </Text>
        </Pressable>
      )}
    </View>
  );
}
