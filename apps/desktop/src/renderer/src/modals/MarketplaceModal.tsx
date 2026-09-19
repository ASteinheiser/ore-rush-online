import { Button, Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle, toast } from '@repo/ui';
import { ORE } from '@repo/core-game';
import { OreItem } from '../components/OreItem';
import { useStash } from '../providers/StashProvider';
import { useSession } from '@repo/client-auth/provider';
import { gql } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import type {
  Desktop_BuyItemMutation,
  Desktop_BuyItemMutationVariables,
  Desktop_SellItemMutation,
  Desktop_SellItemMutationVariables,
} from '../graphql';

const BUY_ITEM = gql`
  mutation Desktop_BuyItem($itemId: String!, $quantity: Int!) {
    buyItem(itemId: $itemId, quantity: $quantity) {
      coins
    }
  }
`;

const SELL_ITEM = gql`
  mutation Desktop_SellItem($itemId: String!, $quantity: Int!) {
    sellItem(itemId: $itemId, quantity: $quantity) {
      coins
    }
  }
`;

interface MarketplaceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MarketplaceModal = ({ isOpen, onOpenChange }: MarketplaceModalProps) => {
  const { stashItems, refetch: refetchStash } = useStash();

  const { session } = useSession();
  const authHeaders = { headers: { Authorization: session?.access_token } };

  const [buyItem, { loading: isBuying }] = useMutation<
    Desktop_BuyItemMutation,
    Desktop_BuyItemMutationVariables
  >(BUY_ITEM, { context: authHeaders });

  const [sellItem, { loading: isSelling }] = useMutation<
    Desktop_SellItemMutation,
    Desktop_SellItemMutationVariables
  >(SELL_ITEM, { context: authHeaders });

  const loading = isBuying || isSelling;

  const handleBuyItem = async (itemId: string, quantity: number) => {
    try {
      await buyItem({ variables: { itemId, quantity } });
      await refetchStash();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSellItem = async (itemId: string, quantity: number) => {
    try {
      await sellItem({ variables: { itemId, quantity } });
      await refetchStash();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg w-full"
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="pt-2 font-pixel text-4xl text-muted-foreground">Marketplace</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-row flex-wrap justify-between gap-y-4 px-2 py-4">
          {Object.values(ORE).map((ore) => (
            <div key={ore.id} className="flex flex-col items-center gap-6">
              <OreItem oreId={ore.id} quantity={Infinity} />

              <div className="flex flex-row items-center gap-2">
                <span className="text-md font-pixel text-muted">BUY:</span>

                <Button size="icon" disabled={loading} onClick={() => handleBuyItem(ore.id, 1)}>
                  1
                </Button>
                <Button size="icon" disabled={loading} onClick={() => handleBuyItem(ore.id, 10)}>
                  10
                </Button>
              </div>

              <div className="flex flex-row items-center gap-2">
                <span className="text-md font-pixel text-muted">SELL:</span>

                <Button
                  variant="secondary"
                  size="icon"
                  disabled={loading}
                  onClick={() => handleSellItem(ore.id, 1)}
                >
                  1
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  disabled={loading}
                  onClick={() => handleSellItem(ore.id, 10)}
                >
                  10
                </Button>
              </div>

              <div className="flex flex-row items-center gap-2">
                <span className="text-lg font-pixel text-muted">In Stash:</span>
                <span className="text-xl font-label text-muted-foreground">
                  {stashItems.find((item) => item.id === ore.id)?.quantity ?? 0}
                </span>
              </div>
            </div>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
