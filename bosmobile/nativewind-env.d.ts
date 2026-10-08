/// <reference types="nativewind/types" />

declare module '*.css';

declare module 'lucide-react-native' {
  import { ComponentType } from 'react';
  const LucideIcon: ComponentType<any>;
  export default LucideIcon;
  export const Sparkles: ComponentType<any>;
  export const Lock: ComponentType<any>;
  export const Mail: ComponentType<any>;
  export const ArrowRight: ComponentType<any>;
  export const ShieldCheck: ComponentType<any>;
  export const X: ComponentType<any>;
  export const Mic: ComponentType<any>;
  export const Send: ComponentType<any>;
  export const Bot: ComponentType<any>;
  export const Check: ComponentType<any>;
  export const Calendar: ComponentType<any>;
  export const Clock: ComponentType<any>;
  export const User: ComponentType<any>;
  export const Phone: ComponentType<any>;
  export const MapPin: ComponentType<any>;
  export const Search: ComponentType<any>;
  export const Filter: ComponentType<any>;
  export const MoreVertical: ComponentType<any>;
  export const ChevronRight: ComponentType<any>;
  export const CheckCircle: ComponentType<any>;
  export const AlertCircle: ComponentType<any>;
  export const MessageSquare: ComponentType<any>;
  export const Tag: ComponentType<any>;
  export const Plus: ComponentType<any>;
  export const DollarSign: ComponentType<any>;
}

import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface ImageProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
  interface ScrollViewProps {
    className?: string;
    contentContainerClassName?: string;
  }
  interface PressableProps {
    className?: string;
  }
}
