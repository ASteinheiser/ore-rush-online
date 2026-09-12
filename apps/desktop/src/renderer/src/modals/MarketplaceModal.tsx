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
        className="max-w-lg w-full"
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="pt-2 font-pixel text-4xl text-muted-foreground">Marketplace</DialogTitle>
        </DialogHeader>

        <div className="flex flex-row flex-wrap justify-between gap-y-4 px-2 py-4">
          {Object.values(ORE).map((ore) => (
            <div key={ore.id} className="flex flex-col items-center gap-6">
              <OreItem oreId={ore.id} quantity={Infinity} />

              <div className="flex flex-row items-center gap-2">
                <span className="text-md font-pixel text-muted">BUY:</span>
                <Button size="icon">1</Button>
                <Button size="icon">10</Button>
              </div>
              <div className="flex flex-row items-center gap-2">
                <span className="text-md font-pixel text-muted">SELL:</span>
                <Button variant="secondary" size="icon">
                  1
                </Button>
                <Button variant="secondary" size="icon">
                  10
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
