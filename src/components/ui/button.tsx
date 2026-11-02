import type { ComponentProps } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90',
        outline: 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
        market: 'inline-flex items-center justify-center gap-2 rounded-[5px] font-bold transition-colors bg-primary text-primary-foreground hover:bg-[#e89b55]',
        marketOutline: 'inline-flex items-center justify-center gap-2 rounded-[5px] font-bold transition-colors border border-primary bg-transparent text-[#e89b55] hover:bg-accent',
        marketGhost: 'inline-flex items-center justify-center gap-2 transition-colors bg-transparent text-[#e89b55] hover:bg-accent',
        plain: '',
      },
      size: { default: '', sm: 'h-9 px-3', icon: 'size-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

// shadcn/ui composition with the Kurio palette and layout-preserving plain variant.
export function Button({ className, variant, size, asChild = false, ...props }:
  ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button'
  return <Component data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
