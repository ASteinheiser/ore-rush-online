import type { ContextFunction } from '@apollo/server';
import { type GoTrueAdminApi } from '@supabase/supabase-js';
import { ProfilesRepository } from '../repo/Profiles';
import { StashRepository } from '../repo/Stash';
import type { PrismaClient } from '../repo/prisma-client/client';
import { validateJwt, type User } from '../auth/jwt';

interface CreateContextArgs {
  authHeader?: string;
  authClient: GoTrueAdminApi;
  prisma: PrismaClient;
}

export interface Context {
  user: User | null;
  authClient: GoTrueAdminApi;
  dataSources: {
    profilesDb: ProfilesRepository;
    stashDb: StashRepository;
  };
}

export const createContext: ContextFunction<[CreateContextArgs], Context> = async ({
  authHeader,
  authClient,
  prisma,
}) => {
  const user = validateJwt(authHeader);

  return {
    user,
    authClient,
    dataSources: {
      profilesDb: new ProfilesRepository(prisma),
      stashDb: new StashRepository(prisma),
    },
  };
};
