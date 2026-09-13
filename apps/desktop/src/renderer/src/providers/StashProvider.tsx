import { createContext, useContext } from 'react';
import { useSession } from '@repo/client-auth/provider';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import type { Desktop_GetProfileStashQuery, Desktop_GetProfileStashQueryVariables } from '../graphql';

const GET_PROFILE_STASH = gql`
  query Desktop_GetProfileStash {
    profile {
      coins
      stash {
        id
        quantity
      }
    }
  }
`;

type StashItem = NonNullable<NonNullable<Desktop_GetProfileStashQuery['profile']>['stash']>[number];

interface StashContextType {
  coins: number;
  stashItems: Array<StashItem>;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<unknown>;
}

const StashContext = createContext<StashContextType>({
  coins: 0,
  stashItems: [],
  loading: false,
  error: undefined,
  refetch: () => Promise.resolve(),
});

export const useStash = () => {
  const context = useContext(StashContext);
  if (!context) {
    throw new Error('useStash must be used within a StashProvider');
  }
  return context;
};

export const StashProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useSession();

  const { data, loading, error, refetch } = useQuery<
    Desktop_GetProfileStashQuery,
    Desktop_GetProfileStashQueryVariables
  >(GET_PROFILE_STASH, {
    skip: !session?.access_token,
    context: { headers: { Authorization: session?.access_token } },
  });

  const stashItems = data?.profile?.stash ?? [];
  const coins = data?.profile?.coins ?? 0;

  return (
    <StashContext.Provider value={{ coins, stashItems, loading, error, refetch }}>
      {children}
    </StashContext.Provider>
  );
};
