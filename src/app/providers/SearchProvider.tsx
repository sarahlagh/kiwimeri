import SearchContext from '@/common/context/SearchContext';
import { ReactNode, useState } from 'react';

type SearchProviderProps = {
  readonly children?: ReactNode;
};

export const SearchProvider = ({ children }: SearchProviderProps) => {
  const [searchText, setSearchText] = useState<string | null>();

  return (
    <SearchContext.Provider value={{ searchText, setSearchText }}>
      {children}
    </SearchContext.Provider>
  );
};
