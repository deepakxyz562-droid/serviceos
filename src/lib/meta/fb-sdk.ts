export interface FbLoginResponse {
  status?: string;
  authResponse?: {
    code?: string;
    state?: string;
    accessToken?: string;
    userID?: string;
  } | null;
}

export interface FbSdkGlobal {
  init?: (config: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  login?: (
    callback: (response: FbLoginResponse) => void,
    options?: Record<string, unknown>,
  ) => void;
}

export function getLoadedFbSdk(): FbSdkGlobal | null {
  if (typeof window === 'undefined') return null;
  const fb = (window as unknown as { FB?: FbSdkGlobal }).FB;
  return fb && typeof fb.login === 'function' ? fb : null;
}

function initFbSdk(fb: FbSdkGlobal, appId: string) {
  fb.init?.({
    appId,
    cookie: true,
    xfbml: true,
    version: 'v21.0',
  });
}

/**
 * Lazily loads and initializes the Meta Facebook JS SDK exactly once.
 */
export function loadFBSDK(explicitAppId?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Facebook SDK requires a browser window'));
      return;
    }

    const existingFb = getLoadedFbSdk();
    if (existingFb) {
      resolve();
      return;
    }

    const win = window as unknown as {
      FB?: FbSdkGlobal;
      __bgosFbSdkPromise?: Promise<void>;
      fbAsyncInit?: () => void;
    };

    if (win.__bgosFbSdkPromise) {
      win.__bgosFbSdkPromise.then(resolve, reject);
      return;
    }

    const appId =
      explicitAppId ||
      process.env.NEXT_PUBLIC_META_APP_ID ||
      process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    if (!appId) {
      reject(new Error('NEXT_PUBLIC_META_APP_ID not set'));
      return;
    }

    const p = new Promise<void>((resInner, rejInner) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src*="connect.facebook.net"]',
      );
      if (existingScript && win.FB?.init) {
        initFbSdk(win.FB, appId);
        resInner();
        return;
      }

      const prevAsyncInit = win.fbAsyncInit;
      win.fbAsyncInit = () => {
        prevAsyncInit?.();
        if (win.FB) {
          initFbSdk(win.FB, appId);
          resInner();
        }
      };

      const script = existingScript || document.createElement('script');
      if (!existingScript) {
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
      }

      const onLoad = () => {
        if (win.FB) {
          initFbSdk(win.FB, appId);
          resInner();
        }
      };

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener(
        'error',
        () => {
          delete win.__bgosFbSdkPromise;
          rejInner(new Error('Failed to load Facebook SDK'));
        },
        { once: true },
      );

      if (!existingScript) {
        document.head.appendChild(script);
      }
    });

    win.__bgosFbSdkPromise = p;
    p.then(resolve, reject);
  });
}

/**
 * Meta's JS SDK validates `FB.login(callback, ...)` using a strict function type check
 * and throws "Expression is of type asyncfunction, not function" if an `async` function
 * is passed directly. Always wrap the response handler in a plain synchronous `function`.
 */
export function invokeFbLogin(
  options: Record<string, unknown>,
  onResponse: (response: FbLoginResponse) => void | Promise<void>,
): void {
  const fb = getLoadedFbSdk();
  if (!fb?.login) {
    throw new Error('Facebook SDK is not initialized yet.');
  }

  const syncCallback = function fbLoginSyncCallback(response: FbLoginResponse) {
    try {
      const result = onResponse(response || {});
      if (result && typeof (result as Promise<void>).catch === 'function') {
        void (result as Promise<void>).catch((err) => {
          console.error('[meta/fb-sdk] FB.login response handler error:', err);
        });
      }
    } catch (err) {
      console.error('[meta/fb-sdk] Synchronous FB.login callback error:', err);
    }
  };

  fb.login(syncCallback, options);
}
