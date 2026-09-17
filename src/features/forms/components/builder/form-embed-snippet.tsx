'use client';

/**
 * Form Embed Snippet
 * ------------------
 * UI showing embed code in 4 formats:
 *   1. React component
 *   2. iframe
 *   3. JS snippet (script tag)
 *   4. WhatsApp link
 *
 * Each format includes a copy-to-clipboard button.
 */
import { useState } from 'react';
import { Code, Copy, Check, ExternalLink, MessageCircle, Frame, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FormEmbedSnippetProps {
  formId: string;
  formSlug?: string;
  host?: string; // e.g. https://example.com
  whatsappNumber?: string; // E.164 phone number
  whatsappMessage?: string;
  className?: string;
}

type Format = 'react' | 'iframe' | 'js' | 'whatsapp';

function buildReact(formId: string, host: string): string {
  return `import { FieserosForm } from '@fieseros/forms-react';

export default function MyPage() {
  return (
    <FieserosForm
      formId="${formId}"
      host="${host}"
      onSubmit={(data) => console.log('Submitted:', data)}
    />
  );
}`;
}

function buildIframe(formId: string, host: string): string {
  return `<iframe
  src="${host}/f/embed/${formId}"
  width="100%"
  height="640"
  frameborder="0"
  marginheight="0"
  marginwidth="0"
  title="Fieseros Form"
>Loading…</iframe>`;
}

function buildJs(formId: string, host: string): string {
  return `<div id="fieseros-form-${formId}"></div>
<script src="${host}/embed.js" data-form-id="${formId}" async></script>`;
}

function buildWhatsapp(number: string, message: string): string {
  const text = encodeURIComponent(message);
  const cleaned = number.replace(/[^\d]/g, '');
  return `https://wa.me/${cleaned}?text=${text}`;
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
      {copied ? 'Copied!' : 'Copy'}
    </Button>
  );
}

export function FormEmbedSnippet({
  formId, formSlug, host = 'https://forms.example.com', whatsappNumber, whatsappMessage, className,
}: FormEmbedSnippetProps) {
  const [whatsappInput, setWhatsappInput] = useState(whatsappNumber ?? '+15555550123');
  const [whatsappMsg, setWhatsappMsg] = useState(whatsappMessage ?? `Hi! I'd like to submit a response to your form (${formSlug ?? formId}).`);

  const embedUrl = whatsappInput ? buildWhatsapp(whatsappInput, whatsappMsg) : '';

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Code className="h-4 w-4" />
          Embed Snippet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="iframe">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="iframe" className="text-xs"><Frame className="mr-1 h-3 w-3" /> iframe</TabsTrigger>
            <TabsTrigger value="js" className="text-xs"><FileCode className="mr-1 h-3 w-3" /> JS</TabsTrigger>
            <TabsTrigger value="react" className="text-xs"><Code className="mr-1 h-3 w-3" /> React</TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs"><MessageCircle className="mr-1 h-3 w-3" /> WhatsApp</TabsTrigger>
          </TabsList>

          <TabsContent value="iframe" className="space-y-2">
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
              <code>{buildIframe(formId, host)}</code>
            </pre>
            <div className="flex justify-end">
              <CopyButton text={buildIframe(formId, host)} />
            </div>
          </TabsContent>

          <TabsContent value="js" className="space-y-2">
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
              <code>{buildJs(formId, host)}</code>
            </pre>
            <div className="flex justify-end">
              <CopyButton text={buildJs(formId, host)} />
            </div>
          </TabsContent>

          <TabsContent value="react" className="space-y-2">
            <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
              <code>{buildReact(formId, host)}</code>
            </pre>
            <div className="flex justify-end">
              <CopyButton text={buildReact(formId, host)} />
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-2">
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="wa-num" className="text-xs">WhatsApp Number (E.164)</Label>
                <Input
                  id="wa-num"
                  value={whatsappInput}
                  onChange={(e) => setWhatsappInput(e.target.value)}
                  placeholder="+15555550123"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="wa-msg" className="text-xs">Pre-filled Message</Label>
                <Input
                  id="wa-msg"
                  value={whatsappMsg}
                  onChange={(e) => setWhatsappMsg(e.target.value)}
                  className="text-xs"
                />
              </div>
              <pre className="max-h-32 overflow-auto rounded-md bg-muted p-3 text-[11px] break-all">
                <code>{embedUrl || '(enter a phone number)'}</code>
              </pre>
              <div className="flex justify-end gap-2">
                <CopyButton text={embedUrl} />
                {embedUrl && (
                  <Button size="sm" variant="outline" onClick={() => window.open(embedUrl, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default FormEmbedSnippet;
