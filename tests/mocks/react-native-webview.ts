import React from 'react';

export const WebView = (props: any) =>
  React.createElement('div', {
    'data-testid': 'mock-webview',
    'data-base-url': props?.source?.baseUrl,
  });

export default WebView;
