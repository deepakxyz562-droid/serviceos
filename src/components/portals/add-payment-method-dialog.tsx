'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { CreditCard, Loader2, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

interface AddPaymentMethodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function apiUrl(path: string) {
  return `${path}?XTransformPort=3000`
}

function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

function detectBrand(cardNumber: string): string {
  const n = cardNumber.replace(/\D/g, '')
  if (/^4/.test(n)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard'
  if (/^3[47]/.test(n)) return 'Amex'
  if (/^6(?:011|5)/.test(n)) return 'Discover'
  if (/^(60|65|81|82)/.test(n)) return 'RuPay'
  return 'Card'
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return digits
}

const BRAND_STYLES: Record<string, { gradient: string; label: string }> = {
  Visa: { gradient: 'from-blue-600 to-blue-800', label: 'Visa' },
  Mastercard: { gradient: 'from-orange-500 to-red-600', label: 'Mastercard' },
  Amex: { gradient: 'from-teal-500 to-teal-700', label: 'Amex' },
  Discover: { gradient: 'from-amber-500 to-orange-600', label: 'Discover' },
  RuPay: { gradient: 'from-emerald-600 to-green-700', label: 'RuPay' },
  Card: { gradient: 'from-slate-500 to-slate-700', label: 'Card' },
}

export function AddPaymentMethodDialog({ open, onOpenChange, onSuccess }: AddPaymentMethodDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('card')

  // Card state
  const [holderName, setHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvv, setCvv] = useState('')
  const [isDefault, setIsDefault] = useState(false)

  // UPI state
  const [upiId, setUpiId] = useState('')

  const detectedBrand = cardNumber.replace(/\D/g, '').length >= 4 ? detectBrand(cardNumber) : ''
  const brandStyle = detectedBrand ? BRAND_STYLES[detectedBrand] || BRAND_STYLES.Card : null

  const resetForm = () => {
    setHolderName('')
    setCardNumber('')
    setExpiry('')
    setCvv('')
    setIsDefault(false)
    setUpiId('')
    setError(null)
  }

  const handleSubmit = async () => {
    setError(null)

    if (tab === 'card') {
      if (!holderName.trim()) {
        setError('Please enter the card holder name.')
        return
      }
      const cleanNumber = cardNumber.replace(/\D/g, '')
      if (!cleanNumber) {
        setError('Please enter your card number.')
        return
      }
      if (!luhnValid(cleanNumber)) {
        setError('Please enter a valid card number.')
        return
      }
      const [mm, yy] = expiry.split('/')
      if (!mm || !yy || mm.length !== 2 || yy.length !== 2) {
        setError('Please enter a valid expiry (MM/YY).')
        return
      }
      const month = parseInt(mm, 10)
      if (month < 1 || month > 12) {
        setError('Invalid expiry month.')
        return
      }
      const expDate = new Date(2000 + parseInt(yy, 10), month, 0, 23, 59, 59)
      if (expDate < new Date()) {
        setError('Card has expired.')
        return
      }
      if (cvv && ![3, 4].includes(cvv.length)) {
        setError('CVV must be 3 or 4 digits.')
        return
      }

      setSubmitting(true)
      try {
        const res = await fetch(apiUrl('/api/customer/payment-methods'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'card',
            holderName: holderName.trim(),
            cardNumber: cleanNumber,
            expMonth: month,
            expYear: parseInt(yy, 10),
            cvv,
            isDefault,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to add card')
        }
        toast.success('Card added successfully!')
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setSubmitting(false)
      }
    } else if (tab === 'upi') {
      if (!upiId.trim()) {
        setError('Please enter your UPI ID.')
        return
      }
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim())) {
        setError('Please enter a valid UPI ID (e.g., name@bank).')
        return
      }

      setSubmitting(true)
      try {
        const res = await fetch(apiUrl('/api/customer/payment-methods'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'upi',
            upiId: upiId.trim(),
            isDefault,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to add UPI')
        }
        toast.success('UPI ID added successfully!')
        resetForm()
        onOpenChange(false)
        onSuccess?.()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      } finally {
        setSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-5 text-teal-600" />
            Add Payment Method
          </DialogTitle>
          <DialogDescription>
            Add a card or UPI ID for faster checkout.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(null) }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="card">Card</TabsTrigger>
            <TabsTrigger value="upi">UPI</TabsTrigger>
          </TabsList>

          {/* Card Tab */}
          <TabsContent value="card" className="space-y-4 mt-4">
            {/* Card preview */}
            {brandStyle && (
              <div className={`rounded-xl bg-gradient-to-br ${brandStyle.gradient} p-4 text-white shadow-lg`}>
                <div className="flex justify-between items-start">
                  <CreditCard className="size-6 opacity-80" />
                  <span className="text-xs font-semibold uppercase tracking-wider opacity-90">{brandStyle.label}</span>
                </div>
                <p className="font-mono text-lg tracking-wider mt-4">
                  {cardNumber || '•••• •••• •••• ••••'}
                </p>
                <div className="flex justify-between items-end mt-3">
                  <div>
                    <p className="text-[10px] uppercase opacity-70">Holder</p>
                    <p className="text-xs font-medium truncate max-w-[140px]">{holderName || 'YOUR NAME'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase opacity-70">Expires</p>
                    <p className="text-xs font-medium">{expiry || 'MM/YY'}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="holderName">Card Holder Name *</Label>
              <Input
                id="holderName"
                placeholder="Name on card"
                value={holderName}
                onChange={e => setHolderName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number *</Label>
              <Input
                id="cardNumber"
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                inputMode="numeric"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry *</Label>
                <Input
                  id="expiry"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  type="password"
                  placeholder="•••"
                  value={cvv}
                  onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <Label htmlFor="default-card" className="text-sm cursor-pointer">Set as default</Label>
                <p className="text-xs text-muted-foreground">Use this for quick payments</p>
              </div>
              <Switch id="default-card" checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </TabsContent>

          {/* UPI Tab */}
          <TabsContent value="upi" className="space-y-4 mt-4">
            <div className="rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 p-4 text-white shadow-lg">
              <div className="flex justify-between items-start">
                <CreditCard className="size-6 opacity-80" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-90">UPI</span>
              </div>
              <p className="font-mono text-sm mt-4">{upiId || 'yourname@bank'}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID *</Label>
              <Input
                id="upiId"
                placeholder="yourname@okhdfcbank"
                value={upiId}
                onChange={e => setUpiId(e.target.value.trim())}
              />
              <p className="text-xs text-muted-foreground">
                Enter your UPI ID (e.g., name@bank). You can find it in any UPI app.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <Label htmlFor="default-upi" className="text-sm cursor-pointer">Set as default</Label>
                <p className="text-xs text-muted-foreground">Use this for quick payments</p>
              </div>
              <Switch id="default-upi" checked={isDefault} onCheckedChange={setIsDefault} />
            </div>
          </TabsContent>
        </Tabs>

        {/* Security notice */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
          <ShieldCheck className="size-4 shrink-0 mt-0.5 text-teal-600" />
          <span>We never store your full card number or CVV. Your data is tokenized and secure.</span>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                Add Method
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
