'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ComponentType,
  type SVGProps,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  ChevronDown,
  X,
  Loader2,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  MapPin,
  Briefcase,
  RefreshCw,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { PersonCard } from './PersonCard';
import { PersonCardSkeleton } from './PersonCardSkeleton';
import { NearbyUsers } from './NearbyUsers';
import { SmartMatchesTab } from './SmartMatchesTab';
import { PeopleYouKnowTab } from './PeopleYouKnowTab';
import {
  AllPeopleTabIcon,
  ForYouTabIcon,
  NearbyTabIcon,
  PeopleYouKnowTabIcon,
  SameCampusTabIcon,
  SmartMatchesTabIcon,
} from './FindPeopleTabIcons';
import {
  getPeople,
  searchPeople,
  getSuggestions,
  getPeopleFromSameCollege,
  getFilterOptions,
  type PersonCard as PersonCardType,
  type PeopleFilters,
  type PeopleResponse,
  type FilterOptions,
  type PersonRelationship,
} from '@/lib/api/people';
import { useAuth } from '@/lib/auth/useAuth';
import { FIND_PEOPLE_STALE_TIME, queryKeys } from '@/lib/queryKeys';
import { handleApiError, isApiTimeoutError } from '@/lib/utils/errorHandler';
import {
  BROWSE_PAGE_SIZE,
  PREFETCH_REMAINING_ITEMS,
  SEARCH_DEBOUNCE_MS,
  SEARCH_MIN_CHARACTERS,
  SEARCH_PAGE_SIZE,
  decideFindPage,
  normalizePeopleSearch,
  withPersonRelationship,
} from '@/lib/findPeoplePolicy';
import {
  readRecentPeopleProfiles,
  readRecentPeopleSearches,
  rememberPeopleProfile,
  rememberPeopleSearch,
  type RecentPerson,
} from '@/lib/findPeopleRecent';
import { SearchPersonRow, SearchPersonRowSkeleton } from './SearchPersonRow';
import { ProfileLink } from '@/components/profile/ProfileLink';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import type { CoreProfileResponse, FullProfileResponse } from '@/types/profile';

type TabType = 'known' | 'all' | 'smart' | 'suggestions' | 'college' | 'nearby';

interface FindPeopleInitialCache {
  people: PersonCardType[];
  total: number;
  hasMore: boolean;
  nextCursor?: string | null;
  suggestions: PersonCardType[];
  suggestionsHasMore?: boolean;
  colleaguePeople: PersonCardType[];
  colleagueHasMore?: boolean;
}

function appendUniquePeople(current: PersonCardType[], incoming: PersonCardType[]): PersonCardType[] {
  const byId = new Map(current.map((person) => [person.id, person]));
  incoming.forEach((person) => byId.set(person.id, person));
  return Array.from(byId.values());
}

function isCancelledRequest(error: unknown): boolean {
  const candidate = error as { code?: string; name?: string } | null;
  return candidate?.code === 'ERR_CANCELED' || candidate?.name === 'CanceledError';
}

