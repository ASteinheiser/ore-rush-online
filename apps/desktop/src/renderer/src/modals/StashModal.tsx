import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';

interface StashModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StashModal = ({ isOpen, onOpenChange }: StashModalProps) => {
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

        <div className="flex flex-col gap-6 px-2 pt-6 pb-4">
          <p className="font-title text-xl text-center text-muted-foreground">Stash UI coming soon...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
