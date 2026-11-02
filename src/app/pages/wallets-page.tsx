import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect } from '@/components/ui/native-select'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { MarketHeader } from '@/components/layout/market-header'
import { AccountSidebar } from '@/components/layout/account-sidebar'
import { apiErrorSchema, type User } from '@/contracts/auth'
import { walletInputSchema, walletTypeSchema, type Wallet, type WalletInput } from '@/contracts/commerce'
import { useSession } from '@/features/auth/queries'
import { readSessionToken } from '@/features/auth/session'
import { addWallet, connectWallet, disconnectWallet, editWallet, getWallets, removeWallet } from '@/features/commerce/api'

function errorMessage(error: unknown) { return isAxiosError(error) ? apiErrorSchema.safeParse(error.response?.data).data?.error.message ?? 'Falha de conexão. Tente novamente.' : 'Não foi possível salvar a carteira.' }

function WalletForm({ user, wallet, onSaved, onCancel }: { user: User; wallet?: Wallet; onSaved: () => void; onCancel: () => void }) {
  const client = useQueryClient()
  const token = readSessionToken()
  const form = useForm<WalletInput>({ resolver: zodResolver(walletInputSchema), defaultValues: {
    displayName: wallet?.displayName ?? user.name, label: wallet?.label ?? user.walletNickname,
    network: wallet?.network ?? 'Ethereum', profileName: wallet?.profileName ?? user.username,
    address: wallet?.address ?? '', secondaryAddress: wallet?.secondaryAddress ?? '',
    walletType: wallet?.walletType ?? 'MetaMask', referralCode: wallet?.referralCode ?? 'KURIO',
    email: wallet?.email ?? user.email, ensName: wallet?.ensName ?? user.ensName,
  } })
  const mutation = useMutation({ mutationFn: (input: WalletInput) => wallet ? editWallet(wallet.id, input) : addWallet(input), onSuccess: () => { void client.invalidateQueries({ queryKey: ['wallets', token] }); form.reset(); onSaved() }, onError: (error) => {
    const fields = isAxiosError(error) ? apiErrorSchema.safeParse(error.response?.data).data?.error.fieldErrors : undefined
    if (fields) for (const [field, description] of Object.entries(fields)) form.setError(field as keyof WalletInput, { type: 'server', message: description })
  } })
  const field = (name: keyof WalletInput, label: string, input: React.ReactNode) => <div className="account-field" key={name}><label htmlFor={`wallet-${name}`}>{label}</label>{input}{form.formState.errors[name] && <p id={`wallet-${name}-error`} role="alert" className="commerce-error">{form.formState.errors[name]?.message}</p>}</div>
  return <form className="account-wallet-form" onSubmit={form.handleSubmit((input) => mutation.mutate(input))} noValidate><div className="account-fields account-wallet-fields">
    {field('displayName', 'Nome de exibição *', <Input id="wallet-displayName" aria-invalid={Boolean(form.formState.errors.displayName)} {...form.register('displayName')} />)}
    {field('label', 'Apelido da carteira *', <Input id="wallet-label" aria-invalid={Boolean(form.formState.errors.label)} {...form.register('label')} />)}
    {field('network', 'Rede *', <NativeSelect id="wallet-network" aria-invalid={Boolean(form.formState.errors.network)} {...form.register('network')}><option value="Ethereum">Ethereum</option><option value="Polygon">Polygon</option><option value="Solana">Solana</option></NativeSelect>)}
    {field('profileName', 'Nome do perfil *', <Input id="wallet-profileName" aria-invalid={Boolean(form.formState.errors.profileName)} {...form.register('profileName')} />)}
    {field('address', 'Endereço da carteira *', <Input id="wallet-address" autoComplete="off" placeholder="Endereço 0x da carteira" aria-invalid={Boolean(form.formState.errors.address)} {...form.register('address')} />)}
    {field('secondaryAddress', 'ENS ou carteira secundária (opcional)', <Input id="wallet-secondaryAddress" placeholder="nome.eth ou endereço 0x" aria-invalid={Boolean(form.formState.errors.secondaryAddress)} {...form.register('secondaryAddress')} />)}
    {field('walletType', 'Tipo de carteira *', <NativeSelect id="wallet-walletType" aria-invalid={Boolean(form.formState.errors.walletType)} {...form.register('walletType')}>{walletTypeSchema.options.map((type) => <option key={type} value={type}>{type}</option>)}</NativeSelect>)}
    {field('referralCode', 'Código de indicação *', <Input id="wallet-referralCode" aria-invalid={Boolean(form.formState.errors.referralCode)} {...form.register('referralCode')} />)}
    {field('email', 'E-mail *', <Input id="wallet-email" type="email" autoComplete="email" aria-invalid={Boolean(form.formState.errors.email)} {...form.register('email')} />)}
    {field('ensName', 'Nome ENS *', <div className="account-ens-input"><span>.eth</span><Input id="wallet-ensName" aria-invalid={Boolean(form.formState.errors.ensName)} {...form.register('ensName')} /></div>)}
  </div>{mutation.isError && <p role="alert" className="commerce-error">{errorMessage(mutation.error)}</p>}<div className="account-form-actions"><Button variant="market" type="submit" className="account-primary" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : wallet ? 'Salvar alterações' : 'Salvar carteira'}</Button>{wallet && <Button variant="plain" type="button" className="account-text-button" onClick={onCancel}>Cancelar edição</Button>}</div></form>
}

