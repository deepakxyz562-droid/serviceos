import React from 'react';
import { Redirect } from 'expo-router';

export default function CustomersRedirect() {
  return <Redirect href="/(tabs)/customers" />;
}
