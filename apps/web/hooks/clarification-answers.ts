'use client'

import type {
    RouterInputs,
    RouterOutputs,
    ServerRouter,
    TRPCClientErrorLike,
} from '@repo/trpc/client'

import { trpc } from '~/trpc/client'

export type SubmitClarificationAnswersInput =
    RouterInputs['featureRequest']['submitClarificationAnswers']
export type SubmitClarificationAnswersOutput =
    RouterOutputs['featureRequest']['submitClarificationAnswers']

/** Submit answers to AI clarification questions for a feature request */
export function useSubmitClarificationAnswers(options?: {
    onSuccess?: (data: SubmitClarificationAnswersOutput) => void
    onError?: (error: TRPCClientErrorLike<ServerRouter>) => void
}) {
    return trpc.featureRequest.submitClarificationAnswers.useMutation({
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    })
}
