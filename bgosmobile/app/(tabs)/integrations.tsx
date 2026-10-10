import React, { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Screen, Card, Action, Badge, Empty, ErrorNotice, Loading, ui } from '../../src/components/ui';
import { useResource } from '../../src/hooks/use-resource';
import { WEB_URL } from '../../src/lib/constants';
type Account = { id: string; platform: string; accountName: string; isActive: boolean; tokenExpiry?: string };
export default function IntegrationsScreen() {
  const resource = useResource<{ data: Account[] }>('/api/social/accounts?includeInactive=true');
  const [error, setError] = useState<string | null>(null);

  return (
    <Screen
      title="Integrations"
      subtitle="Connected publishing accounts and channel setup."
      showBack={true}
      onRefresh={resource.refresh}
    >
      <ErrorNotice message={error || resource.error} retry={resource.refresh} />
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
          Linking.openURL(`${WEB_URL}/app?view=integrations`).catch(() =>
            setError('Could not open the browser.')
          )
        }
      />
    </Screen>
  );
}
