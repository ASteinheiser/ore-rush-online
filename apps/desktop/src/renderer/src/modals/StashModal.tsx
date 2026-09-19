import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { useStash } from '../providers/StashProvider';
import { OreItem } from '../components/OreItem';

interface StashModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StashModal = ({ isOpen, onOpenChange }: StashModalProps) => {
  const { stashItems } = useStash();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm w-full"
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="pt-2 font-pixel text-4xl text-muted-foreground">Stash</DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-row flex-wrap justify-between gap-y-4 px-2 py-4">
          {stashItems.length > 0 ? (
            stashItems.map((item) => <OreItem key={item.id} oreId={item.id} quantity={item.quantity} />)
          ) : (
            <div className="flex-1 flex-col justify-center text-center font-title text-xl text-muted-foreground">
              <p className="pb-2">Nothing here...</p>
              <p>Time to hit the mines!</p>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
};
