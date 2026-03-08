import type { Autumn } from 'autumn-js';
import type { Auth } from './lib/auth';
import type { SkippyEnv } from './env';

export type SessionUser = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>['user'];

export type HonoVariables = {
  auth: Auth;
  sessionUser?: SessionUser;
  autumn?: Autumn;
  traceId?: string;
  requestId?: string;
};

export type HonoContext = { Variables: HonoVariables; Bindings: SkippyEnv };
