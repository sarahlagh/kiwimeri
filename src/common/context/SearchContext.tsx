import { createContext, Dispatch, useContext } from 'react';

interface SearchContextSpec {
  searchText?: string | null;
  setSearchText: Dispatch<React.SetStateAction<string | null | undefined>>;
}

const SearchContext = createContext<SearchContextSpec | undefined>(undefined);

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearchContext must be used within a SearchProvider');
  }
  return context;
};

export default SearchContext;
