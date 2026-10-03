import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 4,
          backgroundColor: "#ffffff",
          borderTopColor: "#f1f5f9",
        },
      }}
    >
      <Tabs.Screen
        name="invoices"
        options={{
          title: "Invoices",
          tabBarIcon: ({ color }) => <Icon name="receipt-long" color={color} />,
        }}
      />
      <Tabs.Screen
        name="quotes"
        options={{
          title: "Estimates",
          tabBarIcon: ({ color }) => <Icon name="calculate" color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: "Clients",
          tabBarIcon: ({ color }) => <Icon name="person-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="items"
        options={{
          title: "Items",
          tabBarIcon: ({ color }) => <Icon name="assignment" color={color} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          href: null, // Hide legacy home tab from bottom bar
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "More",
          tabBarIcon: ({ color }) => <Icon name="more-horiz" color={color} />,
        }}
      />
    </Tabs>
  );
}

function Icon({ name, color }: { name: string; color: string }) {
  // Cast to any because not all icon names are typed
  return <MaterialIcons name={name as any} size={24} color={color} />;
}
