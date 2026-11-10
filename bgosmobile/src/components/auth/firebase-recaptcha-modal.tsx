import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { WebView, type WebViewProps } from 'react-native-webview';
import {
  FirebaseRecaptchaCancelledError,
  getMobileFirebaseWebConfig,
} from '../../lib/firebase-auth';
import { BRAND } from '../../lib/constants';

const colors = {
  surface: '#FFFFFF',
  ink: BRAND.inkColor,
  muted: '#60758A',
  line: '#E2E8F0',
  brand: BRAND.primaryColor,
  brandDark: '#008A45',
  brandSoft: '#E8F8EF',
  softHover: '#D1F0DE',
  danger: '#BA3547',
  dangerSoft: '#FFF1F0',
};

const FIREBASE_JS_VERSION = '10.14.1';
const INVISIBLE_MANUAL_HINT_MS = 7000;

export interface FirebaseRecaptchaModalHandle {
  verify: (phoneLabel?: string) => Promise<string>;
}

type RecaptchaWidgetMode = 'invisible' | 'normal';

interface PendingVerification {
  id: number;
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}

interface BridgeMessage {
  requestId?: number;
  type?: 'ready' | 'challenge' | 'token' | 'error' | 'dismissed';
  visible?: boolean;
  token?: string;
  message?: string;
  code?: string;
}

/**
 * Strict allowlist for requests inside the embedded Firebase reCAPTCHA WebView.
 * Blocks links like Google Privacy / Terms from navigating inside or escaping out of the app.
 */
export function isAllowedRecaptchaWebViewUrl(url: string, allowedBaseOrigin: string): boolean {
  if (!url) return false;
  if (
    url === 'about:blank' ||
    url.startsWith('about:srcdoc') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return true;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return false;
    }

    if (parsed.origin === allowedBaseOrigin) {
      return true;
    }

    const host = parsed.hostname.toLowerCase();
    if (host === 'www.google.com' || host === 'google.com') {
      return parsed.pathname.startsWith('/recaptcha/');
    }
    if (host === 'www.recaptcha.net' || host === 'recaptcha.net') {
      return parsed.pathname.startsWith('/recaptcha/');
    }

    return (
      host === 'www.gstatic.com' ||
      host === 'gstatic.com' ||
      host === 'apis.google.com' ||
      host === 'identitytoolkit.googleapis.com' ||
      host === 'securetoken.googleapis.com'
    );
  } catch {
    return false;
  }
}

