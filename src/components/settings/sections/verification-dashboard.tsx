'use client';

/**
 * VerificationDashboard
 * ----------------------
 * Dynamic verification UI that shows available methods + current trust level.
 *
 * Phase 9-10 + Gate B UI:
 *   - Fetches verification status from /api/verification/status
 *   - Shows trust level (0=Unverified, 1=Contact Verified, 2=Business Verified)
 *   - Phone OTP verification (user-supplied for new businesses)
 *   - Email OTP verification (user-supplied for new businesses)
 *   - Google Business Profile verification (OAuth redirect)
 *   - Document upload (redirect to claim flow)
 *   - Representative declaration status
 *
 * Each method shows its current state (verified/pending/not started) and
 * only offers methods that make sense for the business.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Phone,
  Mail,
  Globe,
  FileText,
  CheckCircle2,
  Loader2,
  KeyRound,
  Award,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';

interface VerificationStatus {
  level: number;
  levelLabel: string;
  phoneVerified: boolean;
  emailVerified: boolean;
  googleBusinessVerified: boolean;
  websiteVerified: boolean;
  documentVerified: boolean;
  representativeDeclared: boolean;
  strongMethods: string[];
  supportingMethods: string[];
  nextSteps?: string[];
}

interface VerificationDashboardProps {
  tenantId: string;
  /** For existing listings, the masked phone/email from the anchor API */
  listingPhoneMasked?: string | null;
  listingEmailMasked?: string | null;
  /** For existing listings, whether Google Business is connected */
  googleConnected?: boolean;
}

const LEVEL_COLORS = ['text-muted-foreground', 'text-blue-600', 'text-emerald-600', 'text-emerald-600'];
const LEVEL_BG = ['bg-muted', 'bg-blue-50', 'bg-emerald-50', 'bg-emerald-50'];

