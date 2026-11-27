import React, { useState } from 'react';
import { FlatList, Modal, RefreshControl, Text, View } from 'react-native';
import { Screen, Card, Action, Empty, ErrorNotice, Loading, ui, colors } from '../src/components/ui';
import { useResource } from '../src/hooks/use-resource';
import { withProtectedRoute } from '../src/components/navigation/protected-route';
type Response = { id: string; form: { name: string }; respondentName: string; respondent?: string; createdAt: string; data: Record<string, unknown> };
function ResponsesScreen() {
  const resource = useResource<{ responses: Response[] }>('/api/forms/responses?limit=100', 15000);
  const [selected, setSelected] = useState<Response | null>(null);
  const responses = resource.data?.responses || [];

  return (
    <Screen
      title="Form responses"
      subtitle="Every inquiry, ready for your next step."
      showBack={true}
      scrollable={false}
    >
      <FlatList
        data={responses}
        keyExtractor={(r) => r.id}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={resource.loading}
            onRefresh={() => void resource.refresh()}
            tintColor={colors.brand}
          />
        }
        ListHeaderComponent={<ErrorNotice message={resource.error} retry={resource.refresh} />}
        ListEmptyComponent={
          resource.loading ? (
            <Loading />
          ) : !resource.error ? (
            <Empty
              title="Waiting for your first response"
              detail="Publish a form in BGOS web and share its link with your customers."
            />
          ) : undefined
        }
        renderItem={({ item: r }) => (
          <Card>
            <Text style={ui.heading}>{r.respondentName}</Text>
            <Text style={ui.body}>{r.form.name} · {new Date(r.createdAt).toLocaleString()}</Text>
            <Action secondary label="View response" onPress={() => setSelected(r)} />
          </Card>
        )}
      />

      <Modal visible={!!selected} onRequestClose={() => setSelected(null)} animationType="slide">
        <Screen
          title={selected?.respondentName || 'Response'}
          subtitle={selected?.form.name || ''}
          showBack={true}
          onBack={() => setSelected(null)}
        >
          <Action secondary label="← Back to responses" onPress={() => setSelected(null)} />
          {Object.entries(selected?.data || {}).map(([key, value]) => (
            <Card key={key}>
              <Text style={ui.label}>{key}</Text>
              <Text style={ui.body}>{typeof value === 'string' ? value : JSON.stringify(value)}</Text>
            </Card>
          ))}
        </Screen>
      </Modal>
    </Screen>
  );
}

export default withProtectedRoute(ResponsesScreen);
