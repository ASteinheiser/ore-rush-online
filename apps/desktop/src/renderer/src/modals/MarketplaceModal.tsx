import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';

interface MarketplaceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MarketplaceModal = ({ isOpen, onOpenChange }: MarketplaceModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm w-full"
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="pt-2 font-pixel text-4xl text-muted-foreground">Marketplace</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 px-2 pt-6 pb-4">
          <p className="font-title text-xl text-center text-muted-foreground">Coming soon...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
