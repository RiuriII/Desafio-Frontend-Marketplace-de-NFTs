import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { Heart } from 'lucide-react'
import { MarketHeader } from '@/components/layout/market-header'
import { AccountSidebar } from '@/components/layout/account-sidebar'
import { NftCard } from '@/components/shared/nft-card'
import { apiErrorSchema, passwordChangeSchema, profileInputSchema, type PasswordChangeInput, type ProfileInput, type User } from '@/contracts/auth'
import { changePassword, getProfile, saveProfile } from '@/features/auth/api'
import { readSessionToken } from '@/features/auth/session'
import { getFavorites } from '@/features/favorites/api'
import { FavoriteButton } from '@/features/favorites/favorite-button'

function errorMessage(error: unknown) {
  return isAxiosError(error) ? apiErrorSchema.safeParse(error.response?.data).data?.error.message ?? 'Falha de conexão. Tente novamente.' : 'Não foi possível salvar.'
}

function ProfileEditor({ user }: { user: User }) {
  const token = readSessionToken()
  const client = useQueryClient()
  const [avatarError, setAvatarError] = useState('')
  const [saved, setSaved] = useState(false)
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileInputSchema), defaultValues: {
    name: user.name, username: user.username, email: user.email, ensName: user.ensName,
    walletNickname: user.walletNickname, avatar: user.avatar,
  } })
  const avatar = useWatch({ control: form.control, name: 'avatar' })
  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (result) => {
      client.setQueryData(['profile', token], result)
      void client.invalidateQueries({ queryKey: ['auth', 'session'] })
      setSaved(true)
    },
    onError: (error) => {
      const fields = isAxiosError(error) ? apiErrorSchema.safeParse(error.response?.data).data?.error.fieldErrors : undefined
      if (fields) for (const [field, description] of Object.entries(fields)) form.setError(field as keyof ProfileInput, { type: 'server', message: description })
    },
  })
  const chooseAvatar = (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1_000_000) {
      setAvatarError('Use PNG, JPEG ou WebP de até 1 MB.')
      return
    }
    setAvatarError('')
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        form.setValue('avatar', reader.result, { shouldDirty: true, shouldValidate: true })
        setSaved(false)
      }
    }
    reader.onerror = () => setAvatarError('Não foi possível ler a imagem.')
    reader.readAsDataURL(file)
  }
  const field = (name: 'name' | 'username' | 'email' | 'walletNickname', label: string, type = 'text') => <div className="account-field">
    <label htmlFor={`profile-${name}`}>{label}</label>
    <Input id={`profile-${name}`} type={type} aria-invalid={Boolean(form.formState.errors[name])} {...form.register(name)} />
    {form.formState.errors[name] && <p role="alert" className="commerce-error">{form.formState.errors[name]?.message}</p>}
  </div>
  return <form className="account-profile-form" onSubmit={form.handleSubmit((input) => mutation.mutate(input))} noValidate>
    <h1>Perfil do colecionador</h1>
    <div className="account-fields">
      {field('name', 'Nome de exibição *')}
      {field('username', 'Nome de usuário *')}
      {field('email', 'E-mail *', 'email')}
      <div className="account-field"><label htmlFor="profile-ensName">Nome ENS *</label><div className="account-ens-input"><span>.eth</span><Input id="profile-ensName" aria-invalid={Boolean(form.formState.errors.ensName)} {...form.register('ensName')} /></div>{form.formState.errors.ensName && <p role="alert" className="commerce-error">{form.formState.errors.ensName.message}</p>}</div>
      {field('walletNickname', 'Apelido da carteira *')}
      <div className="account-field account-avatar-field"><span>Avatar</span><div className="account-avatar-row"><div className="account-avatar">{avatar ? <img src={avatar} alt={`Avatar de ${user.name}`} /> : <span aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span>}</div><div><label className="account-file-button" htmlFor="profile-avatar">Alterar</label><Input id="profile-avatar" className="account-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} /><Button variant="plain" type="button" className="account-text-button" onClick={() => { form.setValue('avatar', null, { shouldDirty: true }); setSaved(false) }}>Remover</Button></div></div>{avatarError && <p role="alert" className="commerce-error">{avatarError}</p>}</div>
    </div>
    {mutation.isError && <p role="alert" className="commerce-error">{errorMessage(mutation.error)}</p>}
    {saved && <p role="status" className="account-success">Perfil salvo.</p>}
    <Button variant="market" className="account-primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Salvando…' : 'Salvar perfil'}</Button>
  </form>
}

