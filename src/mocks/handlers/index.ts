import { healthHandlers } from '@/mocks/handlers/health'
import { authHandlers } from '@/mocks/handlers/auth'
import { commerceHandlers } from '@/mocks/handlers/commerce'
import { nftHandlers } from '@/mocks/handlers/nfts'
import { socketHandlers } from '@/mocks/socket/handlers'

export const handlers = [...healthHandlers, ...authHandlers, ...commerceHandlers, ...nftHandlers, ...socketHandlers]
