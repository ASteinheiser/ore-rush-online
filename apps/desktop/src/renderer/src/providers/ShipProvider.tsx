import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from '@repo/client-auth/provider';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import type { Desktop_GetProfileShipsQuery, Desktop_GetProfileShipsQueryVariables } from '../graphql';

const SELECTED_SHIP_LOCAL_STORAGE_KEY = 'selected_ship_id';

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
  setSelectedShip: (shipId: string | null) => void;
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
  const [selectedShipId, setSelectedShipId] = useState<string | null>(() =>
    localStorage.getItem(SELECTED_SHIP_LOCAL_STORAGE_KEY)
  );

  const { data, loading, error, refetch } = useQuery<
    Desktop_GetProfileShipsQuery,
    Desktop_GetProfileShipsQueryVariables
  >(GET_PROFILE_SHIPS, {
    skip: !session?.access_token,
    context: { headers: { Authorization: session?.access_token } },
  });

  const ownedShips = data?.profile?.ships ?? [];
  const selectedShip = ownedShips.find((ship) => ship.id === selectedShipId) ?? null;

  const handleSetSelectedShip = (shipId: string | null) => {
    setSelectedShipId(shipId);

    if (shipId) {
      localStorage.setItem(SELECTED_SHIP_LOCAL_STORAGE_KEY, shipId);
    } else {
      localStorage.removeItem(SELECTED_SHIP_LOCAL_STORAGE_KEY);
    }
  };

  return (
    <ShipContext.Provider
      value={{
        selectedShip,
        setSelectedShip: handleSetSelectedShip,
        ownedShips,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </ShipContext.Provider>
  );
};
