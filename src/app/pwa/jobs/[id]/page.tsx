'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MapPin,
  Phone,
  Clock,
  CheckCircle2,
  Navigation,
  Camera,
  PenTool,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  AlertCircle,
  Loader2,
  Check,
  User,
  Building2,
  FileText,
  RotateCcw,
  UploadCloud,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface JobData {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  address?: string;
  scheduledAt?: string;
  scheduledTime?: string;
  quotedAmount?: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  completionNotes?: string;
  completionPhotosJson?: string;
  completionSignatureData?: string;
}

interface TechData {
  id?: string;
  name?: string;
  phone?: string;
  payType: string;
  commissionRate: number;
  flatAmount: number;
  estimatedCommission: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'Initial site inspection & safety check', checked: false },
  { id: '2', label: 'Perform core service / diagnostic repairs', checked: false },
  { id: '3', label: 'Test equipment & verify system operation', checked: false },
  { id: '4', label: 'Clean up work area & store tools', checked: false },
  { id: '5', label: 'Review work with customer & obtain sign-off', checked: false },
];

export default function PWAJobExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobData | null>(null);
  const [technician, setTechnician] = useState<TechData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Workflow state
  const [currentStep, setCurrentStep] = useState<'details' | 'photos' | 'checklist' | 'sign' | 'completed'>('details');
  const [actionLoading, setActionLoading] = useState(false);

  // Photos state
  const [beforePhoto, setBeforePhoto] = useState<string | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<string | null>(null);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);

  // Signature state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [signatoryName, setSignatoryName] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [finalCommission, setFinalCommission] = useState<number | null>(null);

  // ─── Fetch Job Details ───
  const fetchJob = async () => {
    try {
      setLoading(true);
      const url = `/api/pwa/jobs/${jobId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load job');
      }

      setJob(data.job);
      setTechnician(data.technician);
      if (data.job?.customerName) {
        setSignatoryName(data.job.customerName);
      }

      if (data.job?.status === 'completed') {
        setCurrentStep('completed');
        setFinalCommission(data.technician?.estimatedCommission || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to job portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [jobId, token]);

  // ─── Step Actions ───
  const handleUpdateStatus = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/pwa/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'status',
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setJob((prev) => (prev ? { ...prev, status: newStatus } : prev));
      toast.success(
        newStatus === 'in_progress'
          ? 'Work started! Timer running.'
          : newStatus === 'en_route'
          ? 'Status updated to En Route'
          : 'Status updated'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Photo Handling (Mock / File Input) ───
  const handlePhotoUpload = (type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (type === 'before') setBeforePhoto(dataUrl);
      if (type === 'after') setAfterPhoto(dataUrl);
      toast.success(`${type === 'before' ? 'Before' : 'After'} photo captured!`);
    };
    reader.readAsDataURL(file);
  };

  const handleSimulatePhoto = (type: 'before' | 'after') => {
    // Generate a clean placeholder SVG data URL for demonstration / offline use
    const label = type === 'before' ? 'BEFORE WORK' : 'AFTER WORK COMPLETED';
    const color = type === 'before' ? '#d97706' : '#059669';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450"><rect width="600" height="450" fill="#1e293b"/><text x="50%" y="45%" fill="${color}" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">📷 ${label}</text><text x="50%" y="60%" fill="#94a3b8" font-size="16" font-family="sans-serif" text-anchor="middle">Job #${job?.jobNumber || jobId.slice(-6).toUpperCase()} • ${new Date().toLocaleTimeString()}</text></svg>`;
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    if (type === 'before') setBeforePhoto(dataUrl);
    if (type === 'after') setAfterPhoto(dataUrl);
    toast.success(`${type === 'before' ? 'Before' : 'After'} photo captured!`);
  };

  // ─── Checklist Toggle ───
  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  // ─── Signature Canvas Handling ───
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasSignature(true);

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // ─── Complete Job Action ───
  const handleCompleteJob = async () => {
    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL('image/png') : null;

    if (!hasSignature && !signatureData) {
      toast.error('Customer signature is required to complete this job');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/pwa/jobs/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          action: 'complete',
          completionNotes,
          signatoryName: signatoryName.trim() || 'Customer',
          signatureData,
          beforePhotoUrl: beforePhoto,
          afterPhotoUrl: afterPhoto,
          checklistItems: checklist,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete job');

      setFinalCommission(data.commissionEarned ?? technician?.estimatedCommission ?? 0);
      setCurrentStep('completed');
      setJob((prev) => (prev ? { ...prev, status: 'completed' } : prev));
      toast.success('Job completed successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete job');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Render Loading & Error States ───
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="size-10 text-teal-600 animate-spin mb-4" />
        <h2 className="text-lg font-semibold text-slate-800">Loading Job Details...</h2>
        <p className="text-sm text-slate-500 mt-1">Connecting to ServiceOS mobile portal</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-rose-200">
          <CardHeader className="text-center">
            <AlertCircle className="size-12 text-rose-500 mx-auto mb-2" />
            <CardTitle className="text-rose-900">Access Restricted</CardTitle>
            <CardDescription className="text-rose-700">
              {error || 'This job link is invalid, expired, or has already been completed.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-xs text-muted-foreground mb-4">
              Please contact your dispatcher or supervisor to request a new magic link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allTasksDone = checklist.every((c) => c.checked);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col max-w-lg mx-auto shadow-2xl border-x border-slate-200">
      {/* ─── Top Bar: Brand & Status ─── */}
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-30 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-teal-400">ServiceOS PWA</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                #{job.jobNumber || job.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <h1 className="font-bold text-base text-white truncate max-w-[240px] mt-0.5">{job.title}</h1>
          </div>
          <Badge
            className={`capitalize font-semibold text-xs px-2.5 py-1 ${
              job.status === 'completed'
                ? 'bg-emerald-600 text-white'
                : job.status === 'in_progress' || job.status === 'working'
                ? 'bg-amber-600 text-white animate-pulse'
                : job.status === 'en_route' || job.status === 'travelling'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-200'
            }`}
          >
            {job.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Technician Compensation Pill */}
        {technician && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-800 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <User className="size-3.5 text-teal-400" />
              <span>{technician.name || 'Technician'}</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded capitalize">
                {technician.payType.replace('_', ' ')}
              </span>
            </span>
            <span className="font-bold text-emerald-400 flex items-center gap-0.5">
              <DollarSign className="size-3.5" />
              {technician.payType === 'flat'
                ? `$${technician.flatAmount.toFixed(2)} Flat Fee`
                : `${technician.commissionRate}% ($${technician.estimatedCommission.toFixed(2)})`}
            </span>
          </div>
        )}
      </header>

      {/* ─── Navigation Stepper ─── */}
      {currentStep !== 'completed' && (
        <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs font-medium">
          <button
            onClick={() => setCurrentStep('details')}
            className={`flex items-center gap-1 ${
              currentStep === 'details' ? 'text-teal-700 font-bold border-b-2 border-teal-600 pb-0.5' : 'text-slate-500'
            }`}
          >
            <span>1. Details</span>
          </button>
          <ChevronRight className="size-3.5 text-slate-300" />
          <button
            onClick={() => setCurrentStep('photos')}
            className={`flex items-center gap-1 ${
              currentStep === 'photos' ? 'text-teal-700 font-bold border-b-2 border-teal-600 pb-0.5' : 'text-slate-500'
            }`}
          >
            <span>2. Photos</span>
            {(beforePhoto || afterPhoto) && <Check className="size-3 text-emerald-600" />}
          </button>
          <ChevronRight className="size-3.5 text-slate-300" />
          <button
            onClick={() => setCurrentStep('checklist')}
            className={`flex items-center gap-1 ${
              currentStep === 'checklist' ? 'text-teal-700 font-bold border-b-2 border-teal-600 pb-0.5' : 'text-slate-500'
            }`}
          >
            <span>3. Checklist</span>
            {allTasksDone && <Check className="size-3 text-emerald-600" />}
          </button>
          <ChevronRight className="size-3.5 text-slate-300" />
          <button
            onClick={() => setCurrentStep('sign')}
            className={`flex items-center gap-1 ${
              currentStep === 'sign' ? 'text-teal-700 font-bold border-b-2 border-teal-600 pb-0.5' : 'text-slate-500'
            }`}
          >
            <span>4. Sign & Done</span>
          </button>
        </div>
      )}

      {/* ─── Main Content Area ─── */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* ── STEP 1: Job Details & Navigation ── */}
        {currentStep === 'details' && (
          <div className="space-y-4">
            {/* Customer & Location Card */}
            <Card className="border-teal-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                  <span>Customer & Location</span>
                  {job.scheduledTime && (
                    <span className="text-xs font-mono font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      🕒 {job.scheduledTime}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-bold text-base text-slate-900">{job.customerName || 'Client'}</p>
                  <p className="text-xs text-slate-600 mt-0.5 flex items-start gap-1">
                    <MapPin className="size-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{job.address || 'Address not specified'}</span>
                  </p>
                </div>

                {/* Quick Action Buttons: Call & Maps */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {job.customerPhone ? (
                    <a
                      href={`tel:${job.customerPhone}`}
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium text-xs shadow-sm"
                    >
                      <Phone className="size-3.5" /> Call Customer
                    </a>
                  ) : (
                    <Button disabled variant="outline" size="sm" className="text-xs">
                      No Phone
                    </Button>
                  )}

                  {job.address ? (
                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm"
                    >
                      <Navigation className="size-3.5" /> Open Maps
                    </a>
                  ) : (
                    <Button disabled variant="outline" size="sm" className="text-xs">
                      No Address
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Work Instructions */}
            {job.description && (
              <Card className="bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold text-slate-700">Work Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap">{job.description}</p>
                </CardContent>
              </Card>
            )}

            {/* Live Progress Controls */}
            <Card className="bg-white shadow-sm border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-700">Field Progress Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {job.status === 'scheduled' || job.status === 'pending' || job.status === 'assigned' ? (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm h-11"
                    onClick={() => handleUpdateStatus('en_route')}
                    disabled={actionLoading}
                  >
                    <Navigation className="size-4 mr-2" /> Start Travelling (En Route)
                  </Button>
                ) : job.status === 'en_route' || job.status === 'travelling' ? (
                  <Button
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm h-11"
                    onClick={() => handleUpdateStatus('in_progress')}
                    disabled={actionLoading}
                  >
                    <Clock className="size-4 mr-2" /> Arrived & Start Work
                  </Button>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-medium flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Work currently in progress. Proceed to capture proof & sign-off.</span>
                  </div>
                )}

                <Button
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white text-xs h-10 mt-2"
                  onClick={() => setCurrentStep('photos')}
                >
                  Proceed to Before & After Photos <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── STEP 2: Before & After Photos ── */}
        {currentStep === 'photos' && (
          <div className="space-y-4">
            <div className="bg-teal-50 border border-teal-200 p-3 rounded-lg text-xs text-teal-900">
              <span className="font-semibold">Proof of Work:</span> Capture at least one <strong>Before</strong> and one <strong>After</strong> photo to unlock completion sign-off.
            </div>

            {/* Before Photo */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-amber-700 flex items-center justify-between">
                  <span>1. Before Work Photo</span>
                  {beforePhoto && <Check className="size-4 text-emerald-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {beforePhoto ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-300">
                    <img src={beforePhoto} alt="Before work" className="w-full h-40 object-cover" />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 right-2 text-xs h-7"
                      onClick={() => setBeforePhoto(null)}
                    >
                      <RotateCcw className="size-3 mr-1" /> Retake
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center space-y-2">
                    <Camera className="size-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500">Take or upload a photo before starting</p>
                    <div className="flex items-center justify-center gap-2">
                      <label className="cursor-pointer bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-slate-800">
                        <UploadCloud className="size-3.5 inline mr-1" /> Capture
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload('before', e)}
                        />
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleSimulatePhoto('before')}
                      >
                        Simulate
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* After Photo */}
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-emerald-700 flex items-center justify-between">
                  <span>2. After Work Photo</span>
                  {afterPhoto && <Check className="size-4 text-emerald-600" />}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {afterPhoto ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-300">
                    <img src={afterPhoto} alt="After work" className="w-full h-40 object-cover" />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute bottom-2 right-2 text-xs h-7"
                      onClick={() => setAfterPhoto(null)}
                    >
                      <RotateCcw className="size-3 mr-1" /> Retake
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center space-y-2">
                    <Camera className="size-8 text-slate-400 mx-auto" />
                    <p className="text-xs text-slate-500">Take or upload a photo after finishing</p>
                    <div className="flex items-center justify-center gap-2">
                      <label className="cursor-pointer bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-md hover:bg-emerald-700">
                        <UploadCloud className="size-3.5 inline mr-1" /> Capture
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload('after', e)}
                        />
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => handleSimulatePhoto('after')}
                      >
                        Simulate
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="w-1/3 text-xs" onClick={() => setCurrentStep('details')}>
                Back
              </Button>
              <Button
                className="w-2/3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                onClick={() => setCurrentStep('checklist')}
              >
                Next: Checklist <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Job Checklist ── */}
        {currentStep === 'checklist' && (
          <div className="space-y-4">
            <Card className="bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-800 flex items-center justify-between">
                  <span>Standard Quality Checklist</span>
                  <span className="text-xs text-teal-700 font-mono">
                    {checklist.filter((c) => c.checked).length}/{checklist.length} Done
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                      item.checked
                        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-950 font-medium'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div
                      className={`size-5 rounded-md border flex items-center justify-center shrink-0 ${
                        item.checked
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-400 bg-white'
                      }`}
                    >
                      {item.checked && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                    <span className="text-xs leading-tight">{item.label}</span>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-teal-700 hover:text-teal-800 w-full mt-2"
                  onClick={() => setChecklist((prev) => prev.map((c) => ({ ...c, checked: true })))}
                >
                  <CheckCircle2 className="size-3.5 mr-1" /> Mark All as Checked
                </Button>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" className="w-1/3 text-xs" onClick={() => setCurrentStep('photos')}>
                Back
              </Button>
              <Button
                className="w-2/3 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
                onClick={() => setCurrentStep('sign')}
              >
                Next: Customer Sign-off <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Customer Sign-off & Completion ── */}
        {currentStep === 'sign' && (
          <div className="space-y-4">
            {/* Signatory Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Customer Full Name *</label>
              <Input
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="bg-white text-sm h-10"
              />
            </div>

            {/* Signature Canvas Pad */}
            <Card className="bg-white shadow-sm border-slate-300">
              <CardHeader className="pb-1.5 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <PenTool className="size-3.5 text-teal-700" />
                  <span>Customer Digital Signature</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-rose-600 hover:text-rose-700 px-2"
                  onClick={clearSignature}
                >
                  <RotateCcw className="size-3 mr-1" /> Clear
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border border-slate-300 rounded-lg overflow-hidden bg-slate-50 touch-none">
                  <canvas
                    ref={canvasRef}
                    width={380}
                    height={160}
                    className="w-full h-40 bg-white cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 text-center">
                  Sign above using finger or stylus
                </p>
              </CardContent>
            </Card>

            {/* Technician Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Completion Summary / Notes</label>
              <Textarea
                rows={2}
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="e.g., Replacement completed, pressure tested, customer satisfied."
                className="bg-white text-xs"
              />
            </div>

            {/* Commission Earnings Confirmation */}
            {technician && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-950">
                <div>
                  <p className="font-semibold">Technician Compensation</p>
                  <p className="text-[11px] text-emerald-800 capitalize">
                    {technician.payType.replace('_', ' ')}: {technician.payType === 'flat' ? `$${technician.flatAmount.toFixed(2)}` : `${technician.commissionRate}%`}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    +${technician.estimatedCommission.toFixed(2)}
                  </span>
                  <p className="text-[10px] text-emerald-800">Auto-credited</p>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="w-1/3 text-xs" onClick={() => setCurrentStep('checklist')}>
                Back
              </Button>
              <Button
                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11 shadow-md"
                onClick={handleCompleteJob}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><ShieldCheck className="size-4 mr-2" /> Complete & Submit Job</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: Completion Success Screen ── */}
        {currentStep === 'completed' && (
          <div className="space-y-4 text-center py-6">
            <div className="size-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="size-10 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Job Successfully Completed!</h2>
              <p className="text-xs text-slate-600 mt-1">
                Proof of work, customer signature, and checklist have been recorded.
              </p>
            </div>

            {finalCommission !== null && (
              <Card className="bg-emerald-50 border-emerald-200 shadow-sm max-w-sm mx-auto">
                <CardContent className="p-4 text-center space-y-1">
                  <span className="text-xs text-emerald-800 font-medium">Commission Earned</span>
                  <div className="text-3xl font-extrabold text-emerald-700 font-mono">
                    ${finalCommission.toFixed(2)}
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Logged in Reports → Commissions
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="p-4 bg-white border border-slate-200 rounded-xl text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Job Title</span>
                <span className="font-semibold text-slate-800">{job.title}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Customer</span>
                <span className="font-semibold text-slate-800">{job.customerName || 'Client'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Completed At</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              You may safely close this browser window or open another dispatch link.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
