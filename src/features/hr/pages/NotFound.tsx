import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Compass, LayoutDashboard, Search } from 'lucide-react'
import { Button, Card } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
        <Card className="relative overflow-hidden p-8 text-center sm:p-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg shadow-brand-500/25"><Compass className="h-8 w-8" /></div>
            <p className="mt-6 font-display text-6xl font-bold tracking-tight text-slate-900 dark:text-white">404</p>
            <h1 className="mt-2 text-xl font-bold">This page has moved on</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">The page you are looking for does not exist in this demo workspace. Try the dashboard or search from the top bar.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate('/')}><LayoutDashboard className="h-4 w-4" /> Go to dashboard</Button>
              <Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Go back</Button>
            </div>
            <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400"><Search className="h-3.5 w-3.5" /> Tip: press ⌘K or Ctrl+K to search people and pages</div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}
