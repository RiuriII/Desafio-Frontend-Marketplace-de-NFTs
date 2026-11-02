import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/app/pages/home-page'
import { catalogSearchSchema } from '@/contracts/nft'

export const Route = createFileRoute('/')({ validateSearch: (search) => catalogSearchSchema.parse(search), component: HomePage })