type TabItem = {
  id: TabType;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const tabItems: TabItem[] = [
  { id: 'all', label: 'All People', Icon: AllPeopleTabIcon },
  { id: 'smart', label: 'Smart Matches', Icon: SmartMatchesTabIcon },
  { id: 'known', label: 'People You Know', Icon: PeopleYouKnowTabIcon },
  { id: 'suggestions', label: 'For You', Icon: ForYouTabIcon },
  { id: 'college', label: 'Same Campus', Icon: SameCampusTabIcon },
  { id: 'nearby', label: 'Nearby', Icon: NearbyTabIcon },
];

function getActiveTabFromParam(tabParam: string | null): TabType {
  switch (tabParam) {
    case 'known':
      return 'known';
    case 'smart':
      return 'smart';
    case 'suggestions':
      return 'suggestions';
    case 'college':
      return 'college';
    case 'nearby':
      return 'nearby';
    case 'all':
    default:
      return 'all';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter panel (shared between desktop sidebar and mobile sheet)
// ─────────────────────────────────────────────────────────────────────────────

interface FilterSelectProps {
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: React.ReactNode;
}

function FilterSelect({ label, Icon, value, onChange, placeholder, children }: FilterSelectProps) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-neutral-400 mb-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none pl-3 pr-9 py-2 rounded-lg border text-sm bg-white dark:bg-neutral-900 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
            value
              ? 'border-blue-500 text-gray-900 dark:text-white font-medium'
              : 'border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300'
          }`}
        >
          <option value="">{placeholder}</option>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}

interface FilterPanelProps {
  filterOptions: FilterOptions | null;
  userCollege?: string | null;
  selectedCollege: string;
  setSelectedCollege: (v: string) => void;
  selectedBranch: string;
  setSelectedBranch: (v: string) => void;
  selectedYear: number | undefined;
  setSelectedYear: (v: number | undefined) => void;
  selectedLocation: string;
  setSelectedLocation: (v: string) => void;
  openToOpportunities: boolean;
  setOpenToOpportunities: (v: boolean) => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

function FilterPanel({
  filterOptions,
  userCollege,
  selectedCollege,
  setSelectedCollege,
  selectedBranch,
  setSelectedBranch,
  selectedYear,
  setSelectedYear,
  selectedLocation,
  setSelectedLocation,
  openToOpportunities,
  setOpenToOpportunities,
  hasActiveFilters,
  onClearAll,
}: FilterPanelProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
          <SlidersHorizontal className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            Reset all
          </button>
        )}
      </div>

      {((filterOptions?.colleges?.length ?? 0) > 0 || userCollege) && (
        <FilterSelect
          label="College"
          Icon={GraduationCap}
          value={selectedCollege}
          onChange={setSelectedCollege}
          placeholder="All colleges"
        >
          {userCollege && <option value={userCollege}>My campus ({userCollege})</option>}
          {filterOptions?.colleges
            ?.filter((c) => c !== userCollege)
            .map((college) => (
              <option key={college} value={college}>
                {college}
              </option>
            ))}
        </FilterSelect>
      )}

      {filterOptions?.branches && filterOptions.branches.length > 0 && (
        <FilterSelect
          label="Branch"
          Icon={BookOpen}
          value={selectedBranch}
          onChange={setSelectedBranch}
          placeholder="All branches"
        >
          {filterOptions.branches.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </FilterSelect>
      )}

      {filterOptions?.graduationYears && filterOptions.graduationYears.length > 0 && (
        <FilterSelect
          label="Graduation year"
          Icon={CalendarDays}
          value={selectedYear?.toString() ?? ''}
          onChange={(v) => setSelectedYear(v ? parseInt(v) : undefined)}
          placeholder="All years"
        >
          {[...filterOptions.graduationYears]
            .sort((a, b) => b - a)
            .map((year) => (
              <option key={year} value={year}>
                Class of {year}
              </option>
            ))}
        </FilterSelect>
      )}

      {filterOptions?.locations && filterOptions.locations.length > 0 && (
        <FilterSelect
          label="Location"
          Icon={MapPin}
          value={selectedLocation}
          onChange={setSelectedLocation}
          placeholder="Anywhere"
        >
          {filterOptions.locations.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </FilterSelect>
      )}

      <label className="flex items-center justify-between gap-3 cursor-pointer select-none pt-1">
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-neutral-300">
          <Briefcase className="w-4 h-4 text-gray-500 dark:text-neutral-400" />
          Open to opportunities
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={openToOpportunities}
          onClick={() => setOpenToOpportunities(!openToOpportunities)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            openToOpportunities ? 'bg-blue-600' : 'bg-gray-300 dark:bg-neutral-700'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              openToOpportunities ? 'translate-x-[18px]' : 'translate-x-1'
            }`}
          />
        </button>
      </label>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function FindPeople() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const tabParam = searchParams.get('tab');
  const cachedInitialData = queryClient.getQueryData<FindPeopleInitialCache>(
    queryKeys.findPeopleInitial()
  );
  const cachedFilterOptions = queryClient.getQueryData<FilterOptions>(
    queryKeys.peopleFilterOptions()
  );
  const [activeTab, setActiveTab] = useState<TabType>(() => getActiveTabFromParam(tabParam));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchRetryVersion, setSearchRetryVersion] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentProfiles, setRecentProfiles] = useState<RecentPerson[]>([]);
  const [people, setPeople] = useState<PersonCardType[]>(() => cachedInitialData?.people ?? []);
  const [suggestions, setSuggestions] = useState<PersonCardType[]>(
    () => cachedInitialData?.suggestions ?? []
  );
  const [colleaguePeople, setColleaguePeople] = useState<PersonCardType[]>(
    () => cachedInitialData?.colleaguePeople ?? []
  );
  const [loading, setLoading] = useState(() => !cachedInitialData);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [sectionRetryVersion, setSectionRetryVersion] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    () => cachedFilterOptions ?? null
  );
  const [, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(() => cachedInitialData?.hasMore ?? true);
  const [nextCursor, setNextCursor] = useState<string | null>(
    () => cachedInitialData?.nextCursor ?? null
  );
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [suggestionsHasMore, setSuggestionsHasMore] = useState(
    () => cachedInitialData?.suggestionsHasMore ?? false
  );
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(
    () => Boolean(cachedInitialData?.suggestions.length)
  );
  const [colleaguePage, setColleaguePage] = useState(1);
  const [colleagueHasMore, setColleagueHasMore] = useState(
    () => cachedInitialData?.colleagueHasMore ?? false
  );
  const [colleagueLoaded, setColleagueLoaded] = useState(
    () => Boolean(cachedInitialData?.colleaguePeople.length)
  );
  const [total, setTotal] = useState(() => cachedInitialData?.total ?? 0);
  const [selectedCollege, setSelectedCollege] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [openToOpportunities, setOpenToOpportunities] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchRequestVersionRef = useRef(0);
  const requestedCursorsRef = useRef(new Map<string, Set<string>>());
  const inFlightCursorsRef = useRef(new Set<string>());
  const normalizedSearchQuery = normalizePeopleSearch(searchQuery);
  const normalizedDebouncedSearch = normalizePeopleSearch(debouncedSearchQuery);
  const isSearchMode = activeTab === 'all' && (searchFocused || normalizedSearchQuery.length > 0);
  const isAuthoritativeSearch = normalizedDebouncedSearch.length >= SEARCH_MIN_CHARACTERS;

  // Filters auto-apply — no apply button, LinkedIn-style
  const activeFilters = useMemo<PeopleFilters>(
    () => ({
      college: selectedCollege || undefined,
      branch: selectedBranch || undefined,
      graduationYear: selectedYear,
      location: selectedLocation || undefined,
      isOpenToOpportunities: openToOpportunities || undefined,
    }),
    [selectedCollege, selectedBranch, selectedYear, selectedLocation, openToOpportunities]
  );
  const activePeopleRequestKey = useMemo(
    () => JSON.stringify({
      viewerId: user?.id ?? 'anonymous',
      query: isAuthoritativeSearch ? normalizedDebouncedSearch : '',
      filters: isAuthoritativeSearch ? {} : activeFilters,
    }),
    [activeFilters, isAuthoritativeSearch, normalizedDebouncedSearch, user?.id]
  );
  const hasActiveFilters = Boolean(
    selectedCollege || selectedBranch || selectedYear || selectedLocation || openToOpportunities
  );
  const activeFilterCount = [
    selectedCollege,
    selectedBranch,
    selectedYear,
    selectedLocation,
    openToOpportunities,
  ].filter(Boolean).length;

  useEffect(() => {
    setRecentSearches(readRecentPeopleSearches(user?.id));
    setRecentProfiles(readRecentPeopleProfiles(user?.id));
  }, [user?.id]);

  // Cached initial data - instant when navigating back from profile
  const { data: initialData, isLoading: initialLoading, isError: initialError, refetch: refetchInitial } = useQuery({
    queryKey: queryKeys.findPeopleInitial(),
    queryFn: async () => {
      const allPeopleRes = await getPeople({}, { limit: BROWSE_PAGE_SIZE });
      return {
        people: allPeopleRes.people,
        total: allPeopleRes.total,
        hasMore: allPeopleRes.hasMore,
        nextCursor: allPeopleRes.nextCursor,
        suggestions: [],
        suggestionsHasMore: false,
        colleaguePeople: [],
        colleagueHasMore: false,
      };
    },
    staleTime: FIND_PEOPLE_STALE_TIME,
    retry: (failureCount, error) => !isApiTimeoutError(error) && failureCount < 2,
  });

  const { data: filterOptionsData } = useQuery({
    queryKey: queryKeys.peopleFilterOptions(),
    queryFn: getFilterOptions,
    staleTime: FIND_PEOPLE_STALE_TIME,
    enabled: activeTab === 'all' && !isSearchMode,
  });

  // Sync cached data into local state when available (instant when navigating back)
  useEffect(() => {
    if (initialData && !isSearchMode && !hasActiveFilters) {
      setPeople(initialData.people);
      setTotal(initialData.total);
      setHasMore(initialData.hasMore);
      setNextCursor(initialData.nextCursor ?? null);
      setLoading(false);
    }
  }, [hasActiveFilters, initialData, isSearchMode]);

  // Show loading when fetching and no cached data; clear loading when query completes (success or error)
  useEffect(() => {
    if (isSearchMode || hasActiveFilters) return;
    if (!initialData && initialLoading) setLoading(true);
    if (!initialLoading) setLoading(false);
  }, [hasActiveFilters, initialLoading, initialData, isSearchMode]);

  useEffect(() => {
    if (filterOptionsData) {
      setFilterOptions(filterOptionsData);
    }
  }, [filterOptionsData]);

  // Open college tab when navigating from "See all from your campus"
  useEffect(() => {
    setActiveTab(getActiveTabFromParam(tabParam));
  }, [tabParam]);

  useEffect(() => {
    if (activeTab !== 'suggestions' || suggestionsLoaded) return;
    let cancelled = false;
    setSectionLoading(true);
    setSectionError(null);
    getSuggestions(BROWSE_PAGE_SIZE, 1)
      .then((result) => {
        if (cancelled) return;
        setSuggestions(result.suggestions);
        setSuggestionsPage(1);
        setSuggestionsHasMore(Boolean(result.hasMore));
        setSuggestionsLoaded(true);
      })
      .catch((error) => {
        if (!cancelled) setSectionError(handleApiError(error));
      })
      .finally(() => {
        if (!cancelled) {
          setSectionLoading(false);
        }
      });
    return () => {
      cancelled = true;
      setSectionLoading(false);
    };
  }, [activeTab, sectionRetryVersion, suggestionsLoaded]);

  useEffect(() => {
    if (activeTab !== 'college' || colleagueLoaded) return;
    let cancelled = false;
    setSectionLoading(true);
    setSectionError(null);
    getPeopleFromSameCollege(BROWSE_PAGE_SIZE, 1)
      .then((result) => {
        if (cancelled) return;
        setColleaguePeople(result.people);
        setColleaguePage(1);
        setColleagueHasMore(Boolean(result.hasMore));
        setColleagueLoaded(true);
      })
      .catch((error) => {
        if (!cancelled) setSectionError(handleApiError(error));
      })
      .finally(() => {
        if (!cancelled) {
          setSectionLoading(false);
        }
      });
    return () => {
      cancelled = true;
      setSectionLoading(false);
    };
  }, [activeTab, colleagueLoaded, sectionRetryVersion]);

  // Indexed search is authoritative. Every new query aborts the prior request and
  // stale responses are rejected even if a transport cannot be cancelled promptly.
  useEffect(() => {
    const requestVersion = ++searchRequestVersionRef.current;
    if (activeTab !== 'all') return;

    const controller = new AbortController();
    setPage(1);
    setSearchError(null);
    setSectionError(null);
    requestedCursorsRef.current.set(activePeopleRequestKey, new Set(['__first__']));

    if (isSearchMode && normalizedSearchQuery.length < SEARCH_MIN_CHARACTERS) {
      setPeople([]);
      setTotal(0);
      setHasMore(false);
      setNextCursor(null);
      setLoading(false);
      return () => controller.abort();
    }

    if (isSearchMode && normalizedSearchQuery !== normalizedDebouncedSearch) {
      setPeople([]);
      setTotal(0);
      setHasMore(false);
      setNextCursor(null);
      setLoading(true);
      return () => controller.abort();
    }

    if (!isAuthoritativeSearch && !hasActiveFilters) {
      if (initialData) {
        setPeople(initialData.people);
        setTotal(initialData.total);
        setHasMore(initialData.hasMore);
        setNextCursor(initialData.nextCursor ?? null);
      }
      setLoading(!initialData && initialLoading);
      return () => controller.abort();
    }

    const viewerId = user?.id ?? 'anonymous';
    const firstPageQueryKey = isAuthoritativeSearch
      ? queryKeys.peopleSearch(viewerId, normalizedDebouncedSearch)
      : ['find-people-filtered', viewerId, activeFilters, 'first'] as const;
    const cached = queryClient.getQueryData<Awaited<ReturnType<typeof getPeople>>>(firstPageQueryKey);
    if (cached) {
      setPeople(cached.people);
      setTotal(cached.total);
      setHasMore(cached.hasMore);
      setNextCursor(cached.nextCursor ?? null);
    }
    setLoading(!cached);

    void queryClient.fetchQuery({
      queryKey: firstPageQueryKey,
      queryFn: () => isAuthoritativeSearch
        ? searchPeople(normalizedDebouncedSearch, { limit: SEARCH_PAGE_SIZE }, controller.signal)
        : getPeople(activeFilters, { limit: BROWSE_PAGE_SIZE }, controller.signal),
      staleTime: isAuthoritativeSearch ? 2 * 60 * 1000 : FIND_PEOPLE_STALE_TIME,
      retry: (failureCount, error) =>
        !isCancelledRequest(error) && !isApiTimeoutError(error) && failureCount < 1,
    })
      .then((result) => {
        if (controller.signal.aborted || requestVersion !== searchRequestVersionRef.current) return;
        const decision = decideFindPage({
          existingUserIds: new Set<string>(),
          incomingUserIds: result.people.map((person) => person.id),
          previousCursor: null,
          serverNextCursor: result.nextCursor,
          serverHasMore: result.hasMore,
        });
        setPeople(result.people);
        setTotal(result.total);
        setHasMore(decision.hasMore);
        setNextCursor(decision.nextCursor);
        if (isAuthoritativeSearch) {
          setRecentSearches(rememberPeopleSearch(user?.id, debouncedSearchQuery));
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || isCancelledRequest(error)) return;
        if (requestVersion === searchRequestVersionRef.current) {
          setSearchError(handleApiError(error));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestVersion === searchRequestVersionRef.current) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    activeFilters,
    activePeopleRequestKey,
    activeTab,
    debouncedSearchQuery,
    hasActiveFilters,
    initialData,
    initialLoading,
    isAuthoritativeSearch,
    isSearchMode,
    normalizedDebouncedSearch,
    normalizedSearchQuery,
    queryClient,
    searchRetryVersion,
    user?.id,
  ]);

  // Clear filters
  const clearFilters = () => {
    setSelectedCollege('');
    setSelectedBranch('');
    setSelectedYear(undefined);
    setSelectedLocation('');
    setOpenToOpportunities(false);
  };

  // Load more people
  const loadMore = useCallback(async (force = false) => {
    const requestVersion = searchRequestVersionRef.current;
    const activeHasMore =
      activeTab === 'all'
        ? hasMore
        : activeTab === 'suggestions'
          ? suggestionsHasMore
          : activeTab === 'college'
            ? colleagueHasMore
            : false;
    if (loadingMore || (!activeHasMore && !force)) return;
    let activeCursorRequestKey: string | null = null;

    try {
      if (activeTab === 'all') {
        if (!nextCursor) {
          setHasMore(false);
          return;
        }
        activeCursorRequestKey = `${activePeopleRequestKey}:${nextCursor}`;
        const requested = requestedCursorsRef.current.get(activePeopleRequestKey) ?? new Set<string>();
        requestedCursorsRef.current.set(activePeopleRequestKey, requested);
        if (inFlightCursorsRef.current.has(activeCursorRequestKey)) return;
        if (!force && requested.has(nextCursor)) return;
        requested.add(nextCursor);
        inFlightCursorsRef.current.add(activeCursorRequestKey);
        setLoadingMore(true);

        const viewerId = user?.id ?? 'anonymous';
        const pageQueryKey = isAuthoritativeSearch
          ? queryKeys.peopleSearch(viewerId, normalizedDebouncedSearch, nextCursor)
          : ['find-people-filtered', viewerId, activeFilters, nextCursor] as const;
        const result = await queryClient.fetchQuery({
          queryKey: pageQueryKey,
          queryFn: () => isAuthoritativeSearch
            ? searchPeople(normalizedDebouncedSearch, { cursor: nextCursor, limit: SEARCH_PAGE_SIZE })
            : getPeople(activeFilters, { cursor: nextCursor, limit: BROWSE_PAGE_SIZE }),
          staleTime: isAuthoritativeSearch ? 2 * 60 * 1000 : FIND_PEOPLE_STALE_TIME,
          retry: (failureCount, error) =>
            !isCancelledRequest(error) && !isApiTimeoutError(error) && failureCount < 1,
        });
        if (requestVersion !== searchRequestVersionRef.current) return;
        const decision = decideFindPage({
          existingUserIds: new Set(people.map((person) => person.id)),
          incomingUserIds: result.people.map((person) => person.id),
          previousCursor: nextCursor,
          serverNextCursor: result.nextCursor,
          serverHasMore: result.hasMore,
        });
        setPeople((previous) => appendUniquePeople(previous, result.people));
        setPage((previous) => previous + 1);
        setHasMore(decision.hasMore);
        setNextCursor(decision.nextCursor);
      } else if (activeTab === 'suggestions') {
        setLoadingMore(true);
        const nextPage = suggestionsPage + 1;
        const result = await getSuggestions(BROWSE_PAGE_SIZE, nextPage);
        setSuggestions((previous) => appendUniquePeople(previous, result.suggestions));
        setSuggestionsPage(nextPage);
        setSuggestionsHasMore(Boolean(result.hasMore));
      } else if (activeTab === 'college') {
        setLoadingMore(true);
        const nextPage = colleaguePage + 1;
        const result = await getPeopleFromSameCollege(BROWSE_PAGE_SIZE, nextPage);
        setColleaguePeople((previous) => appendUniquePeople(previous, result.people));
        setColleaguePage(nextPage);
        setColleagueHasMore(Boolean(result.hasMore));
      }
    } catch (error) {
      if (requestVersion !== searchRequestVersionRef.current || isCancelledRequest(error)) return;
      console.error('Failed to load more:', error);
      setSectionError(handleApiError(error));
      if (activeTab === 'all') {
        if (nextCursor) requestedCursorsRef.current.get(activePeopleRequestKey)?.delete(nextCursor);
        setHasMore(Boolean(nextCursor));
      }
      if (activeTab === 'suggestions') setSuggestionsHasMore(false);
      if (activeTab === 'college') setColleagueHasMore(false);
    } finally {
      if (activeCursorRequestKey) inFlightCursorsRef.current.delete(activeCursorRequestKey);
      setLoadingMore(false);
    }
  }, [
    activeTab,
    activeFilters,
    activePeopleRequestKey,
    colleagueHasMore,
    colleaguePage,
    hasMore,
    isAuthoritativeSearch,
    loadingMore,
    nextCursor,
    normalizedDebouncedSearch,
    people,
    queryClient,
    suggestionsHasMore,
    suggestionsPage,
    user?.id,
  ]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const canLoad =
          (activeTab === 'all' && hasMore) ||
          (activeTab === 'suggestions' && suggestionsHasMore) ||
          (activeTab === 'college' && colleagueHasMore);
        if (entries[0].isIntersecting && canLoad && !loadingMore) {
          void loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [activeTab, colleagueHasMore, hasMore, loadMore, loadingMore, suggestionsHasMore]);

  // Handle connection status change
  const handleConnectionChange = useCallback((personId: string, relationship: PersonRelationship) => {
    const updateList = (list: PersonCardType[]) =>
      list.map(p =>
        p.id === personId ? withPersonRelationship(p, relationship) : p
      );
    const targetPerson = [people, suggestions, colleaguePeople]
      .flat()
      .find((person) => person.id === personId);

    setPeople(updateList);
    setSuggestions(updateList);
    setColleaguePeople(updateList);

    queryClient.setQueriesData<PeopleResponse>({ queryKey: ['people-search'] }, (cached) =>
      cached ? { ...cached, people: updateList(cached.people) } : cached
    );
    queryClient.setQueriesData<PeopleResponse>({ queryKey: ['find-people-filtered'] }, (cached) =>
      cached ? { ...cached, people: updateList(cached.people) } : cached
    );
    queryClient.setQueryData<FindPeopleInitialCache>(queryKeys.findPeopleInitial(), (cached) =>
      cached ? {
        ...cached,
        people: updateList(cached.people),
        suggestions: updateList(cached.suggestions),
        colleaguePeople: updateList(cached.colleaguePeople),
      } : cached
    );

    const profileAliases = new Set(
      [personId, targetPerson?.username, targetPerson?.username ? `@${targetPerson.username}` : null]
        .filter((value): value is string => Boolean(value))
    );
    profileAliases.forEach((alias) => {
      queryClient.setQueryData<CoreProfileResponse>(queryKeys.profileCore(alias), (cached) =>
        cached ? {
          ...cached,
          viewerContext: {
            ...cached.viewerContext,
            connectionStatus: relationship.status,
            connectionId: relationship.connectionId ?? null,
          },
        } : cached
      );
      queryClient.setQueryData<FullProfileResponse>(queryKeys.profile(alias), (cached) =>
        cached ? {
          ...cached,
          viewerContext: {
            ...cached.viewerContext,
            connectionStatus: relationship.status,
            connectionId: relationship.connectionId ?? null,
          },
        } : cached
      );
    });
  }, [colleaguePeople, people, queryClient, suggestions]);

  const handleProfileIntent = useCallback((person: PersonCardType) => {
    setRecentProfiles(rememberPeopleProfile(user?.id, person));
  }, [user?.id]);

  // Get current display list (dedupe by id to avoid React key errors from API overlap)
  const getDisplayedPeople = () => {
    switch (activeTab) {
      case 'suggestions':
        return suggestions;
      case 'college':
        return colleaguePeople;
      default:
        return people;
    }
  };

  const displayedPeople = (() => {
    const list = getDisplayedPeople();
    const seen = new Set<string>();
    return list.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  })();

  const isSearchResultsVisible = activeTab === 'all' && isSearchMode;
  const isSearchDebouncing =
    normalizedSearchQuery.length >= SEARCH_MIN_CHARACTERS &&
    normalizedSearchQuery !== normalizedDebouncedSearch;
  const isGridTab =
    (activeTab === 'all' && !isSearchMode) ||
    activeTab === 'suggestions' ||
    activeTab === 'college';
  const isGridLoading = loading || sectionLoading;
  const activeGridHasMore =
    (activeTab === 'all' && hasMore) ||
    (activeTab === 'suggestions' && suggestionsHasMore) ||
    (activeTab === 'college' && colleagueHasMore);
  const showSidebar = activeTab === 'all' && !isSearchMode;
  const prefetchIndex = Math.max(0, displayedPeople.length - PREFETCH_REMAINING_ITEMS);

  const retryActiveGrid = () => {
    setSectionError(null);
    if (activeTab === 'all') {
      // Only load-more failures use this error state for the main grid.
      void loadMore(true);
      return;
    }
    if (activeTab === 'suggestions') setSuggestionsLoaded(false);
    if (activeTab === 'college') setColleagueLoaded(false);
    setSectionRetryVersion((version) => version + 1);
  };

  const filterPanelProps: FilterPanelProps = {
    filterOptions,
    userCollege: user?.college,
    selectedCollege,
    setSelectedCollege,
    selectedBranch,
    setSelectedBranch,
    selectedYear,
    setSelectedYear,
    selectedLocation,
    setSelectedLocation,
    openToOpportunities,
    setOpenToOpportunities,
    hasActiveFilters,
    onClearAll: clearFilters,
  };

  const activeFilterChips = (
    <>
      {selectedCollege && (
        <FilterChip
          Icon={GraduationCap}
          label={selectedCollege}
          onRemove={() => setSelectedCollege('')}
        />
      )}
      {selectedBranch && (
        <FilterChip Icon={BookOpen} label={selectedBranch} onRemove={() => setSelectedBranch('')} />
      )}
      {selectedYear && (
        <FilterChip
          Icon={CalendarDays}
          label={`Class of ${selectedYear}`}
          onRemove={() => setSelectedYear(undefined)}
        />
      )}
      {selectedLocation && (
        <FilterChip Icon={MapPin} label={selectedLocation} onRemove={() => setSelectedLocation('')} />
      )}
      {openToOpportunities && (
        <FilterChip
          Icon={Briefcase}
          label="Open to opportunities"
          onRemove={() => setOpenToOpportunities(false)}
        />
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-neutral-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 pt-5">
          {/* Title */}
          <div className={`${isSearchMode ? 'sr-only' : 'flex'} items-end justify-between gap-4`}>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Find People
              </h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
                Grow your network — students, creators and builders
              </p>
            </div>
          </div>

          {/* Search Bar (only for All tab) */}
          {activeTab === 'all' && (
            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => {
                    if (!searchQuery.trim()) setSearchFocused(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setSearchQuery('');
                      setSearchFocused(false);
                      event.currentTarget.blur();
                    }
                  }}
                  placeholder="Search by name, username, college, skills..."
                  className="w-full pl-11 pr-10 py-2.5 rounded-full border border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none shadow-sm transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-600"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {loading && isAuthoritativeSearch && (
                  <Loader2 className="absolute right-11 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-600" aria-label="Searching" />
                )}
              </div>

              {/* Mobile filter trigger */}
              {!isSearchMode && <button
                onClick={() => setShowMobileFilters(true)}
                className={`lg:hidden relative flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold shadow-sm transition-colors ${
                  hasActiveFilters
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                    : 'border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>}
            </div>
          )}

          {/* Tabs — underline style */}
          {!isSearchMode && <nav className="mt-3 -mb-px flex gap-1 overflow-x-auto scrollbar-hide" aria-label="Find people tabs">
            {tabItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setSectionError(null);
                  setActiveTab(id);
                }}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-neutral-400 hover:text-gray-800 dark:hover:text-neutral-200 hover:border-gray-300 dark:hover:border-neutral-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 py-6 flex items-start gap-6">
        {/* Desktop filter sidebar */}
        {showSidebar && (
          <aside className="hidden lg:block w-64 shrink-0 sticky top-[200px]">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4">
              <FilterPanel {...filterPanelProps} />
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {isSearchResultsVisible && (
            <section className="mx-auto max-w-3xl" aria-label="People search results">
              {normalizedSearchQuery.length < SEARCH_MIN_CHARACTERS ? (
                <div className="space-y-7">
                  {recentSearches.length > 0 && (
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recent searches</h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {recentSearches.slice(0, 10).map((recent) => (
                          <button
                            key={recent}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setSearchQuery(recent)}
                            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300"
                          >
                            {recent}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {recentProfiles.length > 0 && (
                    <div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white">Recently viewed</h2>
                      <div className="mt-2 divide-y divide-gray-100 dark:divide-neutral-800">
                        {recentProfiles.slice(0, 8).map((person) => (
                          <ProfileLink
                            key={person.id}
                            profileId={person.username || person.id}
                            className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-3 hover:bg-gray-100/80 dark:hover:bg-neutral-900"
                          >
                            <UserAvatar
                              imageSrc={person.profileImage}
                              name={person.name || person.username || 'Vormex user'}
                              className="h-11 w-11 shrink-0 bg-gray-100 text-sm font-semibold dark:bg-neutral-800"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <span className="truncate text-sm font-bold text-gray-900 dark:text-white">
                                  {person.name?.trim() || person.username?.trim() || 'Vormex user'}
                                </span>
                                <VerificationBadge
                                  profileBadgeStyle={person.profileBadgeStyle}
                                  isPremium={person.isPremium}
                                  size="small"
                                />
                              </span>
                              <span className="block truncate text-xs text-gray-500 dark:text-neutral-400">
                                @{person.username}
                              </span>
                              {(person.headline || person.college) && (
                                <span className="mt-0.5 block truncate text-xs text-gray-600 dark:text-neutral-300">
                                  {person.headline || person.college}
                                </span>
                              )}
                            </span>
                          </ProfileLink>
                        ))}
                      </div>
                    </div>
                  )}

                  {recentSearches.length === 0 && recentProfiles.length === 0 && (
                    <div className="py-16 text-center">
                      <Search className="mx-auto h-10 w-10 text-gray-300 dark:text-neutral-700" />
                      <h2 className="mt-4 font-semibold text-gray-900 dark:text-white">Search the Vormex community</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">
                        Enter at least two characters to search names, skills, interests, colleges and branches.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  {!loading && !isSearchDebouncing && !searchError && displayedPeople.length > 0 && (
                    <p className="mb-2 px-3 text-xs font-medium text-gray-500 dark:text-neutral-400">
                      {total.toLocaleString()} matching result{total !== 1 ? 's' : ''}
                    </p>
                  )}

                  {(loading || isSearchDebouncing) && displayedPeople.length === 0 && (
                    <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                      {Array.from({ length: 7 }).map((_, index) => (
                        <SearchPersonRowSkeleton key={index} />
                      ))}
                    </div>
                  )}

                  {!loading && !isSearchDebouncing && searchError && displayedPeople.length === 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900/60 dark:bg-red-950/20">
                      <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
                      <p className="mt-3 text-sm text-red-600 dark:text-red-400">{searchError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          void queryClient.removeQueries({
                            queryKey: queryKeys.peopleSearch(user?.id ?? 'anonymous', normalizedDebouncedSearch),
                          });
                          setSearchRetryVersion((version) => version + 1);
                        }}
                        className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {!loading && !isSearchDebouncing && !searchError && displayedPeople.length === 0 && (
                    <div className="py-16 text-center">
                      <Users className="mx-auto h-10 w-10 text-gray-300 dark:text-neutral-700" />
                      <h2 className="mt-4 font-semibold text-gray-900 dark:text-white">No people found</h2>
                      <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">Try a name, skill, interest, college or branch.</p>
                    </div>
                  )}

                  {displayedPeople.length > 0 && (
                    <div className="divide-y divide-gray-100 dark:divide-neutral-800">
                      {displayedPeople.map((person, index) => (
                        <div key={person.id} ref={index === prefetchIndex ? loadMoreRef : undefined}>
                          <SearchPersonRow
                            person={person}
                            query={normalizedDebouncedSearch}
                            onConnectionChange={handleConnectionChange}
                            onProfileIntent={handleProfileIntent}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {sectionError && displayedPeople.length > 0 && (
                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/20 dark:text-red-300">
                      <span className="truncate">{sectionError}</span>
                      <button type="button" onClick={() => void loadMore(true)} className="shrink-0 font-semibold underline underline-offset-2">
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Active filter chips + result count */}
          {!isSearchMode && activeTab === 'all' && hasActiveFilters && !isGridLoading && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {activeFilterChips}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-gray-500 dark:text-neutral-400 hover:text-gray-700 dark:hover:text-neutral-200 underline underline-offset-2"
                >
                  Clear all
                </button>
              )}
              <span className="ml-auto text-sm text-gray-500 dark:text-neutral-400">
                {total.toLocaleString()} result{total !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {activeTab === 'known' && <PeopleYouKnowTab />}

          {/* Smart Matches Tab Content */}
          {activeTab === 'smart' && <SmartMatchesTab />}

          {/* Nearby Tab Content */}
          {activeTab === 'nearby' && <NearbyUsers />}

          {/* Skeleton Loading */}
          {isGridTab && isGridLoading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PersonCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {!isSearchMode && activeTab === 'all' && !isGridLoading && initialError && (
            <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800">
              <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Failed to load people
              </h3>
              <p className="text-gray-500 dark:text-neutral-400 max-w-md mx-auto mb-4">
                Something went wrong. Please try again.
              </p>
              <button
                onClick={() => refetchInitial()}
                className="px-5 py-2 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {isGridTab && !isGridLoading && sectionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center dark:border-red-900/60 dark:bg-red-950/20">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{sectionError}</p>
              <button
                type="button"
                onClick={retryActiveGrid}
                className="mt-4 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {isGridTab && !isGridLoading && !(activeTab === 'all' && initialError) && !sectionError && displayedPeople.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center">
                <Users className="w-8 h-8 text-gray-400 dark:text-neutral-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {activeTab === 'suggestions'
                  ? 'No suggestions yet'
                  : activeTab === 'college'
                  ? 'No colleagues found'
                  : searchQuery || hasActiveFilters
                  ? 'No results found'
                  : 'No people found'}
              </h3>
              <p className="text-gray-500 dark:text-neutral-400 max-w-md mx-auto">
                {activeTab === 'suggestions'
                  ? 'Complete your profile to get personalized suggestions'
                  : activeTab === 'college'
                  ? 'Add your college information to find colleagues'
                  : searchQuery || hasActiveFilters
                  ? 'Try a different search term or adjust your filters'
                  : 'Check back later for new users'}
              </p>
              {hasActiveFilters && activeTab === 'all' && (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-5 py-2 rounded-full border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* People Grid */}
          {isGridTab && !isGridLoading && displayedPeople.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayedPeople.map((person, index) => (
                <div key={person.id} ref={index === prefetchIndex ? loadMoreRef : undefined} className="min-w-0">
                  <PersonCard
                    person={person}
                    onConnectionChange={handleConnectionChange}
                    onProfileIntent={handleProfileIntent}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Load More Trigger */}
          {(isGridTab || isSearchResultsVisible) && activeGridHasMore && !isGridLoading && (
            <div className="flex justify-center py-8">
              {loadingMore ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <button
                  onClick={() => void loadMore()}
                  className="flex items-center gap-2 px-6 py-2 rounded-full border border-gray-300 dark:border-neutral-700 text-sm font-semibold text-gray-600 dark:text-neutral-400 hover:bg-white dark:hover:bg-neutral-900 hover:text-gray-800 dark:hover:text-neutral-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Load more
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile filter bottom sheet */}
      <AnimatePresence>
        {showMobileFilters && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileFilters(false)}
              className="lg:hidden fixed inset-0 z-50 bg-black/40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'tween', duration: 0.25, ease: 'easeOut' }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white dark:bg-neutral-900 shadow-2xl"
            >
              <div className="sticky top-0 bg-white dark:bg-neutral-900 px-5 pt-3 pb-2 border-b border-gray-100 dark:border-neutral-800">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-neutral-700" />
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Filters
                  </h2>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="p-2 -mr-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800"
                    aria-label="Close filters"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <FilterPanel {...filterPanelProps} />
              </div>
              <div className="sticky bottom-0 flex gap-3 border-t border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-5 py-2.5 rounded-full border border-gray-300 dark:border-neutral-700 text-sm font-semibold text-gray-700 dark:text-neutral-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Show {total.toLocaleString()} result{total !== 1 ? 's' : ''}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({
  Icon,
  label,
  onRemove,
}: {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-semibold">
      <Icon className="w-3.5 h-3.5" />
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/60"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export default FindPeople;
