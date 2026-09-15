import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';

interface HangarModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HangarModal = ({ isOpen, onOpenChange }: HangarModalProps) => {
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

        <div className="flex flex-col justify-center items-center gap-y-4 px-2 py-4">
          <p className="font-title text-xl text-muted-foreground">Coming soon...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
