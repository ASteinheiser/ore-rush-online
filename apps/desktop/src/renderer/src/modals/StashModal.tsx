import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { ORE } from '@repo/core-game';
import { useSession } from '@repo/client-auth/provider';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import type { Desktop_GetProfileStashQuery, Desktop_GetProfileStashQueryVariables } from '../graphql';

const GET_PROFILE_STASH = gql`
  query Desktop_GetProfileStash {
    profile {
      stash {
        id
        quantity
      }
    }
  }
`;

interface StashModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const StashModal = ({ isOpen, onOpenChange }: StashModalProps) => {
  const { session } = useSession();

  const queryResult = useQuery<Desktop_GetProfileStashQuery, Desktop_GetProfileStashQueryVariables>(
    GET_PROFILE_STASH,
    { context: { headers: { Authorization: session?.access_token } } }
  );
  const stashItems = queryResult.data?.profile?.stash ?? [];

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
          {stashItems.length > 0 ? (
            stashItems.map((item) => (
              <div key={item.id} className="flex flex-row justify-between">
                <p className="font-title text-xl text-muted-foreground">
                  {Object.values(ORE).find(({ id }) => id === item.id)?.name}
                </p>
                <p className="font-label text-xl text-muted-foreground">{item.quantity}</p>
              </div>
            ))
          ) : (
            <p className="font-title text-xl text-center text-muted-foreground">Empty...</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
