'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Clock, MapPin, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Service {
  id: string
  name: string
  description?: string | null
  basePrice: number
  duration: number
  category: string
}

interface NewBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function apiUrl(path: string) {
  return `${path}?XTransformPort=3000`
}

export function NewBookingDialog({ open, onOpenChange, onSuccess }: NewBookingDialogProps) {
  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [serviceId, setServiceId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  const fetchServices = useCallback(async () => {
    setServicesLoading(true)
    try {
      const res = await fetch(apiUrl('/api/services'), { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load services')
      const data = await res.json()
      setServices(data.services || data || [])
    } catch {
      setServices([])
    } finally {
      setServicesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchServices()
      setError(null)
    }
  }, [open, fetchServices])

  const selectedService = services.find(s => s.id === serviceId)

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async () => {
    setError(null)

    if (!serviceId) {
      setError('Please select a service.')
      return
    }
    if (!scheduledDate || !scheduledTime) {
      setError('Please choose a date and time.')
      return
    }
    if (!address.trim()) {
      setError('Please enter the service address.')
      return
    }

    // Validate future date/time
    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`)
    if (scheduledAt < new Date()) {
      setError('Please choose a future date and time.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(apiUrl('/api/bookings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: selectedService?.name || 'Service Booking',
          serviceId,
          scheduledAt: scheduledAt.toISOString(),
          duration: selectedService?.duration || 60,
          address: address.trim(),
          notes: notes.trim() || undefined,
          source: 'website',
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to create booking')
      }

      toast.success('Booking created! We will confirm it shortly.')
      // Reset form
      setServiceId('')
      setScheduledDate('')
      setScheduledTime('')
      setAddress('')
      setNotes('')
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-teal-600" />
            Book a Service
          </DialogTitle>
          <DialogDescription>
            Choose a service and pick a time that works for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Service picker */}
          <div className="space-y-2">
            <Label htmlFor="service">Service *</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger id="service">
                <SelectValue placeholder={servicesLoading ? 'Loading services...' : 'Select a service'} />
              </SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ₹{s.basePrice} · {s.duration} min
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service info */}
          {selectedService && (
            <div className="rounded-lg bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 p-3 text-sm">
              <p className="font-medium text-teal-900 dark:text-teal-100">{selectedService.name}</p>
              {selectedService.description && (
                <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">{selectedService.description}</p>
              )}
              <p className="text-xs text-teal-700 dark:text-teal-300 mt-1">
                Estimated duration: {selectedService.duration} min · ₹{selectedService.basePrice}
              </p>
            </div>
          )}

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                min={today}
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
              />
            </div>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Service Address *</Label>
            <Textarea
              id="address"
              placeholder="Flat / House no, Street, Area, City"
              value={address}
              onChange={e => setAddress(e.target.value)}
              rows={2}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific requirements or instructions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || servicesLoading}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Booking...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                Confirm Booking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
