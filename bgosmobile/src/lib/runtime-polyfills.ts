import React from 'react';

/**
 * Polyfill React.use for environments (such as Expo Go or runtimes without React 19)
 * where Expo Router's useRouter hook calls `React.use(PreviewRouteContext)`.
 */
if (typeof (React as any).use !== 'function') {
  (React as any).use = function (contextOrPromise: any) {
    if (
      contextOrPromise &&
      (contextOrPromise.$$typeof === Symbol.for('react.context') ||
        contextOrPromise._currentValue !== undefined)
    ) {
      return React.useContext(contextOrPromise);
    }
    return undefined;
  };
}
