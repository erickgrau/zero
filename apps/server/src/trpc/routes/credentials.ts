import { z } from 'zod';
import { router, privateProcedure } from '../trpc';
import { credentials } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { encryptText } from '../../lib/encryption';
import { createDb } from '../../db';
import { env } from '../../env';

// Which credentials we formally support in the UI
export const SUPPORTED_CREDENTIALS = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'GROQ_API_KEY',
    'VOYAGEAI_API_KEY',
    'LOCAL_LLM_URL', // technically not a secret, but good to store per-user if needed
] as const;

export const credentialsRouter = router({
    /**
     * Returns a list of supported credentials and whether the user has set them.
     * NEVER returns the actual decrypted secret values to the frontend.
     */
    list: privateProcedure.query(async ({ ctx }) => {
        const { db } = createDb((env as any).DATABASE_URL);
        const userCreds = await db.query.credentials.findMany({
            where: eq(credentials.userId, ctx.sessionUser.id),
            columns: {
                name: true,
            },
        });

        const setCredentialNames = new Set(userCreds.map((c) => c.name));

        return SUPPORTED_CREDENTIALS.map((name) => ({
            name,
            isSet: setCredentialNames.has(name),
        }));
    }),

    /**
     * Saves or updates a credential. Encrypts the value before storing.
     */
    save: privateProcedure
        .input(
            z.object({
                name: z.enum(SUPPORTED_CREDENTIALS),
                value: z.string().min(1, 'Value cannot be empty'),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const encryptedValue = await encryptText(input.value.trim());

            const { db } = createDb((env as any).DATABASE_URL);
            await db
                .insert(credentials)
                .values({
                    id: crypto.randomUUID(),
                    userId: ctx.sessionUser.id,
                    name: input.name,
                    value: encryptedValue,
                })
                .onConflictDoUpdate({
                    target: [credentials.userId, credentials.name],
                    set: {
                        value: encryptedValue,
                        updatedAt: new Date(),
                    },
                });

            return { success: true };
        }),

    /**
     * Deletes a credential.
     */
    delete: privateProcedure
        .input(
            z.object({
                name: z.enum(SUPPORTED_CREDENTIALS),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { db } = createDb((env as any).DATABASE_URL);
            await db
                .delete(credentials)
                .where(and(eq(credentials.userId, ctx.sessionUser.id), eq(credentials.name, input.name)));

            return { success: true };
        }),
});
