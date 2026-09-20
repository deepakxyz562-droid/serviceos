'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText, PenTool, Check, X, Clock, Shield, Download, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface SignRequestData {
  documentId: string;
  documentTitle: string;
  documentUrl: string;
  signerName: string;
  signerEmail: string;
  status: string;
  signingOrder: number;
  fields: Array<{
    id: string;
    type: string;
    label: string;
    pageNumber: number;
    required: boolean;
    value: string | null;
  }>;
}

export default function SignPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [data, setData] = useState<SignRequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    fetch(`/api/sign/${token}`)
      .then((res) => res.json())
      .then((d) => {
        if (d.success) setData(d.signRequest);
        if (d.signRequest?.status === 'signed') setSigned(true);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSign = async () => {
    if (!signatureData) return;
    setSigning(true);
    try {
      const res = await fetch(`/api/sign/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureImage: signatureData }),
      });
      const d = await res.json();
      if (d.success) {
        setSigned(true);
      }
    } catch {
      // error
    } finally {
      setSigning(false);
    }
  };

  const handleDecline = async () => {
    try {
      await fetch(`/api/sign/${token}/decline`, { method: 'POST' });
      router.push('/');
    } catch {
      // error
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="size-8 animate-spin text-slate-400" /></div>;
  }

  if (signed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="size-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Document Signed!</h1>
            <p className="text-sm text-slate-500 mt-2">
              Your signature has been recorded. You will receive a signed copy via email.
            </p>
            {data?.documentUrl && (
              <a href={data.documentUrl} download className="mt-4 inline-flex">
                <Button variant="outline" size="sm"><Download className="size-3.5 mr-1" /> Download Copy</Button>
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-slate-500">Invalid or expired signing link.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <FileText className="size-5 text-emerald-600" />
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900">{data.documentTitle}</h1>
            <p className="text-[10px] text-slate-500">
              {data.signerName} · Signing order: {data.signingOrder}
            </p>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <Shield className="size-3" /> Secured
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Document preview */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900">Document</h2>
              <a href={data.documentUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <FileText className="size-3" /> View Full Document
                </Button>
              </a>
            </div>
            {data.documentUrl && (
              <iframe
                src={data.documentUrl}
                className="w-full h-96 border border-slate-200 rounded-lg"
                title={data.documentTitle}
              />
            )}
          </CardContent>
        </Card>

        {/* Signature pad */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <PenTool className="size-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Sign Here</h2>
            </div>
            <p className="text-xs text-slate-500">
              Draw your signature in the box below, then click "Sign Document".
            </p>
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white p-2">
              <canvas
                id="sig-canvas"
                width={600}
                height={150}
                className="w-full h-[150px] cursor-crosshair touch-none"
                onMouseDown={(e) => {
                  const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d')!;
                  ctx.beginPath();
                  ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                }}
                onMouseMove={(e) => {
                  if (e.buttons !== 1) return;
                  const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d')!;
                  ctx.lineWidth = 2;
                  ctx.lineCap = 'round';
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                  ctx.stroke();
                }}
                onMouseUp={() => {
                  const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
                  setSignatureData(canvas.toDataURL('image/png'));
                }}
                onTouchStart={(e) => {
                  const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d')!;
                  const rect = canvas.getBoundingClientRect();
                  const touch = e.touches[0];
                  ctx.beginPath();
                  ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                }}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
                  const ctx = canvas.getContext('2d')!;
                  const rect = canvas.getBoundingClientRect();
                  const touch = e.touches[0];
                  ctx.lineWidth = 2;
                  ctx.lineCap = 'round';
                  ctx.strokeStyle = '#0f172a';
                  ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                  ctx.stroke();
                }}
                onTouchEnd={() => {
                  const canvas = document.getElementById('sig-canvas') as HTMLCanvasElement;
                  setSignatureData(canvas.toDataURL('image/png'));
                }}
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Clock className="size-3" />
              By signing, you agree this is your legally binding electronic signature.
              Your IP address and timestamp will be recorded.
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 text-red-600" onClick={handleDecline}>
            <X className="size-4 mr-1" /> Decline
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={!signatureData || signing}
            onClick={handleSign}
          >
            {signing ? <Loader2 className="size-4 mr-1 animate-spin" /> : <PenTool className="size-4 mr-1" />}
            Sign Document
          </Button>
        </div>
      </main>
    </div>
  );
}
