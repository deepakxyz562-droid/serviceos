import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === "ios" ? 12 : 8);
  const tabHeight = 52 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginBottom: Platform.OS === "ios" ? 2 : 4,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        tabBarStyle: {
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 4,
          backgroundColor: "#ffffff",
          borderTopColor: "#e2e8f0",
          borderTopWidth: 1,
          elevation: 8,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
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

function Icon({ name, color }: { name: string; color: any }) {
  // Cast to any because not all icon names are typed
  return <MaterialIcons name={name as any} size={24} color={color} />;
}
