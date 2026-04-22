import { makeApp } from './app.config';
import { authClient } from './auth/client';
import { prisma } from './repo/client';

export const server = makeApp({ authClient, prisma });
