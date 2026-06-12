'use client';

import { CalendarCheck, Clock, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function BookingView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
          <CalendarCheck className="size-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Booking</h2>
          <p className="text-sm text-muted-foreground">Manage service bookings and appointments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CalendarCheck className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Today&apos;s Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Clock className="size-4 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="size-4 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Conflicts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <CheckCircle2 className="size-4 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder */}
      <Card>
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CalendarCheck className="size-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold">Service Booking Management</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Create and manage service bookings, schedule appointments, and handle booking confirmations.
              Connect with your calendar to avoid scheduling conflicts.
            </p>
            <Button className="bg-emerald-600 hover:bg-emerald-700"><CalendarCheck className="size-4 mr-1.5" /> New Booking</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