function PasswordEditor() {
  const [saved, setSaved] = useState(false)
  const form = useForm<PasswordChangeInput>({ resolver: zodResolver(passwordChangeSchema) })
  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { form.reset(); setSaved(true) },
    onError: (error) => {
      const fields = isAxiosError(error) ? apiErrorSchema.safeParse(error.response?.data).data?.error.fieldErrors : undefined
      if (fields?.currentPassword) form.setError('currentPassword', { type: 'server', message: fields.currentPassword })
    },
  })
  const fields: { name: keyof PasswordChangeInput; label: string; autoComplete: string }[] = [
    { name: 'currentPassword', label: 'Senha atual *', autoComplete: 'current-password' },
    { name: 'newPassword', label: 'Nova senha *', autoComplete: 'new-password' },
    { name: 'confirmPassword', label: 'Confirmar nova senha *', autoComplete: 'new-password' },
  ]
  return <form className="account-password-form" onSubmit={form.handleSubmit((input) => mutation.mutate(input))} noValidate>
    <h2>Alterar senha</h2><div className="account-fields">{fields.map(({ name, label, autoComplete }) => <div className="account-field" key={name}><label htmlFor={name}>{label}</label><Input id={name} type="password" autoComplete={autoComplete} aria-invalid={Boolean(form.formState.errors[name])} {...form.register(name)} />{form.formState.errors[name] && <p role="alert" className="commerce-error">{form.formState.errors[name]?.message}</p>}</div>)}</div>
    {mutation.isError && !form.formState.errors.currentPassword && <p role="alert" className="commerce-error">{errorMessage(mutation.error)}</p>}{saved && <p role="status" className="account-success">Senha alterada.</p>}
    <Button variant="market" className="account-primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Atualizando…' : 'Alterar senha'}</Button>
  </form>
}

export function ProfilePage() {
  const token = readSessionToken()
  const profile = useQuery({ queryKey: ['profile', token], queryFn: ({ signal }) => getProfile(signal) })
  const favorites = useQuery({ queryKey: ['favorites', token], queryFn: ({ signal }) => getFavorites(signal) })
  return <><MarketHeader /><main className="market-container account-page account-layout"><AccountSidebar current="profile" /><section className="account-content">
    {profile.isPending ? <div className="account-skeleton" aria-label="Carregando perfil" /> : profile.isError ? <div role="alert" className="account-panel"><p>Não foi possível carregar o perfil.</p><Button variant="plain" className="account-outline" onClick={() => void profile.refetch()}>Tentar novamente</Button></div> : <><ProfileEditor user={profile.data} /><PasswordEditor /></>}
    <section className="account-favorites" id="favorites" aria-labelledby="favorites-title"><div className="account-section-title"><Heart size={20} /><h2 id="favorites-title">Lista de interesse</h2></div>{favorites.isPending ? <p role="status">Carregando favoritos…</p> : favorites.isError ? <p role="alert">Não foi possível carregar favoritos. <Button variant="plain" onClick={() => void favorites.refetch()}>Tentar novamente</Button></p> : favorites.data.items.length === 0 ? <p>Nenhum NFT favoritado ainda. <Link to="/" search={{ q: '', sort: 'recent', tab: 'all', page: 1 }}>Explore o mercado.</Link></p> : <div className="account-favorites-grid">{favorites.data.items.map((nft) => <div key={nft.id}><NftCard nft={nft} /><FavoriteButton nft={nft} /></div>)}</div>}</section>
  </section></main></>
}
