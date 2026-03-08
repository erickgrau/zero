import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@skippy/server/trpc';
import superjson from 'superjson';

const getUrl = () => import.meta.env.VITE_PUBLIC_BACKEND_URL + '/api/trpc';

export const api = createTRPCClient<AppRouter>({
    links: [
        httpBatchLink({
            maxItems: 1,
            url: getUrl(),
            transformer: superjson,
            fetch: (url, options) =>
                fetch(url, { ...options, credentials: 'include' }).then((res) => {
                    if (typeof window !== 'undefined') {
                        const currentPath = new URL(window.location.href).pathname;
                        const redirectPath = res.headers.get('X-Skippy-Redirect');
                        if (!!redirectPath && redirectPath !== currentPath) {
                            window.location.href = redirectPath;
                            res.headers.delete('X-Skippy-Redirect');
                        }
                    }
                    return res;
                }),
        }),
    ],
}); 