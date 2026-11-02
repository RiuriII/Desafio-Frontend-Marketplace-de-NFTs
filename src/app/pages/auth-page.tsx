import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { Eye } from 'lucide-react'
import { loginSchema, registerSchema, apiErrorSchema, type LoginInput, type RegisterInput } from '@/contracts/auth'
import { AuthBackdrop } from '@/components/layout/auth-backdrop'
import { AuthSocial } from '@/components/shared/auth-social'
import { login, register } from '@/features/auth/api'
import { writeSessionToken } from '@/features/auth/session'

const homeSearch = { q: '', sort: 'recent' as const, tab: 'all' as const, page: 1 }

function AuthShell({ mode, redirectPath, children }: { mode: 'login' | 'register'; redirectPath?: string; children: ReactNode }) {
  return <div className={`auth-page auth-${mode}`}><AuthBackdrop /><main className="auth-overlay"><section className="auth-card" aria-labelledby="auth-title">
    <Link to="/" search={homeSearch} className="auth-close" aria-label="Voltar ao início"><img src="/icons/auth-close.svg" alt="" /></Link>
    <div className="auth-mobile-logo"><Link to="/" search={homeSearch}>KURIO</Link></div>
    <nav className="auth-tabs" aria-label="Autenticação"><Link to="/login" search={{ redirect: redirectPath }} aria-current={mode === 'login' ? 'page' : undefined}>Entrar</Link><span aria-hidden="true" /><Link to="/register" search={{ redirect: redirectPath }} aria-current={mode === 'register' ? 'page' : undefined}>Criar conta</Link></nav>
    <p className="auth-intro">{mode === 'login' ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.' : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}</p>
    <h1 id="auth-title">{mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}</h1>
    {children}
    <AuthSocial />
    <p className="auth-switch">{mode === 'login' ? <>Novo na Kurio? <Link to="/register" search={{ redirect: redirectPath }}>Crie uma conta</Link></> : <>Já tem uma conta? <Link to="/login" search={{ redirect: redirectPath }}>Entre</Link></>}</p>
  </section></main></div>
}

function FieldError({ id, message }: { id: string; message?: string }) { return message ? <span id={id} className="field-error" role="alert">{message}</span> : null }

function PasswordField({ id, label, placeholder, registration, error }: { id: string; label: string; placeholder: string; registration: ReturnType<ReturnType<typeof useForm>['register']>; error?: string }) {
  const [visible, setVisible] = useState(false)
  return <div className="auth-field"><label htmlFor={id}>{label}</label><div className="password-wrap"><Input id={id} type={visible ? 'text' : 'password'} placeholder={placeholder} autoComplete={id === 'login-password' ? 'current-password' : 'new-password'} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...registration} /><Button variant="plain" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <Eye size={18} /> : <img src="/icons/auth-hide.svg" alt="" />}</Button></div><FieldError id={`${id}-error`} message={error} /></div>
}

function finishAuth(token: string, redirectPath?: string) {
  writeSessionToken(token)
  if (redirectPath) {
    const url = new URL(redirectPath, window.location.origin)
    if (url.origin === window.location.origin) { window.location.assign(url.pathname + url.search + url.hash); return }
  }
  window.location.assign('/account/profile')
}

function apiMessage(error: unknown) {
  if (isAxiosError(error)) return apiErrorSchema.safeParse(error.response?.data).data?.error.message ?? 'Falha de conexão. Tente novamente.'
  return 'Não foi possível continuar. Tente novamente.'
}

export function LoginPage({ redirectPath }: { redirectPath?: string }) {
  const form = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })
  const mutation = useMutation({ mutationFn: login, onSuccess: (result) => finishAuth(result.token, redirectPath) })
  return <AuthShell mode="login" redirectPath={redirectPath}><form className="auth-form" onSubmit={form.handleSubmit((data) => mutation.mutate(data))} noValidate>
    <div className="auth-fields"><div className="auth-field"><label htmlFor="login-email">E-mail</label><Input id="login-email" type="email" autoComplete="email" placeholder="contato@email.com" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? 'login-email-error' : undefined} {...form.register('email')} /><FieldError id="login-email-error" message={form.formState.errors.email?.message} /></div>
      <PasswordField id="login-password" label="Senha" placeholder="•••••••••••" registration={form.register('password')} error={form.formState.errors.password?.message} />
      <Button variant="plain" className="auth-forgot" type="button" disabled title="Recuperação de senha indisponível nesta demonstração">Esqueceu a senha?</Button>
    </div>
    {mutation.isError && <p role="alert" className="auth-error">{apiMessage(mutation.error)}</p>}
    <Button variant="market" className="auth-submit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Entrando…' : 'Entrar'}</Button>
  </form></AuthShell>
}

export function RegisterPage({ redirectPath }: { redirectPath?: string }) {
  const form = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })
  const mutation = useMutation({ mutationFn: register, onSuccess: (result) => finishAuth(result.token, redirectPath) })
  return <AuthShell mode="register" redirectPath={redirectPath}><form className="auth-form" onSubmit={form.handleSubmit((data) => mutation.mutate(data))} noValidate>
    <div className="auth-fields"><div className="auth-field"><label htmlFor="register-name">Nome de usuário</label><Input id="register-name" autoComplete="username" placeholder="Nome de usuário" aria-invalid={Boolean(form.formState.errors.name)} aria-describedby={form.formState.errors.name ? 'register-name-error' : undefined} {...form.register('name')} /><FieldError id="register-name-error" message={form.formState.errors.name?.message} /></div>
      <div className="auth-field"><label htmlFor="register-email">E-mail</label><Input id="register-email" type="email" autoComplete="email" placeholder="Digite seu e-mail" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby={form.formState.errors.email ? 'register-email-error' : undefined} {...form.register('email')} /><FieldError id="register-email-error" message={form.formState.errors.email?.message} /></div>
      <PasswordField id="register-password" label="Senha" placeholder="Senha" registration={form.register('password')} error={form.formState.errors.password?.message} />
      <PasswordField id="register-confirm" label="Confirmar senha" placeholder="Confirmar senha" registration={form.register('confirmPassword')} error={form.formState.errors.confirmPassword?.message} />
    </div>
    {mutation.isError && <p role="alert" className="auth-error">{apiMessage(mutation.error)}</p>}
    <Button variant="market" className="auth-submit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Criando…' : <><span className="auth-register-desktop">Criar conta</span><span className="auth-register-mobile">Criar perfil</span></>}</Button>
  </form></AuthShell>
}
