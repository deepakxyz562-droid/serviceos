'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, AlertTriangle, ArrowUpRight, Link2, Zap, Crown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface CreditStatus {
  allowed: boolean
  reason?: string
  remainingCredits: number
  usedCredits: number
  totalCredits: number
  isTrial: boolean
  ownWhatsappConnected: boolean
  platformWhatsappEnabled: boolean
  planStatus: string
  plan: string
}

interface WhatsAppCreditBannerProps {
  onUpgradeClick?: () => void
  onConnectMetaClick?: () => void
  compact?: boolean
}

export function WhatsAppCreditBanner({ onUpgradeClick, onConnectMetaClick, compact }: WhatsAppCreditBannerProps) {
  const [credits, setCredits] = useState<CreditStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExhaustedDialog, setShowExhaustedDialog] = useState(false)

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/credits/whatsapp')
      if (res.ok) {
        const data = await res.json()
        setCredits(data)
        if (!data.allowed) {
          setShowExhaustedDialog(true)
        }
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }

  if (loading || !credits) return null

  // Paid users with own WhatsApp: no banner needed
  if (!credits.isTrial && credits.ownWhatsappConnected) return null

  // Unlimited credits (paid using platform WhatsApp): minimal indicator
  if (!credits.isTrial && credits.remainingCredits === -1) return null

  // Trial user with own WhatsApp connected: no banner needed
  if (credits.isTrial && credits.ownWhatsappConnected) return null

  const percentage = credits.totalCredits > 0
    ? Math.round((credits.usedCredits / credits.totalCredits) * 100)
    : 0

  const isLow = credits.remainingCredits >= 1 && credits.remainingCredits <= 3
  const isExhausted = credits.remainingCredits <= 0

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={isExhausted ? 'destructive' : isLow ? 'secondary' : 'outline'} className="text-xs">
          {isExhausted ? '0' : credits.remainingCredits}/{credits.totalCredits}
        </Badge>
        <span className="text-xs text-muted-foreground">WhatsApp credits</span>
      </div>
    )
  }

  return (
    <>
      {/* Credit Status Banner */}
      <Card className={isExhausted ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20' : isLow ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20' : ''}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`flex items-center justify-center size-10 rounded-full shrink-0 ${
                isExhausted ? 'bg-red-100 dark:bg-red-900/50' :
                isLow ? 'bg-amber-100 dark:bg-amber-900/50' :
                'bg-emerald-100 dark:bg-emerald-900/50'
              }`}>
                <MessageCircle className={`size-5 ${
                  isExhausted ? 'text-red-600 dark:text-red-400' :
                  isLow ? 'text-amber-600 dark:text-amber-400' :
                  'text-emerald-600 dark:text-emerald-400'
                }`} />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {isExhausted ? 'WhatsApp Credits Exhausted' :
                   isLow ? 'WhatsApp Credits Running Low' :
                   'WhatsApp Trial Credits'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isExhausted ? 'Connect your WhatsApp Business account or upgrade to continue messaging.' :
                   isLow ? `Only ${credits.remainingCredits} credit${credits.remainingCredits === 1 ? '' : 's'} remaining.` :
                   `${credits.remainingCredits} of ${credits.totalCredits} credits remaining.`}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold">
                {credits.remainingCredits}
                <span className="text-sm font-normal text-muted-foreground">/{credits.totalCredits}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">credits left</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <Progress
              value={100 - percentage}
              className={`h-2 ${isExhausted ? '[&>div]:bg-red-500' : isLow ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500'}`}
            />
          </div>

          {/* Action buttons */}
          {isExhausted && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <Button
                size="sm"
                variant="default"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                onClick={onUpgradeClick}
              >
                <Crown className="size-4 mr-2" />
                Upgrade Plan
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onConnectMetaClick}
              >
                <Link2 className="size-4 mr-2" />
                Connect WhatsApp Business
              </Button>
            </div>
          )}

          {!isExhausted && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={onConnectMetaClick}
              >
                <Link2 className="size-3 mr-1" />
                Connect own WhatsApp
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs h-7"
                onClick={onUpgradeClick}
              >
                <ArrowUpRight className="size-3 mr-1" />
                Upgrade for unlimited
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exhausted Dialog */}
      <Dialog open={showExhaustedDialog} onOpenChange={setShowExhaustedDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-red-500" />
              WhatsApp Credits Exhausted
            </DialogTitle>
            <DialogDescription>
              You&apos;ve used all {credits.totalCredits} trial WhatsApp credits. Choose an option to continue messaging:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            {/* Option 1: Connect Meta Account */}
            <Card className="cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors" onClick={() => { setShowExhaustedDialog(false); onConnectMetaClick?.() }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center size-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                    <Link2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Connect Your WhatsApp Business</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Link your own Meta Business account for unlimited messaging. Free — use your own API credentials.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Option 2: Upgrade Plan */}
            <Card className="cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors" onClick={() => { setShowExhaustedDialog(false); onUpgradeClick?.() }}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center size-10 rounded-full bg-amber-100 dark:bg-amber-900/50">
                    <Crown className="size-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Upgrade Your Plan</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Get unlimited WhatsApp messaging, campaigns, and broadcasts with a paid plan starting at $10/month.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
