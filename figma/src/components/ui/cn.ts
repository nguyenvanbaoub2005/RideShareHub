export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export type ForcedState = 'default' | 'hover' | 'focus'
