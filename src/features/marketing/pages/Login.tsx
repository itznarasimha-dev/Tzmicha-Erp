import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  Info,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Wand2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { DEMO_CREDENTIALS } from '../config/demo'
import { getFirstVisibleModulePath } from '../config/navigation'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Form'
import { Modal } from '../components/ui/Modal'

interface FormErrors {
  identifier?: string
  password?: string
}

const mockBars = [38, 56, 48, 72, 61, 88, 76, 96, 84, 100, 92, 108]

export function LoginPage() {
  const { signIn, isSigningIn, isAuthenticated } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { pushToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? getFirstVisibleModulePath()

  useEffect(() => {
    if (copied) {
      const timer = window.setTimeout(() => setCopied(null), 1600)
      return () => window.clearTimeout(timer)
    }
  }, [copied])

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!identifier.trim()) next.identifier = 'Enter your demo email or employee ID.'
    if (!password) next.password = 'Enter the demo password.'
    else if (password.length < 6) next.password = 'The demo password is at least 6 characters.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')
    if (!validate()) return
    const result = await signIn(identifier, password, remember)
    if (!result.ok) {
      setFormError(result.error ?? 'The demo sign-in could not be completed.')
      return
    }
    pushToast({
      title: 'Demo workspace opened',
      description: 'Signed in with the local demonstration session — no real employee was authenticated.',
      tone: 'success',
    })
    navigate(redirectTo, { replace: true })
  }

  const fillDemoCredentials = () => {
    setIdentifier(DEMO_CREDENTIALS.email)
    setPassword(DEMO_CREDENTIALS.password)
    setErrors({})
    setFormError('')
  }

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(label)
      pushToast({ title: `${label} copied`, tone: 'success' })
    } catch {
      pushToast({
        title: 'Copy unavailable',
        description: 'Your browser blocked clipboard access. Select the value manually.',
        tone: 'warning',
      })
    }
  }

  const submitForgot = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!forgotEmail.trim()) return
    setForgotSent(true)
  }

  return (
    <div className="login-page">
      <section className="login-showcase" aria-label="Totally ERP Marketing Portal overview">
        <div className="login-grid-lines" aria-hidden="true" />
        <div className="login-brand">
          <span className="brand-mark" aria-hidden="true">T</span>
          <div>
            <p className="login-brand__name">Totally <span>ERP</span></p>
            <p className="login-brand__tag">Marketing Employee Portal</p>
          </div>
        </div>

        <div className="login-showcase__body">
          <span className="login-showcase__eyebrow">
            <span className="dot" aria-hidden="true" />
            Frontend demonstration workspace
          </span>
          <h1>
            Marketing, orchestrated <em>end to end.</em>
          </h1>
          <p className="login-showcase__copy">
            Plan campaigns, activate field and trade teams, qualify leads and connect every rupee
            of spend to attributed outcomes — all in one employee workspace.
          </p>

          <div className="login-features">
            {[
              { icon: Target, text: 'Leads & attribution' },
              { icon: BarChart3, text: 'Campaign analytics' },
              { icon: ClipboardCheck, text: 'Budgets & approvals' },
              { icon: Wand2, text: 'AI-assisted planning' },
            ].map((feature) => {
              const Icon = feature.icon
              return (
                <div className="login-feature" key={feature.text}>
                  <Icon size={15} aria-hidden="true" />
                  {feature.text}
                </div>
              )
            })}
          </div>

          <div className="login-mock" aria-hidden="true">
            <div className="login-mock__head">
              <span className="login-mock__title">Campaign performance · sample data</span>
              <span className="login-mock__badge">Demo</span>
            </div>
            <div className="login-mock__bars">
              {mockBars.map((height, index) => (
                <span
                  key={index}
                  className="login-mock__bar"
                  style={{ height: `${height / 1.2}%`, animationDelay: `${index * 45}ms` }}
                />
              ))}
            </div>
            <div className="login-mock__labels">
              <span>May</span>
              <span>Jul</span>
              <span>Sep</span>
              <span>Oct</span>
            </div>
          </div>
        </div>

        <div className="login-showcase__footer">
          <span><ShieldCheck size={12} /> Frontend-only demo</span>
          <span className="sep" />
          <span>Local sample data</span>
          <span className="sep" />
          <span>No live services connected</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-panel__top">
          <button
            type="button"
            className="login-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>

        <div className="login-card">
          <div className="login-mobile-brand">
            <span className="brand-mark" aria-hidden="true">T</span>
            <div>
              <p className="brand-text__name" style={{ color: 'var(--text)' }}>Totally ERP</p>
              <p className="brand-text__tag" style={{ color: 'var(--muted)' }}>Marketing Employee Portal</p>
            </div>
          </div>

          <span className="login-eyebrow">
            <Fingerprint size={13} aria-hidden="true" />
            Employee access
          </span>
          <h2>Welcome back</h2>
          <p className="login-card__sub">
            Sign in to your marketing workspace. This demo uses a local session and clearly labelled
            sample data.
          </p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <div className="login-error" role="alert">
                <Info size={15} />
                <span>{formError}</span>
              </div>
            ) : null}

            <Field
              label="Email or employee ID"
              htmlFor="login-identifier"
              required
              error={errors.identifier}
            >
              <div className="input-icon">
                <Mail size={16} aria-hidden="true" />
                <input
                  id="login-identifier"
                  name="identifier"
                  className="input"
                  type="text"
                  autoComplete="username"
                  value={identifier}
                  onChange={(event) => {
                    setIdentifier(event.target.value)
                    setErrors((current) => ({ ...current, identifier: undefined }))
                  }}
                  placeholder="you@totallyerp.demo or TOT-MKT-0000"
                  aria-invalid={Boolean(errors.identifier)}
                  aria-describedby={errors.identifier ? 'login-identifier-error' : undefined}
                />
              </div>
            </Field>

            <Field label="Password" htmlFor="login-password" required error={errors.password}>
              <div className="input-icon">
                <Lock size={16} aria-hidden="true" />
                <input
                  id="login-password"
                  name="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrors((current) => ({ ...current, password: undefined }))
                  }}
                  placeholder="Enter demo password"
                  aria-invalid={Boolean(errors.password)}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  className="input-suffix"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <div className="login-form__row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                Remember this demo session
              </label>
              <button
                type="button"
                className="forgot-link"
                onClick={() => {
                  setForgotOpen(true)
                  setForgotSent(false)
                  setForgotEmail(identifier.includes('@') ? identifier : '')
                }}
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              block
              loading={isSigningIn}
              className="login-submit"
              icon={isSigningIn ? undefined : <ArrowRight size={16} />}
            >
              {isSigningIn ? 'Opening demo workspace…' : 'Sign in to portal'}
            </Button>
          </form>

          <div className="demo-access">
            <div className="demo-access__head">
              <span className="demo-access__title">
                <Sparkles size={12} />
                Demo access
              </span>
              <span className="demo-access__mode">Development only</span>
            </div>
            <div className="demo-access__body">
              <div className="demo-credential">
                <span className="demo-credential__label">Email</span>
                <span className="row-4" style={{ minWidth: 0 }}>
                  <span className="demo-credential__value truncate">{DEMO_CREDENTIALS.email}</span>
                  <button
                    type="button"
                    className="demo-credential__copy"
                    onClick={() => copyValue('Email', DEMO_CREDENTIALS.email)}
                    aria-label="Copy demo email"
                  >
                    {copied === 'Email' ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                  </button>
                </span>
              </div>
              <div className="demo-credential">
                <span className="demo-credential__label">Employee ID</span>
                <span className="demo-credential__value">{DEMO_CREDENTIALS.employeeId}</span>
              </div>
              <div className="demo-credential">
                <span className="demo-credential__label">Password</span>
                <span className="row-4">
                  <span className="demo-credential__value">{DEMO_CREDENTIALS.password}</span>
                  <button
                    type="button"
                    className="demo-credential__copy"
                    onClick={() => copyValue('Password', DEMO_CREDENTIALS.password)}
                    aria-label="Copy demo password"
                  >
                    {copied === 'Password' ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                  </button>
                </span>
              </div>
              <Button variant="soft" size="sm" className="demo-fill-btn" onClick={fillDemoCredentials}>
                Fill demo credentials
              </Button>
            </div>
            <div className="demo-access__foot">
              <Info size={11} />
              <span>
                These are public demonstration credentials, not a real employee account. No
                authentication service, backend or company directory is connected.
              </span>
            </div>
          </div>

          <p className="login-terms">
            <strong>Demo mode.</strong> Marketing records stay in this browser. Clearing site data or
            resetting the demo restores the original sample dataset.
          </p>
        </div>
      </section>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Reset your demo password"
        description="Password recovery is illustrative in this frontend-only demonstration."
        size="sm"
        footer={
          forgotSent ? (
            <Button onClick={() => setForgotOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setForgotOpen(false)}>
                Cancel
              </Button>
              <Button form="forgot-form" type="submit">Request reset</Button>
            </>
          )
        }
      >
        {forgotSent ? (
          <div className="stack-12">
            <div className="login-success">
              <CheckCircle2 size={15} />
              <span>Your reset request was recorded for this demo only.</span>
            </div>
            <p className="text-sm muted">
              No email was sent and no password was changed. In a connected environment, the identity
              provider would deliver a secure reset link to {forgotEmail || 'the registered address'}.
            </p>
          </div>
        ) : (
          <form id="forgot-form" className="stack-12" onSubmit={submitForgot}>
            <p className="text-sm muted">
              Enter your demo email to see how recovery would be initiated. Nothing is sent from this
              demonstration.
            </p>
            <Field label="Demo email" htmlFor="forgot-email" required>
              <input
                id="forgot-email"
                className="input"
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="you@totallyerp.demo"
              />
            </Field>
            <div className="callout callout--info">
              <Info size={14} />
              <span>This is not a real password reset. Demo credentials remain unchanged.</span>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
