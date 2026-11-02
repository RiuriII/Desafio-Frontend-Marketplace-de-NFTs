import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { healthSchema, readyEventSchema } from '@/contracts/health'
import { apiClient } from '@/lib/api-client'
import { createRealtimeClient } from '@/lib/realtime'
import { Button } from '@/components/ui/button'

export function HealthPage() {
  const [realtimeStatus, setRealtimeStatus] = useState('Conectando')
  const health = useQuery({
    queryKey: ['system', 'health'],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<unknown>('/health', { signal })
      return healthSchema.parse(response.data)
    },
  })

  useEffect(() => {
    const socket = createRealtimeClient()
    socket.on('connect', () => socket.emit('system.ping'))
    socket.on('system.ready', (event) => {
      setRealtimeStatus(readyEventSchema.safeParse(event).success ? 'Evento recebido' : 'Evento inválido')
    })
    socket.on('disconnect', () => setRealtimeStatus('Desconectado'))
    socket.on('connect_error', () => setRealtimeStatus('Falha de conexão'))
    socket.connect()
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [])

  return (
    <>
      <h1 className="text-3xl font-semibold">Diagnóstico da infraestrutura</h1>
      <p>Verificação técnica; esta página não faz parte do layout do marketplace.</p>
      <p role="status">API REST: {health.isPending ? 'Carregando' : health.isError ? 'Falha na consulta' : health.data.status}</p>
      <p role="status">Socket.IO: {realtimeStatus}</p>
      <Button onClick={() => void health.refetch()} disabled={health.isFetching}>Consultar novamente</Button>
    </>
  )
}
