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
  getSuggestions,
  getPeopleFromSameCollege,
  getFilterOptions,
  type PersonCard as PersonCardType,
  type PeopleFilters,
  type FilterOptions,
} from '@/lib/api/people';
import { useAuth } from '@/lib/auth/useAuth';
import { FIND_PEOPLE_STALE_TIME, queryKeys } from '@/lib/queryKeys';

type TabType = 'known' | 'all' | 'smart' | 'suggestions' | 'college' | 'nearby';

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
  const cachedInitialData = queryClient.getQueryData<{
    people: PersonCardType[];
    total: number;
    hasMore: boolean;
    suggestions: PersonCardType[];
    colleaguePeople: PersonCardType[];
  }>(queryKeys.findPeopleInitial());
  const cachedFilterOptions = queryClient.getQueryData<FilterOptions>(
    queryKeys.peopleFilterOptions()
  );
  const [activeTab, setActiveTab] = useState<TabType>(() => getActiveTabFromParam(tabParam));
  const [searchQuery, setSearchQuery] = useState('');
  const [people, setPeople] = useState<PersonCardType[]>(() => cachedInitialData?.people ?? []);
  const [suggestions, setSuggestions] = useState<PersonCardType[]>(
    () => cachedInitialData?.suggestions ?? []
  );
  const [colleaguePeople, setColleaguePeople] = useState<PersonCardType[]>(
    () => cachedInitialData?.colleaguePeople ?? []
  );
  const [loading, setLoading] = useState(() => !cachedInitialData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    () => cachedFilterOptions ?? null
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(() => cachedInitialData?.hasMore ?? true);
  const [total, setTotal] = useState(() => cachedInitialData?.total ?? 0);
  const [selectedCollege, setSelectedCollege] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [openToOpportunities, setOpenToOpportunities] = useState(false);
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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

  // Cached initial data - instant when navigating back from profile
  const { data: initialData, isLoading: initialLoading, isError: initialError, refetch: refetchInitial } = useQuery({
    queryKey: queryKeys.findPeopleInitial(),
    queryFn: async () => {
      const [allPeopleRes, suggestionsRes, collegeRes] = await Promise.all([
        getPeople({}, { page: 1, limit: 20 }),
        getSuggestions(10).catch(() => ({ suggestions: [] })),
        getPeopleFromSameCollege(10).catch(() => ({ people: [] })),
      ]);
      return {
        people: allPeopleRes.people,
        total: allPeopleRes.total,
        hasMore: allPeopleRes.hasMore,
        suggestions: suggestionsRes.suggestions,
        colleaguePeople: collegeRes.people,
      };
    },
    staleTime: FIND_PEOPLE_STALE_TIME,
    retry: 2,
  });

  const { data: filterOptionsData } = useQuery({
    queryKey: queryKeys.peopleFilterOptions(),
    queryFn: getFilterOptions,
    staleTime: FIND_PEOPLE_STALE_TIME,
  });

  // Sync cached data into local state when available (instant when navigating back)
  useEffect(() => {
    if (initialData) {
      setPeople(initialData.people);
      setTotal(initialData.total);
      setHasMore(initialData.hasMore);
      setSuggestions(initialData.suggestions);
      setColleaguePeople(initialData.colleaguePeople);
      setLoading(false);
    }
  }, [initialData]);

  // Show loading when fetching and no cached data; clear loading when query completes (success or error)
  useEffect(() => {
    if (!initialData && initialLoading) setLoading(true);
    if (!initialLoading) setLoading(false);
  }, [initialLoading, initialData]);

  useEffect(() => {
    if (filterOptionsData) {
      setFilterOptions(filterOptionsData);
    }
  }, [filterOptionsData]);

  // Open college tab when navigating from "See all from your campus"
  useEffect(() => {
    setActiveTab(getActiveTabFromParam(tabParam));
  }, [tabParam]);

  // Fetch on search / filter change; fall back to cached initial data when neither is set
  useEffect(() => {
    if (activeTab !== 'all') return;

    if (!debouncedSearchQuery && !hasActiveFilters) {
      if (initialData) {
        setPeople(initialData.people);
        setTotal(initialData.total);
        setHasMore(initialData.hasMore);
      }
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setPage(1);

    getPeople(
      { ...activeFilters, search: debouncedSearchQuery || undefined },
      { page: 1, limit: 20 }
    )
      .then((result) => {
        if (cancelled) return;
        setPeople(result.people);
        setTotal(result.total);
        setHasMore(result.hasMore);
      })
      .catch((error) => {
        console.error('Search failed:', error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, debouncedSearchQuery, activeFilters, hasActiveFilters, initialData]);

  // Clear filters
  const clearFilters = () => {
    setSelectedCollege('');
    setSelectedBranch('');
    setSelectedYear(undefined);
    setSelectedLocation('');
    setOpenToOpportunities(false);
  };

  // Load more people
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || activeTab !== 'all') return;

    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const result = await getPeople(
        { ...activeFilters, search: debouncedSearchQuery || undefined },
        { page: nextPage, limit: 20 }
      );

      setPeople(prev => [...prev, ...result.people]);
      setPage(nextPage);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeTab, activeFilters, debouncedSearchQuery, hasMore, loadingMore, page]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && activeTab === 'all') {
          loadMore();
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
  }, [activeTab, hasMore, loadMore, loadingMore, page]);

  // Handle connection status change
  const handleConnectionChange = (personId: string, newStatus: string) => {
    const normalizedStatus: PersonCardType['connectionStatus'] =
      newStatus === 'pending_sent' ||
      newStatus === 'pending_received' ||
      newStatus === 'connected'
        ? newStatus
        : 'none';

    // Update all lists
    const updateList = (list: PersonCardType[]) =>
      list.map(p =>
        p.id === personId ? { ...p, connectionStatus: normalizedStatus } : p
      );

    setPeople(updateList);
    setSuggestions(updateList);
    setColleaguePeople(updateList);
  };

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

  const isGridTab = activeTab === 'all' || activeTab === 'suggestions' || activeTab === 'college';
  const showSidebar = activeTab === 'all';

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
          <div className="flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Find People
              </h1>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-neutral-400">
                Grow your network — students, creators and builders
              </p>
            </div>
            {total > 0 && activeTab === 'all' && (
              <span className="hidden sm:block pb-1 text-sm text-gray-500 dark:text-neutral-400">
                {total.toLocaleString()} people
              </span>
            )}
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
              </div>

              {/* Mobile filter trigger */}
              <button
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
              </button>
            </div>
          )}

          {/* Tabs — underline style */}
          <nav className="mt-3 -mb-px flex gap-1 overflow-x-auto scrollbar-hide" aria-label="Find people tabs">
            {tabItems.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
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
          </nav>
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
          {/* Active filter chips + result count */}
          {activeTab === 'all' && (hasActiveFilters || debouncedSearchQuery) && !loading && (
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
          {isGridTab && loading && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <PersonCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {isGridTab && !loading && initialError && (
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

          {/* Empty State */}
          {isGridTab && !loading && !initialError && displayedPeople.length === 0 && (
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
          {isGridTab && !loading && displayedPeople.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {displayedPeople.map((person) => (
                <PersonCard
                  key={person.id}
                  person={person}
                  onConnectionChange={handleConnectionChange}
                />
              ))}
            </div>
          )}

          {/* Load More Trigger */}
          {activeTab === 'all' && hasMore && !loading && (
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {loadingMore ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              ) : (
                <button
                  onClick={loadMore}
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
