'use client';

import { Calendar, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function CalendarView() {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Calendar className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Calendar</h2>
            <p className="text-sm text-muted-foreground">Schedule and manage appointments</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700"><Plus className="size-4 mr-1.5" /> New Event</Button>
      </div>

      {/* Calendar navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="icon"><ChevronLeft className="size-4" /></Button>
            <h3 className="text-lg font-semibold">{monthName}</h3>
            <Button variant="outline" size="icon"><ChevronRight className="size-4" /></Button>
          </div>

          {/* Days header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
            ))}
          </div>

          {/* Calendar grid placeholder */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }, (_, i) => (
              <div
                key={i}
                className="min-h-[80px] border rounded p-1 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                <span className="text-[10px]">{i + 1}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
