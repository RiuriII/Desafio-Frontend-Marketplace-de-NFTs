import { createFileRoute } from '@tanstack/react-router'
import { HealthPage } from '@/app/pages/health-page'

export const Route = createFileRoute('/health')({ component: HealthPage })
