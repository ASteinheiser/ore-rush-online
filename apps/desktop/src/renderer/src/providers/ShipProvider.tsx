import { createContext, useContext } from 'react';
import { useSession } from '@repo/client-auth/provider';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import type {
  Desktop_GetProfileShipsQuery,
  Desktop_GetProfileShipsQueryVariables,
  Desktop_SelectShipMutation,
  Desktop_SelectShipMutationVariables,
} from '../graphql';

const GET_PROFILE_SHIPS = gql`
  query Desktop_GetProfileShips {
    profile {
      selectedShipId
      ships {
        id
        shipId
      }
    }
  }
`;

const SELECT_SHIP = gql`
  mutation Desktop_SelectShip($shipId: String!) {
    selectShip(shipId: $shipId) {
      selectedShipId
    }
  }
`;

type OwnedShip = NonNullable<NonNullable<Desktop_GetProfileShipsQuery['profile']>['ships']>[number];

interface ShipContextType {
  selectedShip: OwnedShip | null;
  setSelectedShip: (shipId: string) => Promise<void>;
  ownedShips: Array<OwnedShip>;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<unknown>;
}

const ShipContext = createContext<ShipContextType>({
  selectedShip: null,
  setSelectedShip: () => Promise.resolve(),
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
  const authHeaders = { headers: { Authorization: session?.access_token } };

  const { data, loading, error, refetch } = useQuery<
    Desktop_GetProfileShipsQuery,
    Desktop_GetProfileShipsQueryVariables
  >(GET_PROFILE_SHIPS, {
    skip: !session?.access_token,
    context: authHeaders,
  });

  const [selectShip, { loading: isSelecting }] = useMutation<
    Desktop_SelectShipMutation,
    Desktop_SelectShipMutationVariables
  >(SELECT_SHIP, { context: authHeaders });

  const ownedShips = data?.profile?.ships ?? [];
  const selectedShipId = data?.profile?.selectedShipId ?? null;
  const selectedShip = ownedShips.find((ship) => ship.id === selectedShipId) ?? null;

  const setSelectedShip = async (shipId: string) => {
    await selectShip({ variables: { shipId } });
    await refetch();
  };

  return (
    <ShipContext.Provider
      value={{
        selectedShip,
        setSelectedShip,
        ownedShips,
        loading: loading || isSelecting,
        error,
        refetch,
      }}
    >
      {children}
    </ShipContext.Provider>
  );
};
