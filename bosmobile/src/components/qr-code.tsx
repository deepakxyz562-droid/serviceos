import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { qrSvgPath } from '@/lib/qr';

export interface QrCodeProps {
  /** Payload encoded into the QR (empty/unencodable → renders nothing). */
  data: string;
  /** Fallback wrapper box in dp when `style` does not define one. Default 200. */
  size?: number;
  /** Dark-module color. Default #000000. */
  color?: string;
  /** Wrapper View style — background, border, radius, or an explicit box. */
  style?: StyleProp<ViewStyle>;
}

/**
 * On-device QR renderer — pure-JS encoder + react-native-svg, zero network
 * calls, so no third-party service ever sees the payload. The svg always
 * keeps its 1:1 aspect (square viewBox) and fills the wrapper's content box.
 */
export function QrCode({ data, size = 200, color = '#000000', style }: QrCodeProps) {
  const qr = qrSvgPath(data);
  if (!qr) return null;
  return (
    <View style={style ?? { width: size, height: size }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${qr.size} ${qr.size}`}>
        <Path d={qr.d} fill={color} />
      </Svg>
    </View>
  );
}
