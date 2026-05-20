import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'

// ─── Constants ───────────────────────────────────────────────
const C = {
  primary: '#1D9E75', primaryDark: '#0F6E56', primaryLight: '#E1F5EE',
  accent: '#378ADD', accentLight: '#E6F1FB',
  danger: '#E24B4A', dangerLight: '#FCEBEB',
  amber: '#BA7517', amberLight: '#FAEEDA',
  bg: '#F9FBFA', card: '#FFFFFF',
  border: 'rgba(0,0,0,0.08)', text: '#1a1a1a',
  muted: '#6B7280', light: '#F3F4F6',
}

const todayStr = () => new Date().toISOString().slice(0, 10)
const getWeekStart = () => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().slice(0, 10)
}
const getMonthStart = () =>
  new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().slice(0, 10)

const fmtCurrency = (n) =>
  '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN')

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// ─── Shared Styles ───────────────────────────────────────────
const s = {
  wrap: { fontFamily: "'DM Sans', sans-serif", maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: C.bg, position: 'relative' },
  input: { width: '100%', padding: '14px 16px', border: `1.5px solid ${C.border}`, borderRadius: 14, fontSize: 16, background: C.light, color: C.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' },
  label: { fontSize: 12, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.6 },
  btn: (bg = C.primary, color = '#fff') => ({ width: '100%', padding: '15px', background: bg, color, border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity .15s' }),
  btnSm: (bg = C.primary, color = '#fff') => ({ padding: '9px 18px', background: bg, color, border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }),
  card: { background: C.card, borderRadius: 20, padding: '1.25rem', marginBottom: '1rem', border: `1px solid ${C.border}` },
  modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modalCard: { background: C.card, borderRadius: '24px 24px 0 0', padding: '1.5rem 1.5rem 2.5rem', width: '100%', maxWidth: 430 },
  pill: (active) => ({ padding: '8px 16px', borderRadius: 50, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: active ? C.primary : C.light, color: active ? '#fff' : C.muted, fontFamily: 'inherit' }),
}

// ─── Toast ───────────────────────────────────────────────────
function Toast({ msg, type }) {
  return (
    <div style={{
      position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)',
      background: type === 'error' ? C.danger : C.primaryDark,
      color: '#fff', padding: '12px 22px', borderRadius: 50,
      fontSize: 14, fontWeight: 600, zIndex: 999, whiteSpace: 'nowrap',
      maxWidth: '90vw', textAlign: 'center',
    }}>{msg}</div>
  )
}

// ─── Auth Screen ─────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ email: '', password: '', shopName: '' })
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [showPass, setShowPass] = useState(false)

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleSubmit = async () => {
    if (!form.email || !form.password) return showToast('Please fill all fields')
    if (mode === 'signup' && !form.shopName) return showToast('Enter your shop name')
    if (form.password.length < 6) return showToast('Password must be at least 6 characters')

    setLoading(true)
    try {
      if (mode === 'signup') {
        const emailRedirectTo = import.meta.env.VITE_AUTH_REDIRECT_URL || window.location.origin

        const { data, error } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            emailRedirectTo,
            data: { shop_name: form.shopName },
          },
        })
        if (error) throw error

        if (data.user) {
          // Create shop record even if email verification is pending
          const { error: shopErr } = await supabase.from('shops').insert({
            user_id: data.user.id,
            shop_name: form.shopName,
          })
          if (shopErr) throw shopErr
        }

        if (data.session) {
          showToast('Account created! Logging you in…', 'success')
          onAuth(data.user, form.shopName)
        } else {
          showToast('Account created! Check your email to verify your account.', 'success')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        })
        if (error) throw error
        // Fetch shop name
        const { data: shop } = await supabase
          .from('shops')
          .select('shop_name')
          .eq('user_id', data.user.id)
          .single()
        onAuth(data.user, shop?.shop_name || 'My Shop')
      }
    } catch (err) {
      const message = err?.message || 'Something went wrong'
      const toastMessage = message.toLowerCase().includes('rate limit')
        ? 'Email rate limit exceeded. Please wait a few minutes before retrying.'
        : message
      showToast(toastMessage)
    } finally {
      setLoading(false)
    }
  }

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  return (
    <div style={{ ...s.wrap, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '2rem 1.5rem', background: `linear-gradient(160deg, ${C.primaryLight} 0%, ${C.bg} 60%)` }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ width: 68, height: 68, background: C.primary, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 34 }}>🏪</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: C.primaryDark, margin: 0 }}>DukanBook</h1>
        <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Smart accounting for your shop</p>
      </div>

      <div style={{ background: C.card, borderRadius: 24, padding: '1.75rem 1.5rem', boxShadow: '0 4px 32px rgba(29,158,117,0.10)' }}>
        {/* Tab toggle */}
        <div style={{ display: 'flex', background: C.light, borderRadius: 12, padding: 4, marginBottom: 24 }}>
          {['login', 'signup'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, background: mode === m ? C.card : 'transparent', color: mode === m ? C.primaryDark : C.muted, transition: 'all .2s' }}>
              {m === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>🏪 Shop Name</label>
            <input style={s.input} placeholder="e.g. Sharma General Store" value={form.shopName} onChange={f('shopName')} />
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={s.label}>📧 Email</label>
          <input style={s.input} type="email" placeholder="you@email.com" value={form.email} onChange={f('email')} autoComplete="email" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={s.label}>🔒 Password</label>
          <div style={{ position: 'relative' }}>
            <input style={{ ...s.input, paddingRight: 48 }} type={showPass ? 'text' : 'password'} placeholder={mode === 'signup' ? 'Min 6 characters' : 'Your password'} value={form.password} onChange={f('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            <button onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted }}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button style={s.btn(loading ? C.muted : C.primary)} onClick={handleSubmit} disabled={loading}>
          {loading ? '⏳ Please wait…' : mode === 'login' ? 'Login →' : 'Create Account →'}
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: C.muted, marginTop: 20 }}>🔒 Your data is secure &amp; private</p>
      {toast && <Toast {...toast} />}
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────
function Dashboard({ transactions, range, onRange, onDelete, onEdit, loading }) {
  const filtered = useFiltered(transactions, range)
  const summary = useSummary(filtered)

  const rangeLabel = { daily: "Today", weekly: "This Week", monthly: "This Month" }[range]

  return (
    <>
      <RangePills range={range} onRange={onRange} />

      {/* Profit banner */}
      <div style={{ background: summary.profit >= 0 ? C.primaryLight : C.dangerLight, borderRadius: 20, padding: '1.25rem 1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: summary.profit >= 0 ? C.primaryDark : C.danger, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Net Profit — {rangeLabel}</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: summary.profit >= 0 ? C.primaryDark : C.danger }}>{fmtCurrency(summary.profit)}</div>
        </div>
        <span style={{ fontSize: 48 }}>{summary.profit >= 0 ? '📈' : '📉'}</span>
      </div>

      {/* Stat grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
        {[
          { label: 'Cash Sales', value: summary.cashSales, bg: C.primaryLight, color: C.primaryDark, icon: '💵' },
          { label: 'UPI Sales', value: summary.upiSales, bg: C.accentLight, color: C.accent, icon: '📱' },
          { label: 'Total Sales', value: summary.totalSales, bg: C.amberLight, color: C.amber, icon: '🧾' },
          { label: 'Expenses', value: summary.expenses, bg: C.dangerLight, color: C.danger, icon: '💸' },
        ].map(({ label, value, bg, color, icon }) => (
          <div key={label} style={{ background: bg, borderRadius: 16, padding: '1rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ fontSize: 28, position: 'absolute', right: 10, top: 10, opacity: 0.15 }}>{icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{fmtCurrency(value)}</div>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>Recent Transactions</div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: C.muted }}>Loading…</div>
      ) : (
        <TxList transactions={filtered.slice(0, 10)} onDelete={onDelete} onEdit={onEdit} />
      )}
    </>
  )
}

// ─── Entries Tab ─────────────────────────────────────────────
function EntriesTab({ transactions, range, onRange, onDelete, onEdit, loading }) {
  const filtered = useFiltered(transactions, range)
  return (
    <>
      <RangePills range={range} onRange={onRange} />
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>No transactions</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Add your first sale or expense</div>
        </div>
      ) : (
        <TxList transactions={filtered} onDelete={onDelete} onEdit={onEdit} />
      )}
    </>
  )
}

// ─── Reports Tab ─────────────────────────────────────────────
function ReportsTab({ transactions, range, onRange, shopName, loading }) {
  const filtered = useFiltered(transactions, range)
  const summary = useSummary(filtered)
  const [exporting, setExporting] = useState(false)

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const rangeLabel = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }[range]
      const dateStr = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

      // Header
      doc.setFontSize(20)
      doc.setTextColor(15, 110, 86)
      doc.text('DukanBook', 14, 20)
      doc.setFontSize(12)
      doc.setTextColor(80, 80, 80)
      doc.text(`${shopName} — ${rangeLabel} Report`, 14, 28)
      doc.setFontSize(10)
      doc.text(`Generated: ${dateStr}`, 14, 35)

      // Summary box
      doc.setFontSize(11)
      doc.setTextColor(30, 30, 30)
      autoTable(doc, {
        startY: 42,
        head: [['Summary', 'Amount']],
        body: [
          ['Cash Sales', fmtCurrency(summary.cashSales)],
          ['UPI Sales', fmtCurrency(summary.upiSales)],
          ['Total Sales', fmtCurrency(summary.totalSales)],
          ['Total Expenses', fmtCurrency(summary.expenses)],
          ['Net Profit', fmtCurrency(summary.profit)],
        ],
        headStyles: { fillColor: [15, 110, 86] },
        columnStyles: { 1: { halign: 'right' } },
        alternateRowStyles: { fillColor: [240, 250, 246] },
        styles: { fontSize: 11, fontStyle: 'normal' },
      })

      // Transactions table
      if (filtered.length > 0) {
        doc.setFontSize(12)
        doc.setTextColor(30, 30, 30)
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Date', 'Type', 'Description', 'Amount']],
          body: filtered.map((t) => [
            fmtDate(t.date),
            t.type === 'income' ? (t.subtype === 'cash' ? 'Cash Sale' : 'UPI Sale') : 'Expense',
            t.note || '—',
            (t.type === 'income' ? '+' : '-') + fmtCurrency(t.amount),
          ]),
          headStyles: { fillColor: [55, 138, 221] },
          columnStyles: { 3: { halign: 'right' } },
          styles: { fontSize: 10 },
        })
      }

      doc.save(`${shopName.replace(/\s+/g, '-')}-${range}-report.pdf`)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <RangePills range={range} onRange={onRange} />

      <div style={s.card}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {range.charAt(0).toUpperCase() + range.slice(1)} Summary
        </div>
        {[
          { label: 'Cash Sales', value: summary.cashSales, color: C.primary, icon: '💵' },
          { label: 'UPI Sales', value: summary.upiSales, color: C.accent, icon: '📱' },
          { label: 'Total Sales', value: summary.totalSales, color: C.amber, icon: '🧾' },
          { label: 'Total Expenses', value: summary.expenses, color: C.danger, icon: '💸' },
          { label: 'Net Profit', value: summary.profit, color: summary.profit >= 0 ? C.primary : C.danger, icon: '📊', bold: true },
        ].map(({ label, value, color, icon, bold }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.light}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 14, fontWeight: bold ? 700 : 500, color: C.text }}>{label}</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color }}>{fmtCurrency(value)}</span>
          </div>
        ))}
      </div>

      {/* Expense breakdown */}
      {filtered.filter((t) => t.type === 'expense').length > 0 && (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>Expense Breakdown</div>
          <div style={s.card}>
            {filtered.filter((t) => t.type === 'expense').map((t) => {
              const pct = summary.expenses > 0 ? Math.round((t.amount / summary.expenses) * 100) : 0
              return (
                <div key={t.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{t.note || 'Expense'}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.danger }}>{fmtCurrency(t.amount)} ({pct}%)</span>
                  </div>
                  <div style={{ background: C.light, borderRadius: 99, height: 7 }}>
                    <div style={{ background: C.danger, borderRadius: 99, height: 7, width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {loading ? null : (
        <button style={{ ...s.btn(exporting ? C.muted : C.primaryDark), borderRadius: 16, marginBottom: 8 }} onClick={handleExportPDF} disabled={exporting}>
          {exporting ? '⏳ Generating PDF…' : '📥 Export PDF Report'}
        </button>
      )}
    </>
  )
}

// ─── Transaction List ─────────────────────────────────────────
function TxList({ transactions, onDelete, onEdit }) {
  if (!transactions.length) return (
    <div style={{ textAlign: 'center', padding: '2rem', color: C.muted }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
      <div>No transactions yet</div>
    </div>
  )
  return (
    <div style={s.card}>
      {transactions.map((t, i) => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < transactions.length - 1 ? `1px solid ${C.light}` : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: t.type === 'income' ? C.primaryLight : C.dangerLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
              {t.type === 'income' ? (t.subtype === 'cash' ? '💵' : '📱') : '🧾'}
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{t.type === 'income' ? (t.subtype === 'cash' ? 'Cash Sale' : 'UPI Sale') : 'Expense'}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{t.note || '—'} · {fmtDate(t.date)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.type === 'income' ? C.primary : C.danger }}>
              {t.type === 'income' ? '+' : '-'}{fmtCurrency(t.amount)}
            </div>
            {onEdit && (
              <button onClick={() => onEdit(t)} style={{ background: C.light, border: 'none', cursor: 'pointer', color: C.muted, fontSize: 13, padding: '5px 8px', borderRadius: 8 }}>✎</button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(t.id)} style={{ background: C.dangerLight, border: 'none', cursor: 'pointer', color: C.danger, fontSize: 13, padding: '5px 8px', borderRadius: 8 }}>✕</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Edit Transaction Modal ────────────────────────────────────
function EditTransactionModal({ tx, onClose, onSave, showToast }) {
  const [form, setForm] = useState({
    type: tx.type,
    subtype: tx.subtype || 'cash',
    amount: tx.amount?.toString() || '',
    note: tx.note || '',
    date: tx.date || todayStr(),
  })
  const [loading, setLoading] = useState(false)

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.amount) {
      showToast?.('Enter an amount', 'error')
      return
    }

    const updates = {
      type: form.type,
      subtype: form.type === 'income' ? form.subtype : null,
      amount: parseFloat(form.amount),
      note: form.note,
      date: form.date,
    }

    setLoading(true)
    const { data, error } = await supabase.from('transactions').update(updates).eq('id', tx.id).select().single()
    setLoading(false)

    if (error) {
      console.error('Failed to update transaction:', error)
      showToast?.(error.message || 'Unable to update transaction', 'error')
      return
    }

    onSave(data)
  }

  return (
    <div style={s.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modalCard}>
        <ModalHeader title="✏️ Edit Transaction" onClose={onClose} />
        <FieldGroup label="📅 Date"><input type="date" style={s.input} value={form.date} onChange={f('date')} /></FieldGroup>
        <FieldGroup label="🔁 Type">
          <select style={s.input} value={form.type} onChange={f('type')}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </FieldGroup>
        {form.type === 'income' && (
          <FieldGroup label="💳 Income Mode">
            <select style={s.input} value={form.subtype} onChange={f('subtype')}>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </FieldGroup>
        )}
        <FieldGroup label="📝 Note (Optional)"><input style={s.input} placeholder="e.g. Festival sales" value={form.note} onChange={f('note')} /></FieldGroup>
        <FieldGroup label="💸 Amount (₹)" last>
          <input type="number" style={s.input} placeholder="0" value={form.amount} onChange={f('amount')} inputMode="numeric" />
        </FieldGroup>
        <button style={s.btn(loading ? C.muted : C.primary)} onClick={handleSave} disabled={loading}>
          {loading ? '⏳ Saving…' : '✓ Update Transaction'}
        </button>
      </div>
    </div>
  )
}

// ─── Add Income Modal ─────────────────────────────────────────
function AddIncomeModal({ onClose, onSave, shopId, userId, showToast }) {
  const [form, setForm] = useState({ cash: '', upi: '', note: '', date: todayStr() })
  const [loading, setLoading] = useState(false)

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.cash && !form.upi) {
      showToast?.('Enter cash or UPI amount', 'error')
      return
    }
    if (!shopId) {
      showToast?.('Shop record not found. Please reload or log in again.', 'error')
      return
    }
    setLoading(true)
    const entries = []
    if (form.cash) entries.push({ user_id: userId, shop_id: shopId, type: 'income', subtype: 'cash', amount: parseFloat(form.cash), note: form.note || 'Cash sales', date: form.date })
    if (form.upi) entries.push({ user_id: userId, shop_id: shopId, type: 'income', subtype: 'upi', amount: parseFloat(form.upi), note: form.note || 'UPI sales', date: form.date })
    const { data, error } = await supabase.from('transactions').insert(entries).select()
    setLoading(false)
    if (error) {
      console.error('Failed to save income:', error)
      showToast?.(error.message || 'Unable to save sales', 'error')
      return
    }
    onSave(data)
  }

  return (
    <div style={s.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modalCard}>
        <ModalHeader title="💰 Add Sales" onClose={onClose} />
        <FieldGroup label="📅 Date"><input type="date" style={s.input} value={form.date} onChange={f('date')} /></FieldGroup>
        <FieldGroup label="💵 Cash Sales (₹)"><input type="number" style={s.input} placeholder="0" value={form.cash} onChange={f('cash')} inputMode="numeric" /></FieldGroup>
        <FieldGroup label="📱 UPI Sales (₹)"><input type="number" style={s.input} placeholder="0" value={form.upi} onChange={f('upi')} inputMode="numeric" /></FieldGroup>
        <FieldGroup label="📝 Note (Optional)" last>
          <input style={s.input} placeholder="e.g. Festival sales" value={form.note} onChange={f('note')} />
        </FieldGroup>
        <button style={s.btn(loading ? C.muted : C.primary)} onClick={handleSave} disabled={loading}>
          {loading ? '⏳ Saving…' : '✓ Save Sales'}
        </button>
      </div>
    </div>
  )
}

// ─── Add Expense Modal ────────────────────────────────────────
function AddExpenseModal({ onClose, onSave, shopId, userId, showToast }) {
  const [form, setForm] = useState({ note: '', amount: '', date: todayStr() })
  const [loading, setLoading] = useState(false)

  const f = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.amount) {
      showToast?.('Enter an expense amount', 'error')
      return
    }
    if (!shopId) {
      showToast?.('Shop record not found. Please reload or log in again.', 'error')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.from('transactions').insert([{
      user_id: userId, shop_id: shopId, type: 'expense',
      amount: parseFloat(form.amount), note: form.note, date: form.date,
    }]).select()
    setLoading(false)
    if (error) {
      console.error('Failed to save expense:', error)
      showToast?.(error.message || 'Unable to save expense', 'error')
      return
    }
    onSave(data)
  }

  return (
    <div style={s.modal} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={s.modalCard}>
        <ModalHeader title="🧾 Add Expense" onClose={onClose} />
        <FieldGroup label="📅 Date"><input type="date" style={s.input} value={form.date} onChange={f('date')} /></FieldGroup>
        <FieldGroup label="📝 Expense Name"><input style={s.input} placeholder="e.g. Rent, Vegetables, Salary…" value={form.note} onChange={f('note')} /></FieldGroup>
        <FieldGroup label="💸 Amount (₹)" last>
          <input type="number" style={s.input} placeholder="0" value={form.amount} onChange={f('amount')} inputMode="numeric" />
        </FieldGroup>
        <button style={s.btn(loading ? C.muted : C.danger)} onClick={handleSave} disabled={loading}>
          {loading ? '⏳ Saving…' : '✓ Save Expense'}
        </button>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────
function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
      <button style={{ background: C.light, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 16 }} onClick={onClose}>✕</button>
    </div>
  )
}

function FieldGroup({ label, children, last }) {
  return (
    <div style={{ marginBottom: last ? 20 : 16 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  )
}

function RangePills({ range, onRange }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
      {['daily', 'weekly', 'monthly'].map((r) => (
        <button key={r} style={s.pill(range === r)} onClick={() => onRange(r)}>
          {r.charAt(0).toUpperCase() + r.slice(1)}
        </button>
      ))}
    </div>
  )
}

// ─── Custom hooks ─────────────────────────────────────────────
function useFiltered(transactions, range) {
  const starts = { daily: todayStr(), weekly: getWeekStart(), monthly: getMonthStart() }
  return transactions.filter((t) => t.date >= starts[range])
}

function useSummary(filtered) {
  const cashSales = filtered.filter((t) => t.type === 'income' && t.subtype === 'cash').reduce((s, t) => s + Number(t.amount), 0)
  const upiSales = filtered.filter((t) => t.type === 'income' && t.subtype === 'upi').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalSales = cashSales + upiSales
  return { cashSales, upiSales, expenses, totalSales, profit: totalSales - expenses }
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)
  const [shopName, setShopName] = useState('My Shop')
  const [shopId, setShopId] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  const [transactions, setTransactions] = useState([])
  const [txLoading, setTxLoading] = useState(false)

  const [activeTab, setActiveTab] = useState('dashboard')
  const [range, setRange] = useState('daily')
  const [showIncome, setShowIncome] = useState(false)
  const [showExpense, setShowExpense] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load shop + transactions when logged in
  useEffect(() => {
    if (!session) return
    const load = async () => {
      setTxLoading(true)
      let shop = null

      const { data: shopData, error: shopErr } = await supabase
        .from('shops')
        .select('id, shop_name')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (shopErr) {
        console.error('Error loading shop:', shopErr)
        showToast('Unable to load shop record.', 'error')
      } else {
        shop = shopData
      }

      if (!shop) {
        const fallbackName = session.user.user_metadata?.shop_name || 'My Shop'
        const { data: createdShop, error: createShopErr } = await supabase
          .from('shops')
          .insert({ user_id: session.user.id, shop_name: fallbackName })
          .select()
          .single()

        if (createShopErr) {
          console.error('Could not create shop record:', createShopErr)
          showToast('Unable to create shop record.', 'error')
        } else {
          shop = createdShop
        }
      }

      if (shop) {
        setShopName(shop.shop_name)
        setShopId(shop.id)
      }

      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (txErr) {
        console.error('Error loading transactions:', txErr)
        showToast('Unable to load transactions.', 'error')
      }

      setTransactions(tx || [])
      setTxLoading(false)
    }
    load()
  }, [session])

  const handleAuth = (user, sName) => {
    setShopName(sName)
    setSession({ user })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setTransactions([])
  }

  const handleSaveIncome = (newTx) => {
    setTransactions((prev) => [...newTx, ...prev])
    setShowIncome(false)
    showToast('Sales saved! ✓')
  }

  const handleSaveExpense = (newTx) => {
    setTransactions((prev) => [...newTx, ...prev])
    setShowExpense(false)
    showToast('Expense saved! ✓')
  }

  const handleEdit = (tx) => {
    setEditingTx(tx)
    setShowEdit(true)
  }

  const handleUpdateTransaction = (updatedTx) => {
    setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)))
    setShowEdit(false)
    setEditingTx(null)
    showToast('Transaction updated! ✓')
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (!error) {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
      showToast('Entry deleted')
    }
  }

  if (!authReady) return (
    <div style={{ ...s.wrap, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
      <div style={{ textAlign: 'center', color: C.muted }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🏪</div>
        <div style={{ fontWeight: 600 }}>Loading DukanBook…</div>
      </div>
    </div>
  )

  if (!session) return <AuthScreen onAuth={handleAuth} />

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'entries', label: 'Entries', icon: '📝' },
    { id: 'reports', label: 'Reports', icon: '📊' },
  ]

  return (
    <div style={s.wrap}>
      {/* Header */}
      <div style={{ background: C.card, padding: '1.1rem 1.5rem 1rem', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.primaryDark }}>🏪 {shopName}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <button style={s.btnSm(C.light, C.muted)} onClick={handleLogout}>Logout</button>
      </div>

      {/* Quick action bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '12px 1.25rem 0' }}>
        <button
          style={{
            ...s.btn(C.primaryDark),
            borderRadius: 14,
            padding: 13,
            fontSize: 14,
            opacity: txLoading || !shopId ? 0.6 : 1,
            cursor: txLoading || !shopId ? 'not-allowed' : 'pointer',
          }}
          onClick={() => setShowIncome(true)}
          disabled={txLoading || !shopId}
          title={!shopId ? 'Waiting for shop data...' : undefined}
        >
          ➕ Add Sales
        </button>
        <button
          style={{
            ...s.btn(C.danger),
            borderRadius: 14,
            padding: 13,
            fontSize: 14,
            opacity: txLoading || !shopId ? 0.6 : 1,
            cursor: txLoading || !shopId ? 'not-allowed' : 'pointer',
          }}
          onClick={() => setShowExpense(true)}
          disabled={txLoading || !shopId}
          title={!shopId ? 'Waiting for shop data...' : undefined}
        >
          ➖ Add Expense
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '1rem 1.25rem 100px', overflowY: 'auto' }}>
        {activeTab === 'dashboard' && <Dashboard transactions={transactions} range={range} onRange={setRange} onDelete={handleDelete} onEdit={handleEdit} loading={txLoading} />}
        {activeTab === 'entries' && <EntriesTab transactions={transactions} range={range} onRange={setRange} onDelete={handleDelete} onEdit={handleEdit} loading={txLoading} />}
        {activeTab === 'reports' && <ReportsTab transactions={transactions} range={range} onRange={setRange} shopName={shopName} loading={txLoading} />}
      </div>

      {/* Bottom nav */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: C.card, borderTop: `1px solid ${C.border}`, display: 'flex', padding: '8px 0 12px', zIndex: 100 }}>
        {tabs.map((tab) => (
          <div key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', opacity: activeTab === tab.id ? 1 : 0.4, color: activeTab === tab.id ? C.primary : C.muted }}>
            <span style={{ fontSize: 22 }}>{tab.icon}</span>
            <span style={{ fontSize: 10, fontWeight: activeTab === tab.id ? 700 : 500 }}>{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showIncome && <AddIncomeModal onClose={() => setShowIncome(false)} onSave={handleSaveIncome} shopId={shopId} userId={session?.user?.id} showToast={showToast} />}
      {showExpense && <AddExpenseModal onClose={() => setShowExpense(false)} onSave={handleSaveExpense} shopId={shopId} userId={session?.user?.id} showToast={showToast} />}
      {showEdit && editingTx && <EditTransactionModal tx={editingTx} onClose={() => { setShowEdit(false); setEditingTx(null) }} onSave={handleUpdateTransaction} showToast={showToast} />}

      {toast && <Toast {...toast} />}
    </div>
  )
}
