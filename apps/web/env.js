import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
    server: {},

    /**
     * Client-side environment variables (must be prefixed with NEXT_PUBLIC_).
     */
    client: {
        NEXT_PUBLIC_API_URL: z
            .string()
            .url()
            .default('http://localhost:8000/trpc'),
        NEXT_PUBLIC_BASE_URL: z
            .string()
            .url()
            .default('http://localhost:8000'),
    },

    runtimeEnv: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
        NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
    },

    skipValidation: !!process.env.SKIP_ENV_VALIDATION,

    emptyStringAsUndefined: true,
})
