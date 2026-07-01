'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type {
    RouterInputs,
    RouterOutputs,
    ServerRouter,
    TRPCClientErrorLike,
} from '@repo/trpc/client'

import { useAuth } from '~/providers/auth'
import { trpc } from '~/trpc/client'

/** Mirrors submitFeatureRequestMutationInputSchema on the server */
const newFeatureFormSchema = z.object({
    title: z
        .string()
        .trim()
        .min(3, 'Title must be at least 3 characters')
        .max(255),
    description: z
        .string()
        .trim()
        .min(10, 'Description must be at least 10 characters'),
    customerEmail: z
        .string()
        .trim()
        .refine(
            (val) => val === '' || z.email().safeParse(val).success,
            'Enter a valid email'
        ),
    customerName: z.string().trim().max(255),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    deadline: z.date().optional(),
})

export type NewFeatureFormInput = z.input<typeof newFeatureFormSchema>
export type NewFeatureFormValues = z.output<typeof newFeatureFormSchema>
export type SubmitNewFeatureRequestInput =
    RouterInputs['featureRequest']['submitNewFeatureRequest']
export type SubmitNewFeatureRequestOutput =
    RouterOutputs['featureRequest']['submitNewFeatureRequest']

function useNewFeatureEnabled() {
    const { isAuthenticated, isPending } = useAuth()
    return isAuthenticated && !isPending
}

/** Submit a new feature request */
export function useSubmitNewFeatureRequest() {
    return trpc.featureRequest.submitNewFeatureRequest.useMutation()
}

/** Form state + submit wired to the mutation */
export function useNewFeatureForm(options?: {
    onSuccess?: (data: SubmitNewFeatureRequestOutput) => void
    onError?: (error: TRPCClientErrorLike<ServerRouter>) => void
}) {
    const enabled = useNewFeatureEnabled()
    const submit = useSubmitNewFeatureRequest()

    const form = useForm<NewFeatureFormInput, unknown, NewFeatureFormValues>({
        resolver: zodResolver(newFeatureFormSchema),
        defaultValues: {
            title: '',
            description: '',
            customerEmail: '',
            customerName: '',
            priority: 'MEDIUM',
        },
    })

    const onSubmit = form.handleSubmit((values) => {
        if (!enabled) return

        const input: SubmitNewFeatureRequestInput = {
            title: values.title,
            description: values.description,
            source: 'form',
            priority: values.priority,
            ...(values.customerEmail
                ? { customerEmail: values.customerEmail }
                : {}),
            ...(values.customerName
                ? { customerName: values.customerName }
                : {}),
            ...(values.deadline ? { deadline: values.deadline } : {}),
        }

        submit.mutate(input, {
            onSuccess: options?.onSuccess,
            onError: options?.onError,
        })
    })

    return {
        form,
        onSubmit,
        submit,
        isSubmitting: submit.isPending,
        isReady: enabled,
    }
}

/** Convenience bundle for pages */
export function useNewFeature() {
    const submit = useSubmitNewFeatureRequest()

    return {
        submit,
        isSubmitting: submit.isPending,
    }
}
