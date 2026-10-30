import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Screen, Card, Action, Badge, Empty, ErrorNotice, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { getBgosChannelsWebUrl } from '../../src/lib/bgos-urls';
type Account = { id: string; platform: string; accountName: string; isActive: boolean; tokenExpiry?: string };
type WhatsAppTemplateSetup = {
  setupStatus?: {
    metaConnected: boolean;
    templatesApproved: number;
    templatesImported: number;
    totalTemplates: number;
  };
};
type WhatsAppConfig = {
  isConfigured: boolean;
  mode: string;
  phoneNumberId: string;
  source?: 'platform' | 'tenant' | 'custom' | string;
};

export default function IntegrationsScreen() {
  const resource = useResource<{ data: Account[] }>('/api/social/accounts?includeInactive=true');
  const waConfig = useResource<WhatsAppConfig>('/api/whatsapp/config');
  const waTemplates = useResource<WhatsAppTemplateSetup>('/api/whatsapp/templates?setup=true');
  const [error, setError] = useState<string | null>(null);

  const refreshAll = async () => {
    await Promise.all([resource.refresh(), waConfig.refresh(), waTemplates.refresh()]);
  };

  // Real template counts — only shown when the API actually reports them.
  const setupStatus = waTemplates.data?.setupStatus;
  const approvedCount =
    setupStatus && typeof setupStatus.templatesApproved === 'number' && setupStatus.metaConnected
      ? setupStatus.templatesApproved
      : null;

  const isPlatformManaged = waConfig.data?.source === 'platform';

  return (
    <Screen
      title="Channels & Integrations"
      subtitle="Connected social accounts and customer messaging channels."
      showBack={true}
      onRefresh={refreshAll}
    >
      <ErrorNotice message={error || resource.error || waConfig.error} retry={refreshAll} />

      {/* WhatsApp Business Messaging Card */}
      {waConfig.data?.isConfigured && (
        <Card style={{ borderColor: '#25D366', backgroundColor: '#F0FDF4' }}>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={[ui.heading, { flex: 1, color: '#166534' }]}>WhatsApp Business Messaging</Text>
            <Badge
              label={isPlatformManaged ? 'System Delivery · Active' : 'Custom Number · Active'}
              success
            />
          </View>
          <Text style={[ui.body, { color: '#15803D' }]}>
            {isPlatformManaged
              ? 'BGOS manages automated transactional booking confirmations, customer alerts, and review requests on your behalf.'
              : approvedCount != null
              ? `${approvedCount} Meta-approved template${approvedCount === 1 ? '' : 's'} available for customer bookings and alerts.`
              : 'Your custom WhatsApp Business number is connected and ready for customer communication.'}
          </Text>
          <Text style={[ui.caption, { color: '#166534' }]}>
            {isPlatformManaged
              ? 'Delivery: Managed by BGOS Cloud Gateway'
              : `Phone ID: ${waConfig.data.phoneNumberId || 'Registered'}`}
          </Text>
        </Card>
      )}
      {resource.loading ? (
        <Loading />
      ) : resource.data?.data.length ? (
        resource.data.data.map((account) => (
          <Card key={account.id}>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={[ui.heading, { flex: 1 }]}>{account.accountName}</Text>
              <Badge
                label={
                  !account.isActive
                    ? 'Inactive'
                    : account.tokenExpiry && new Date(account.tokenExpiry).getTime() < Date.now()
                    ? 'Check connection'
                    : 'Configured'
                }
                success={
                  account.isActive &&
                  !(account.tokenExpiry && new Date(account.tokenExpiry).getTime() < Date.now())
                }
              />
            </View>
            <Text style={ui.body}>{account.platform}</Text>
          </Card>
        ))
      ) : (
        !resource.error && (
          <Empty
            title="Connect your first channel"
            detail="Authorize your business accounts in the secure web connection flow."
          />
        )
      )}
      <Text style={ui.caption}>
        Configured accounts may still require renewed permissions. Delivery status is shown on each post.
      </Text>
      <Action
        label="Manage channels · Web"
        onPress={() =>
          Linking.openURL(getBgosChannelsWebUrl()).catch(() =>
            setError('Could not open the browser.')
          )
        }
      />
    </Screen>
  );
}