export function buildFirebaseRecaptchaHtml({
  apiKey,
  authDomain,
  projectId,
  mode,
  requestId,
}: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  mode: RecaptchaWidgetMode;
  requestId: number;
}): string {
  const firebaseConfigJson = JSON.stringify({ apiKey, authDomain, projectId });
  const modeJson = JSON.stringify(mode);
  const requestIdJson = JSON.stringify(requestId);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>BGOS Security Verification</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #ffffff;
      color: #070B2D;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow-x: hidden;
    }
    .wrap {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px 16px;
      text-align: center;
      gap: 14px;
    }
    .status {
      font-size: 13px;
      color: #60758A;
      line-height: 1.45;
      max-width: 280px;
    }
    #recaptcha-container {
      min-height: 78px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div id="status-text" class="status">${
      mode === 'normal'
        ? 'Tap the checkbox below to receive your SMS OTP.'
        : 'Completing Firebase verification…'
    }</div>
    <div id="recaptcha-container"></div>
  </div>
  <script src="https://www.gstatic.com/firebasejs/${FIREBASE_JS_VERSION}/firebase-app-compat.js" onerror="window.__bgosScriptError && window.__bgosScriptError('Firebase app script failed to load')"></script>
  <script src="https://www.gstatic.com/firebasejs/${FIREBASE_JS_VERSION}/firebase-auth-compat.js" onerror="window.__bgosScriptError && window.__bgosScriptError('Firebase auth script failed to load')"></script>
  <script>
    (function () {
      var FIREBASE_CONFIG = ${firebaseConfigJson};
      var MODE = ${modeJson};
      var REQUEST_ID = ${requestIdJson};
      var settled = false;
      var lastChallengeVisible = false;
      var challengeDismissTimer = null;
      var pollTimer = null;

      function post(payload) {
        try {
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ requestId: REQUEST_ID }, payload)));
          }
        } catch (_) {}
      }

      window.__bgosScriptError = function (msg) {
        if (settled) return;
        settled = true;
        post({ type: 'error', message: msg || 'Security check scripts could not be loaded.' });
      };

      function stopMonitoring() {
        if (challengeDismissTimer) {
          clearTimeout(challengeDismissTimer);
          challengeDismissTimer = null;
        }
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      }

      function onToken(token) {
        if (settled || !token) return;
        settled = true;
        stopMonitoring();
        post({ type: 'token', token: String(token) });
      }

      function onFailure(err, fallbackMsg) {
        if (settled) return;
        settled = true;
        stopMonitoring();
        var code = err && typeof err.code === 'string' ? err.code : '';
        var msg = err && typeof err.message === 'string' ? err.message : (fallbackMsg || 'Security check could not be completed.');
        post({ type: 'error', code: code, message: msg });
      }

      function isChallengeFrameVisible() {
        var frames = document.querySelectorAll('iframe[src*="bframe"], iframe[title*="recaptcha challenge"]');
        for (var i = 0; i < frames.length; i++) {
          var frame = frames[i];
          var rect = frame.getBoundingClientRect();
          if (rect.width < 120 || rect.height < 120) continue;
          var visible = true;
          var el = frame;
          while (el && el.nodeType === 1) {
            var cs = window.getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') < 0.1) {
              visible = false;
              break;
            }
            el = el.parentElement;
          }
          if (visible) return true;
        }
        return false;
      }

      function checkChallengeVisibility() {
        if (settled || MODE !== 'invisible') return;
        var visible = isChallengeFrameVisible();
        if (visible) {
          if (challengeDismissTimer) {
            clearTimeout(challengeDismissTimer);
            challengeDismissTimer = null;
          }
          if (!lastChallengeVisible) {
            lastChallengeVisible = true;
            post({ type: 'challenge', visible: true });
          }
        } else if (lastChallengeVisible && !challengeDismissTimer) {
          challengeDismissTimer = setTimeout(function () {
            challengeDismissTimer = null;
            if (!settled && lastChallengeVisible && !isChallengeFrameVisible()) {
              lastChallengeVisible = false;
              post({ type: 'dismissed' });
            }
          }, 1200);
        }
      }

      function startChallengeObserver() {
        if (MODE !== 'invisible') return;
        if (typeof MutationObserver === 'function' && document.body) {
          var observer = new MutationObserver(checkChallengeVisibility);
          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['style', 'class', 'src']
          });
        }
        pollTimer = setInterval(checkChallengeVisibility, 250);
      }

      function start() {
        if (!window.firebase || !firebase.auth || !firebase.auth.RecaptchaVerifier) {
          onFailure(null, 'Firebase verification SDK did not initialize.');
          return;
        }

        try {
          var app = (firebase.apps && firebase.apps.length)
            ? firebase.apps[0]
            : firebase.initializeApp(FIREBASE_CONFIG);
          var auth = app.auth();
          var container = document.getElementById('recaptcha-container');
          container.innerHTML = '';

          startChallengeObserver();

          var verifier = new firebase.auth.RecaptchaVerifier(container, {
            size: MODE,
            callback: function (token) {
              onToken(token);
            },
            'expired-callback': function () {
              onFailure({ code: 'auth/captcha-check-failed' }, 'Security check expired. Please tap Retry.');
            },
            'error-callback': function () {
              onFailure({ code: 'auth/captcha-check-failed' }, 'Security check failed to load. Please check your internet and tap Retry.');
            }
          });

          verifier.render().then(function () {
            post({ type: 'ready' });
            if (MODE === 'normal') {
              post({ type: 'challenge', visible: true });
            }
            return verifier.verify();
          }).then(function (token) {
            onToken(token);
          }).catch(function (err) {
            onFailure(err, 'Security verification failed. Please tap Retry.');
          });
        } catch (err) {
          onFailure(err, 'Could not start Firebase verification.');
        }
      }

      if (document.readyState === 'complete') {
        start();
      } else {
        window.addEventListener('load', start);
      }
    })();
  </script>
