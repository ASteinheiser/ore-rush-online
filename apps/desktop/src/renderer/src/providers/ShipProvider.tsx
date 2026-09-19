import { createContext, useContext, useState } from 'react';
import { useSession } from '@repo/client-auth/provider';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import type { Desktop_GetProfileShipsQuery, Desktop_GetProfileShipsQueryVariables } from '../graphql';

const GET_PROFILE_SHIPS = gql`
  query Desktop_GetProfileShips {
    profile {
      ships {
        id
        shipId
      }
    }
  }
`;

type OwnedShip = NonNullable<NonNullable<Desktop_GetProfileShipsQuery['profile']>['ships']>[number];

interface ShipContextType {
  selectedShip: OwnedShip | null;
  setSelectedShip: (ship: OwnedShip | null) => void;
  ownedShips: Array<OwnedShip>;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<unknown>;
}

const ShipContext = createContext<ShipContextType>({
  selectedShip: null,
  setSelectedShip: () => {},
  ownedShips: [],
  loading: false,
  error: undefined,
  refetch: () => Promise.resolve(),
});

export const useShip = () => {
  const context = useContext(ShipContext);
  if (!context) {
    throw new Error('useShip must be used within a ShipProvider');
  }
  return context;
};

export const ShipProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useSession();
  const [selectedShip, setSelectedShip] = useState<OwnedShip | null>(null);

  const { data, loading, error, refetch } = useQuery<
    Desktop_GetProfileShipsQuery,
    Desktop_GetProfileShipsQueryVariables
  >(GET_PROFILE_SHIPS, {
    skip: !session?.access_token,
    context: { headers: { Authorization: session?.access_token } },
  });

  const ownedShips = data?.profile?.ships ?? [];

  return (
    <ShipContext.Provider value={{ selectedShip, setSelectedShip, ownedShips, loading, error, refetch }}>
      {children}
    </ShipContext.Provider>
  );
};
