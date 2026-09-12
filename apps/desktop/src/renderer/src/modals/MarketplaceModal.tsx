import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { ORE } from '@repo/core-game';
import { OreItem } from '../components/OreItem';

interface MarketplaceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MarketplaceModal = ({ isOpen, onOpenChange }: MarketplaceModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md w-full"
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="pt-2 font-pixel text-4xl text-muted-foreground">Marketplace</DialogTitle>
        </DialogHeader>

        <div className="flex flex-row flex-wrap gap-y-4 gap-x-11 px-2 py-4">
          {Object.values(ORE).map((ore) => (
            <div key={ore.id} className="flex flex-col items-center gap-6">
              <OreItem oreId={ore.id} quantity={Infinity} />

              <div className="flex flex-row">
                <Button variant="outline" size="sm">
                  Sell
                </Button>
                <Button variant="outline" size="sm">
                  Buy
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
