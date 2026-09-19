import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, toast } from '@repo/ui';
import { ORE, SHIPS } from '@repo/core-game';
import { useSession } from '@repo/client-auth/provider';
import { gql } from '@apollo/client';
import { useMutation, useQuery } from '@apollo/client/react';
import type {
  Desktop_BuyShipMutation,
  Desktop_BuyShipMutationVariables,
  Desktop_GetProfileShipsQuery,
  Desktop_GetProfileShipsQueryVariables,
} from '../graphql';
import { useStash } from '../providers/StashProvider';

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

const BUY_SHIP = gql`
  mutation Desktop_BuyShip($shipId: String!) {
    buyShip(shipId: $shipId) {
      id
      shipId
    }
  }
`;

const FREE_SHIP = SHIPS.find((ship) => ship.price === null)!;
const BUYABLE_SHIPS = SHIPS.filter((ship) => ship.price !== null);

const formatPrice = (price: { type: string; amount: number }) => {
  if (price.type === 'coins') {
    return `${price.amount} coins`;
  }

  const ore = Object.values(ORE).find((o) => o.id === price.type);
  return `${price.amount} ${ore?.name ?? price.type}`;
};

interface HangarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HangarModal = ({ isOpen, onOpenChange }: HangarModalProps) => {
  const { session } = useSession();
  const { refetch: refetchStash } = useStash();
  const authHeaders = { headers: { Authorization: session?.access_token } };

  const {
    data,
    loading: isLoadingShips,
    refetch: refetchShips,
  } = useQuery<Desktop_GetProfileShipsQuery, Desktop_GetProfileShipsQueryVariables>(GET_PROFILE_SHIPS, {
    skip: !isOpen || !session?.access_token,
    context: authHeaders,
  });

  const [buyShip, { loading: isBuying }] = useMutation<
    Desktop_BuyShipMutation,
    Desktop_BuyShipMutationVariables
  >(BUY_SHIP, { context: authHeaders });

  const ownedShips = data?.profile?.ships ?? [];
  const loading = isLoadingShips || isBuying;

  const handleBuyShip = async (shipId: string) => {
    try {
      await buyShip({ variables: { shipId } });
      await Promise.all([refetchShips(), refetchStash()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm w-full"
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="pt-2 font-pixel text-4xl text-muted-foreground">Hangar</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-y-6">
          <section className="flex flex-col gap-y-3">
            <h3 className="font-pixel text-2xl text-muted">Ships You Own</h3>

            {isLoadingShips ? (
              <p className="font-title text-xl text-muted-foreground">Loading...</p>
            ) : ownedShips.length === 0 ? (
              <Button disabled={loading} onClick={() => handleBuyShip(FREE_SHIP.id)}>
                Claim Free Ship
              </Button>
            ) : (
              <ul className="flex flex-col gap-y-2">
                {ownedShips.map((ship) => (
                  <li
                    key={ship.id}
                    className="font-title text-xl text-muted-foreground flex items-center border border-secondary rounded-xl py-2 px-4"
                  >
                    {SHIPS.find((s) => s.id === ship.shipId)?.name}
                    <span className="text-sm text-muted ml-2">({ship.id.slice(-4)})</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex flex-col gap-y-3">
            <h3 className="font-pixel text-2xl text-muted">Buy Ships</h3>

            <ul className="flex flex-col gap-y-3">
              {BUYABLE_SHIPS.map((ship, index) => (
                <>
                  <li key={ship.id} className="flex flex-row items-center justify-between gap-x-3 px-2">
                    <div className="flex flex-col">
                      <span className="font-title text-xl text-muted-foreground">{ship.name}</span>
                      <span className="font-pixel text-md text-muted">{formatPrice(ship.price)}</span>
                    </div>

                    <Button size="sm" disabled={loading} onClick={() => handleBuyShip(ship.id)}>
                      Buy
                    </Button>
                  </li>
                  {index !== BUYABLE_SHIPS.length - 1 && <div className="h-px w-4/5 bg-secondary mx-auto" />}
                </>
              ))}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
