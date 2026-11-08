import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { Card } from '@/components/ui/Card';
import { parseJobArray } from '@/lib/job-presentation';
import type { Job } from '@/types';

export function JobBrief({ job }: { job: Job }) {
  const fields = parseJobArray<{ label?: string; value?: unknown }>(job.customFieldsJson);
  const attachments = parseJobArray<{ name?: string; url?: string }>(job.attachmentsJson)
    .filter((file) => typeof file.url === 'string' && /^https?:\/\//i.test(file.url));
  const assignee = job.assignee?.name || job.assigneeName || job.employee?.name;
  return (
    <View className="gap-3">
      <Card>
        <Text className="text-base font-bold text-foreground">Scope of work</Text>
        <Text selectable className="mt-2 text-sm leading-6 text-foreground">{job.description?.trim() || 'No work description provided. Check with dispatch if the scope is unclear.'}</Text>
        <View className="mt-4 border-t border-border pt-3">
          <Text className="text-xs font-semibold text-muted-foreground">ASSIGNED TO</Text>
          <Text className="mt-1 text-sm text-foreground">{assignee || 'Assignment not provided'}</Text>
        </View>
      </Card>
      <Card className="border-amber-200 bg-amber-50">
        <Text className="text-base font-bold text-foreground">Before you arrive</Text>
        <Text selectable className="mt-2 text-sm leading-6 text-foreground">{job.visitInstructions?.trim() || 'No site access or visit instructions provided.'}</Text>
      </Card>
      <Card>
        <Text className="text-base font-bold text-foreground">Customer contact</Text>
        <Text className="mt-2 text-sm text-foreground">{job.customer?.name || 'Customer name not provided'}</Text>
        <Text selectable className="mt-2 text-sm text-muted-foreground">{job.customer?.phone || 'Phone number not provided'}</Text>
        <Text selectable className="mt-2 text-sm text-muted-foreground">{job.customer?.email || 'Email not provided'}</Text>
      </Card>
      {fields.length > 0 && <Card>
        <Text className="mb-2 text-base font-bold text-foreground">Additional job information</Text>
        {fields.filter((field) => field.label).map((field, index) => (
          <View key={index} className="py-2">
            <Text className="text-xs font-semibold text-muted-foreground">{field.label}</Text>
            <Text selectable className="mt-1 text-sm text-foreground">{['string', 'number', 'boolean'].includes(typeof field.value) ? String(field.value) : 'Not provided'}</Text>
          </View>
        ))}
      </Card>}
      {attachments.length > 0 && <Card>
        <Text className="mb-2 text-base font-bold text-foreground">Reference files</Text>
        {attachments.map((file, index) => <Pressable key={index} accessibilityRole="link" onPress={() => Linking.openURL(file.url!)} className="min-h-[48px] justify-center border-b border-border py-3">
          <Text className="text-sm font-semibold text-primary-700">{file.name || `Attachment ${index + 1}`} ↗</Text>
        </Pressable>)}
      </Card>}
      {job.completionNotes && <Card>
        <Text className="text-base font-bold text-foreground">Completion summary</Text>
        <Text selectable className="mt-2 text-sm leading-6 text-foreground">{job.completionNotes}</Text>
      </Card>}
    </View>
  );
}