</body>
</html>`;
}

export const FirebaseRecaptchaModal = forwardRef<FirebaseRecaptchaModalHandle>(
  function FirebaseRecaptchaModal(_props, ref) {
    const { height: windowHeight } = useWindowDimensions();
    const firebaseConfig = useMemo(() => getMobileFirebaseWebConfig(), []);
    const baseUrl = useMemo(
      () => `https://${firebaseConfig.authDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '')}`,
      [firebaseConfig.authDomain],
    );

    const pendingRef = useRef<PendingVerification | null>(null);
    const requestSeqRef = useRef(0);
    const manualHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [visible, setVisible] = useState(false);
    const [requestId, setRequestId] = useState(0);
    const [attemptKey, setAttemptKey] = useState(0);
    const [phoneLabel, setPhoneLabel] = useState('');
    const [mode, setMode] = useState<RecaptchaWidgetMode>('invisible');
    const [challengeVisible, setChallengeVisible] = useState(false);
    const [showManualHint, setShowManualHint] = useState(false);
    const [webError, setWebError] = useState<string | null>(null);

    const clearManualTimer = useCallback(() => {
      if (manualHintTimerRef.current) {
        clearTimeout(manualHintTimerRef.current);
        manualHintTimerRef.current = null;
      }
    }, []);

    const scheduleManualHint = useCallback(() => {
      clearManualTimer();
      manualHintTimerRef.current = setTimeout(() => {
        setShowManualHint(true);
      }, INVISIBLE_MANUAL_HINT_MS);
    }, [clearManualTimer]);

    const settleCancel = useCallback(() => {
      clearManualTimer();
      const pending = pendingRef.current;
      pendingRef.current = null;
      setVisible(false);
      setChallengeVisible(false);
      setShowManualHint(false);
      setWebError(null);
      if (pending) {
        pending.reject(new FirebaseRecaptchaCancelledError());
      }
    }, [clearManualTimer]);

    useEffect(() => {
      return () => {
        clearManualTimer();
        if (pendingRef.current) {
          const dangling = pendingRef.current;
          pendingRef.current = null;
          dangling.reject(new FirebaseRecaptchaCancelledError());
        }
      };
    }, [clearManualTimer]);

    useImperativeHandle(
      ref,
      () => ({
        verify: (nextPhoneLabel?: string) => {
          if (pendingRef.current) {
            pendingRef.current.reject(new FirebaseRecaptchaCancelledError());
            pendingRef.current = null;
          }
          clearManualTimer();

          return new Promise<string>((resolve, reject) => {
            requestSeqRef.current += 1;
            const nextId = requestSeqRef.current;
            pendingRef.current = { id: nextId, resolve, reject };

            setRequestId(nextId);
            setPhoneLabel(nextPhoneLabel || '');
            setMode('invisible');
            setChallengeVisible(false);
            setShowManualHint(false);
            setWebError(null);
            setAttemptKey((k) => k + 1);
            setVisible(true);
            scheduleManualHint();
          });
        },
      }),
      [clearManualTimer, scheduleManualHint],
    );

    const html = useMemo(
      () =>
        buildFirebaseRecaptchaHtml({
          apiKey: firebaseConfig.apiKey,
          authDomain: firebaseConfig.authDomain,
          projectId: firebaseConfig.projectId,
          mode,
          requestId,
        }),
      [firebaseConfig.apiKey, firebaseConfig.authDomain, firebaseConfig.projectId, mode, requestId],
    );

    const handleRetry = useCallback(
      (nextMode: RecaptchaWidgetMode = mode) => {
        setMode(nextMode);
        setWebError(null);
        setChallengeVisible(nextMode === 'normal');
        setShowManualHint(false);
        setAttemptKey((k) => k + 1);
        if (nextMode === 'invisible') {
          scheduleManualHint();
        } else {
          clearManualTimer();
        }
      },
      [clearManualTimer, mode, scheduleManualHint],
    );

    const handleMessage = useCallback<NonNullable<WebViewProps['onMessage']>>(
      (event) => {
        let parsed: BridgeMessage | null = null;
        try {
          parsed = JSON.parse(event.nativeEvent.data) as BridgeMessage;
        } catch {
          return;
        }
        if (!parsed || !pendingRef.current || parsed.requestId !== pendingRef.current.id) {
          return;
        }

        if (parsed.type === 'token' && typeof parsed.token === 'string' && parsed.token.trim()) {
          clearManualTimer();
          const pending = pendingRef.current;
          pendingRef.current = null;
          setVisible(false);
          setChallengeVisible(false);
          setShowManualHint(false);
          setWebError(null);
          pending.resolve(parsed.token.trim());
          return;
        }

        if (parsed.type === 'challenge') {
          const isVis = Boolean(parsed.visible);
          setChallengeVisible(isVis);
          if (isVis) {
            clearManualTimer();
            setShowManualHint(false);
            setWebError(null);
          }
          return;
        }

        if (parsed.type === 'dismissed') {
          setChallengeVisible(false);
          setWebError('Security check was closed before finishing. Tap Retry to try again.');
          return;
        }

        if (parsed.type === 'error') {
          clearManualTimer();
          setChallengeVisible(false);
          const rawMsg = parsed.message || parsed.code || '';
          if (rawMsg.includes('unauthorized-domain')) {
            setWebError('Verification domain is not authorized in Firebase settings.');
          } else {
            setWebError(rawMsg || 'Security check could not be completed. Tap Retry.');
          }
        }
      },
      [clearManualTimer],
    );

    const showInteractiveArea = challengeVisible || mode === 'normal';
    const interactiveHeight = Math.max(380, Math.min(520, Math.round(windowHeight * 0.72)));

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={settleCancel}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(7, 11, 45, 0.55)',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 16,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: colors.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.line,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.16,
              shadowRadius: 24,
              elevation: 8,
            }}
          >
            {/* Native In-App Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 18,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: '#EEF2F6',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    backgroundColor: colors.brandSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name="verified-user" size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink }}>
                    Securing OTP Delivery
                  </Text>
                  {phoneLabel ? (
                    <Text numberOfLines={1} style={{ fontSize: 12, color: colors.muted }}>
                      {phoneLabel}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Cancel security verification"
                onPress={settleCancel}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F1F5F9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <MaterialIcons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>

            {/* Body: compact card during silent check, full viewport when interactive puzzle opens */}
            <View
              style={{
                position: 'relative',
                width: '100%',
                height: showInteractiveArea ? interactiveHeight : webError ? 230 : showManualHint ? 225 : 180,
                backgroundColor: '#FFFFFF',
              }}
            >
              {visible ? (
                <View
                  pointerEvents={showInteractiveArea && !webError ? 'auto' : 'none'}
                  style={
                    showInteractiveArea && !webError
                      ? { flex: 1 }
                      : {
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: interactiveHeight,
                          opacity: 0.01,
                        }
                  }
                >
                  <WebView
                    key={`${requestId}_${attemptKey}_${mode}`}
                    source={{ html, baseUrl }}
                    originWhitelist={['*']}
                    javaScriptEnabled
                    domStorageEnabled
                    thirdPartyCookiesEnabled
                    sharedCookiesEnabled
                    mixedContentMode="never"
                    javaScriptCanOpenWindowsAutomatically={false}
                    setSupportMultipleWindows
                    onOpenWindow={() => {}}
                    onShouldStartLoadWithRequest={(req) =>
                      isAllowedRecaptchaWebViewUrl(req.url, baseUrl)
                    }
                    onMessage={handleMessage}
                    onError={() => {
                      clearManualTimer();
                      setChallengeVisible(false);
                      setWebError('Unable to reach Google verification. Check your internet and tap Retry.');
                    }}
                    onHttpError={() => {
                      clearManualTimer();
                      setChallengeVisible(false);
                      setWebError('Verification service returned an error. Please tap Retry.');
                    }}
                    onRenderProcessGone={() => {
                      clearManualTimer();
                      setChallengeVisible(false);
                      setWebError('Security check view restarted unexpectedly. Please tap Retry.');
                    }}
                    onContentProcessDidTerminate={() => {
                      clearManualTimer();
                      setChallengeVisible(false);
                      setWebError('Security check view closed unexpectedly. Please tap Retry.');
                    }}
                    style={{ flex: 1, backgroundColor: '#FFFFFF' }}
                  />
                </View>
              ) : null}

              {/* Error Overlay */}
              {webError ? (
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 22,
                    paddingVertical: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: colors.dangerSoft,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialIcons name="error-outline" size={22} color={colors.danger} />
                  </View>
                  <Text style={{ fontSize: 13.5, lineHeight: 19, color: colors.ink, textAlign: 'center', fontWeight: '600' }}>
                    {webError}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Pressable
                      onPress={settleCancel}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.line,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.muted }}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRetry(mode)}
                      style={{
                        paddingHorizontal: 18,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor: colors.brand,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>Retry</Text>
                    </Pressable>
                  </View>
                </View>
              ) : !showInteractiveArea ? (
                /* Compact Silent Check Overlay */
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FFFFFF',
                    paddingHorizontal: 22,
                    paddingVertical: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 12,
                  }}
                >
                  <ActivityIndicator size="large" color={colors.brand} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink, textAlign: 'center' }}>
                    Verifying device & sending OTP…
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', lineHeight: 17 }}>
                    Quick automatic check — you&apos;ll stay right inside BGOS.
                  </Text>
                  {showManualHint ? (
                    <Pressable
                      onPress={() => handleRetry('normal')}
                      style={{
                        marginTop: 2,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 9,
                        backgroundColor: colors.brandSoft,
                        borderWidth: 1,
                        borderColor: colors.softHover,
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.brandDark }}>
                        Taking long? Verify manually
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>

            {/* Footer bar when interactive puzzle is visible */}
            {showInteractiveArea && !webError ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: '#EEF2F6',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <Pressable hitSlop={8} onPress={() => handleRetry(mode)}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.brand }}>
                    Reload check
                  </Text>
                </Pressable>
                <Pressable hitSlop={8} onPress={settleCancel}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: colors.muted }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    );
  },
);