export function WalletsPage() {
  const token = readSessionToken()
  const client = useQueryClient()
  const session = useSession()
  const wallets = useQuery({ queryKey: ['wallets', token], queryFn: ({ signal }) => getWallets(signal) })
  const [editing, setEditing] = useState<Wallet | null>(null)
  const [notice, setNotice] = useState('')
  const connect = useMutation({ mutationFn: connectWallet, onSuccess: () => { void client.invalidateQueries({ queryKey: ['wallets', token] }); setNotice('Carteira conectada.') } })
  const disconnect = useMutation({ mutationFn: disconnectWallet, onSuccess: () => { void client.invalidateQueries({ queryKey: ['wallets', token] }); setNotice('Carteira desconectada.') } })
  const remove = useMutation({ mutationFn: removeWallet, onSuccess: () => { void client.invalidateQueries({ queryKey: ['wallets', token] }); setNotice('Carteira removida.') } })
  return <><MarketHeader /><main className="market-container account-page account-layout"><AccountSidebar current="wallets" /><section className="account-content"><div className="account-content-heading"><div><h1>Carteira principal</h1><p>Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p></div><Button variant="plain" type="button" className="account-text-button" onClick={() => { setEditing(null); document.getElementById('wallet-label')?.focus() }}>Adicionar</Button></div>
    {session.isPending || wallets.isPending ? <div className="account-skeleton" aria-label="Carregando carteiras" /> : session.isError || wallets.isError || !session.data.user ? <div role="alert" className="account-panel"><p>Não foi possível carregar suas carteiras.</p><Button variant="plain" className="account-outline" onClick={() => { void session.refetch(); void wallets.refetch() }}>Tentar novamente</Button></div> : <><WalletForm key={editing?.id ?? `new-${session.data.user.version}`} user={session.data.user} wallet={editing ?? undefined} onSaved={() => { setEditing(null); setNotice('Carteira salva.') }} onCancel={() => setEditing(null)} />
      <section className="account-wallet-list" aria-labelledby="wallet-list-title"><div className="account-content-heading"><div><h2 id="wallet-list-title">Carteiras cadastradas</h2><p>{wallets.data.items.length ? 'Selecione uma carteira para usar no pagamento.' : 'Você ainda não adicionou uma carteira.'}</p></div></div><div className="account-wallet-cards">{wallets.data.items.map((wallet) => <article className="account-wallet-card" key={wallet.id}><div><strong>{wallet.label}</strong><span>{wallet.network}</span>{wallets.data.connectedId === wallet.id && <span className="account-connected">Conectada</span>}</div><p>{wallet.address}</p><div className="account-wallet-actions">{wallets.data.connectedId === wallet.id ? <Button variant="plain" type="button" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>Desconectar</Button> : <Button variant="plain" type="button" onClick={() => connect.mutate(wallet.id)} disabled={connect.isPending}>Conectar</Button>}<Button variant="plain" type="button" onClick={() => { setEditing(wallet); document.getElementById('wallet-label')?.focus() }}>Editar</Button><Button variant="plain" type="button" onClick={() => remove.mutate(wallet.id)} disabled={remove.isPending}>Remover</Button></div></article>)}</div></section>
      {notice && <p role="status" className="account-success">{notice}</p>}{(connect.isError || disconnect.isError || remove.isError) && <p role="alert" className="commerce-error">{errorMessage(connect.error ?? disconnect.error ?? remove.error)}</p>}
    </>}
    <Link className="account-text-button" to="/account/profile">Voltar ao perfil</Link></section></main></>
}