export function VerificationDashboard({
  tenantId,
  listingPhoneMasked,
  listingEmailMasked,
  googleConnected,
}: VerificationDashboardProps) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // OTP state
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [sendingPhone, setSendingPhone] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  // Website verification state (Gate E)
  const [websiteInput, setWebsiteInput] = useState('');
  const [websiteToken, setWebsiteToken] = useState<string | null>(null);
  const [websiteDomain, setWebsiteDomain] = useState<string | null>(null);
  const [websiteMethods, setWebsiteMethods] = useState<{
    dns?: { name: string; value: string; instructions: string };
    meta?: { tag: string; instructions: string };
    file?: { url: string; content: string; instructions: string };
  } | null>(null);
  const [startingWebsite, setStartingWebsite] = useState(false);
  const [checkingWebsite, setCheckingWebsite] = useState(false);
  const [checkMethod, setCheckMethod] = useState<'meta' | 'file' | 'dns' | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/verification/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Send OTP to phone
  async function handleSendPhoneOtp() {
    if (!phoneInput.trim() && !listingPhoneMasked) {
      toast.error('Enter a phone number');
      return;
    }
    setSendingPhone(true);
    try {
      // For existing listings, the OTP goes to the listing's phone (no input needed)
      // For new businesses, the user provides the phone
      const target = listingPhoneMasked ? undefined : phoneInput;
      const res = await authFetch('/api/verification/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'phone',
          ...(target ? { target } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPhoneOtpSent(true);
        toast.success(data.message || 'OTP sent to your phone');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSendingPhone(false);
    }
  }

  // Verify phone OTP
  async function handleVerifyPhoneOtp() {
    if (!phoneOtp.trim()) {
      toast.error('Enter the verification code');
      return;
    }
    setVerifyingPhone(true);
    try {
      const res = await authFetch('/api/verification/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: phoneOtp }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Phone verified successfully');
        setPhoneOtp('');
        setPhoneOtpSent(false);
        loadStatus();
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setVerifyingPhone(false);
    }
  }

  // Send OTP to email
  async function handleSendEmailOtp() {
    if (!emailInput.trim() && !listingEmailMasked) {
      toast.error('Enter an email address');
      return;
    }
    setSendingEmail(true);
    try {
      const target = listingEmailMasked ? undefined : emailInput;
      const res = await authFetch('/api/verification/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'email',
          ...(target ? { target } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailOtpSent(true);
        toast.success(data.message || 'OTP sent to your email');
      } else {
        toast.error(data.error || 'Failed to send OTP');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSendingEmail(false);
    }
  }

  // Verify email OTP
  async function handleVerifyEmailOtp() {
    if (!emailOtp.trim()) {
      toast.error('Enter the verification code');
      return;
    }
    setVerifyingEmail(true);
    try {
      const res = await authFetch('/api/verification/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: emailOtp }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Email verified successfully');
        setEmailOtp('');
        setEmailOtpSent(false);
        loadStatus();
      } else {
        toast.error(data.error || 'Verification failed');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setVerifyingEmail(false);
    }
  }

  // Google Business verification
  function handleGoogleVerify() {
    // Redirect to the Google OAuth flow
    window.location.href = '/api/oauth/googlebusiness/connect';
  }

  // ── Gate E: Website/domain verification ────────────────────────────
  async function handleStartWebsiteVerify() {
    if (!websiteInput.trim()) {
      toast.error('Enter your website URL');
      return;
    }
    setStartingWebsite(true);
    try {
      const res = await authFetch('/api/verification/website/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: websiteInput }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.alreadyVerified) {
          toast.success('Website already verified');
          loadStatus();
        } else {
          setWebsiteToken(data.token);
          setWebsiteDomain(data.domain);
          setWebsiteMethods(data.methods);
          toast.success('Verification token generated');
        }
      } else {
        toast.error(data.error || 'Failed to start verification');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setStartingWebsite(false);
    }
  }

  async function handleCheckWebsite(method: 'meta' | 'file' | 'dns') {
    setCheckMethod(method);
    setCheckingWebsite(true);
    try {
      const res = await authFetch('/api/verification/website/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        toast.success(data.message || 'Website verified!');
        setWebsiteToken(null);
        setWebsiteMethods(null);
        loadStatus();
      } else {
        toast.error(data.message || data.error || 'Token not found');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setCheckingWebsite(false);
      setCheckMethod(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading verification status...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Trust Level Banner ────────────────────────────────────────── */}
      <Card className={LEVEL_BG[status?.level ?? 0]}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className={`h-8 w-8 ${LEVEL_COLORS[status?.level ?? 0]}`} />
              <div>
                <p className={`text-lg font-bold ${LEVEL_COLORS[status?.level ?? 0]}`}>
                  {status?.levelLabel ?? 'Unverified'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {status?.level === 0 && 'Complete verification below to unlock marketplace features'}
                  {status?.level === 1 && 'Phone + email verified. Add business evidence to reach Business Verified.'}
                  {status?.level === 2 && 'Your business is verified. You can receive marketplace leads.'}
                  {status?.level === 3 && 'Trusted business with operational history.'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Level {status?.level ?? 0} of 3</p>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3].map((l) => (
                  <div
                    key={l}
                    className={`h-2 w-8 rounded-full ${
                      (status?.level ?? 0) >= l ? 'bg-emerald-500' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Next Steps (Gate C) ────────────────────────────────────────── */}
      {status?.nextSteps && status.nextSteps.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              To reach {status.level === 0 ? 'Contact Verified' : status.level === 1 ? 'Business Verified' : 'Trusted Business'}:
            </p>
            <ul className="space-y-1">
              {status.nextSteps.map((step, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className="text-muted-foreground mt-0.5">○</span>
                  {step}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Phone Verification ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Phone Verification
            {status?.phoneVerified && (
              <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {status?.phoneVerified ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Phone number verified
            </p>
          ) : (
            <>
              {listingPhoneMasked ? (
                <p className="text-sm text-muted-foreground">
                  Send a code to the business phone: <strong>{listingPhoneMasked}</strong>
                </p>
              ) : (
                <>
                  <Label className="text-xs">Enter your phone number</Label>
                  <Input
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="+91 98765 43210"
                    disabled={phoneOtpSent}
                  />
                </>
              )}
              {phoneOtpSent && (
                <div className="space-y-2">
                  <Label className="text-xs">Enter the code sent to your phone</Label>
                  <Input
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                  />
                  <Button
                    size="sm"
                    onClick={handleVerifyPhoneOtp}
                    disabled={verifyingPhone}
                    className="gap-1.5"
                  >
                    {verifyingPhone ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Verifying...</>
                    ) : (
                      <><KeyRound className="h-3 w-3" /> Verify Code</>
                    )}
                  </Button>
                </div>
              )}
              {!phoneOtpSent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendPhoneOtp}
                  disabled={sendingPhone}
                  className="gap-1.5"
                >
                  {sendingPhone ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                  ) : (
                    <><Phone className="h-3 w-3" /> Send Code</>
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Email Verification ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email Verification
            {status?.emailVerified && (
              <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {status?.emailVerified ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Email verified
            </p>
          ) : (
            <>
              {listingEmailMasked ? (
                <p className="text-sm text-muted-foreground">
                  Send a code to the business email: <strong>{listingEmailMasked}</strong>
                </p>
              ) : (
                <>
                  <Label className="text-xs">Enter your email</Label>
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="owner@business.com"
                    disabled={emailOtpSent}
                  />
                </>
              )}
              {emailOtpSent && (
                <div className="space-y-2">
                  <Label className="text-xs">Enter the code sent to your email</Label>
                  <Input
                    value={emailOtp}
                    onChange={(e) => setEmailOtp(e.target.value)}
                    placeholder="6-digit code"
                    maxLength={6}
                  />
                  <Button
                    size="sm"
                    onClick={handleVerifyEmailOtp}
                    disabled={verifyingEmail}
                    className="gap-1.5"
                  >
                    {verifyingEmail ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Verifying...</>
                    ) : (
                      <><KeyRound className="h-3 w-3" /> Verify Code</>
                    )}
                  </Button>
                </div>
              )}
              {!emailOtpSent && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendEmailOtp}
                  disabled={sendingEmail}
                  className="gap-1.5"
                >
                  {sendingEmail ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                  ) : (
                    <><Mail className="h-3 w-3" /> Send Code</>
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Google Business Profile ─────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Google Business Profile
            {status?.googleBusinessVerified && (
              <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status?.googleBusinessVerified ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Google Business Profile verified
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Connect your Google Business Profile to verify you manage this business.
                This is the strongest verification method.
              </p>
              <Button
                size="sm"
                onClick={handleGoogleVerify}
                className="gap-1.5"
              >
                <Globe className="h-3 w-3" /> Verify with Google
              </Button>
              {googleConnected && (
                <p className="text-xs text-amber-600 mt-2">
                  Google connected — click to verify your business match
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Website / Domain Verification (Gate E) ─────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Website Verification
            {status?.websiteVerified && (
              <Badge className="bg-emerald-100 text-emerald-700">Verified</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {status?.websiteVerified ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Website domain verified
            </p>
          ) : websiteToken && websiteMethods ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Verify control of <strong>{websiteDomain}</strong> using one of these methods:
              </p>

              {/* DNS TXT */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <p className="text-xs font-medium">Option 1: DNS TXT Record</p>
                <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">
{websiteMethods.dns?.instructions}
                </pre>
              </div>

              {/* HTML Meta */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <p className="text-xs font-medium">Option 2: HTML Meta Tag</p>
                <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">
{websiteMethods.meta?.tag}
                </pre>
              </div>

              {/* Verification File */}
              <div className="rounded-md border border-border p-3 space-y-1">
                <p className="text-xs font-medium">Option 3: Verification File</p>
                <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">
{websiteMethods.file?.url}
{websiteMethods.file?.content}
                </pre>
              </div>

              <p className="text-xs text-muted-foreground">
                Once you&rsquo;ve added the token, click verify:
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCheckWebsite('dns')}
                  disabled={checkingWebsite}
                >
                  {checkingWebsite && checkMethod === 'dns' ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Check DNS
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCheckWebsite('meta')}
                  disabled={checkingWebsite}
                >
                  {checkingWebsite && checkMethod === 'meta' ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Check Meta Tag
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCheckWebsite('file')}
                  disabled={checkingWebsite}
                >
                  {checkingWebsite && checkMethod === 'file' ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Check File
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Label className="text-xs">Enter your business website</Label>
              <Input
                value={websiteInput}
                onChange={(e) => setWebsiteInput(e.target.value)}
                placeholder="https://www.yourbusiness.com"
                disabled={startingWebsite}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleStartWebsiteVerify}
                disabled={startingWebsite}
                className="gap-1.5"
              >
                {startingWebsite ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</>
                ) : (
                  <><ExternalLink className="h-3 w-3" /> Verify Website</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Representative Declaration ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4" />
            Representative Declaration
            {status?.representativeDeclared && (
              <Badge className="bg-emerald-100 text-emerald-700">Confirmed</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status?.representativeDeclared ? (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Representative declaration confirmed
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete the declaration below to confirm you are authorized to represent
              this business.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Verification Summary ───────────────────────────────────────── */}
      {(status?.strongMethods.length ?? 0) > 0 && (
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground mb-1">Strong verification methods:</p>
            <div className="flex flex-wrap gap-1.5">
              {status?.strongMethods.map((m) => (
                <Badge key={m} className="bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {m}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
