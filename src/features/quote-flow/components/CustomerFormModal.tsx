"use client";
import { useEffect, useState } from "react";
import { useAppStore } from "@/features/quote-flow/store/app";
import { api, apiPost, apiPatch } from "@/features/quote-flow/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  customerId?: string;
}

export function CustomerFormModal({ customerId }: Props) {
  const closeModal = useAppStore((s) => s.closeModal);
  const [name, setName] = useState("");
  const [gstin, setGstin] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [taxRegName, setTaxRegName] = useState("");
  const [taxRegNumber, setTaxRegNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [showMoreFields, setShowMoreFields] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customerId) return;
    api<{ customer: any }>(`/api/customers/${customerId}`)
      .then((r) => {
        const c = r.customer;
        setName(c.name || "");
        setEmail(c.email || "");
        setPhone(c.phone || "");
        setBillingAddress(c.address || "");

        if (c.notes) {
          try {
            if (c.notes.startsWith("{")) {
              const parsed = JSON.parse(c.notes);
              setGstin(parsed.gstin || "");
              setShippingAddress(
                [parsed.shippingLine1, parsed.shippingLine2].filter(Boolean).join("\n") || ""
              );
              setTaxRegName(parsed.taxRegName || "");
              setTaxRegNumber(parsed.taxRegNumber || "");
              setLicenseNumber(parsed.licenseNumber || "");
              setNotes(parsed.internalNotes || "");
            } else {
              setNotes(c.notes);
            }
          } catch {
            setNotes(c.notes);
          }
        }
      })
      .catch(() => {});
  }, [customerId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const structuredNotes = JSON.stringify({
        gstin,
        shippingAddress,
        taxRegName,
        taxRegNumber,
        licenseNumber,
        internalNotes: notes,
      });

      const payload = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: billingAddress || undefined,
        notes: structuredNotes,
      };

      if (customerId) {
        await apiPatch(`/api/customers/${customerId}`, payload);
      } else {
        await apiPost("/api/customers", payload);
      }
      closeModal();
      window.dispatchEvent(new CustomEvent("customer-list-changed"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-stone-900">
            {customerId ? "Edit Client" : "Create Client"}
          </h2>
          <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Card: Basic Info */}
          <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <div>
              <Label htmlFor="c-name" className="text-xs font-bold text-stone-700">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="c-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 bg-white"
                placeholder="Enter Client Name Here"
              />
            </div>

            <div>
              <Label htmlFor="c-gstin" className="text-xs font-bold text-stone-700">
                GSTIN
              </Label>
              <Input
                id="c-gstin"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="mt-1 bg-white uppercase"
                placeholder="Enter GSTIN Number Here"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="c-phone" className="text-xs font-bold text-stone-700">
                  Phone
                </Label>
                <Input
                  id="c-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 bg-white"
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="c-email" className="text-xs font-bold text-stone-700">
                  Email
                </Label>
                <Input
                  id="c-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-white"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Card: Billing Address */}
          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <Label htmlFor="c-billing" className="text-xs font-bold text-stone-700">
              Billing Address
            </Label>
            <Textarea
              id="c-billing"
              rows={2}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              className="bg-white"
              placeholder="Street, City, State, Pincode"
            />
          </div>

          {/* Card: Shipping Address */}
          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
            <Label htmlFor="c-shipping" className="text-xs font-bold text-stone-700">
              Shipping Address
            </Label>
            <Textarea
              id="c-shipping"
              rows={2}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              className="bg-white"
              placeholder="Shipping Address (Optional)"
            />
          </div>

          {/* Collapsible More Fields */}
          {showMoreFields && (
            <div className="space-y-3 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
              <div>
                <Label htmlFor="c-taxname" className="text-xs font-bold text-stone-700">
                  Tax Registration Name
                </Label>
                <Input
                  id="c-taxname"
                  value={taxRegName}
                  onChange={(e) => setTaxRegName(e.target.value)}
                  className="mt-1 bg-white"
                  placeholder="Optional"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="c-taxnum" className="text-xs font-bold text-stone-700">
                    Tax Reg Number
                  </Label>
                  <Input
                    id="c-taxnum"
                    value={taxRegNumber}
                    onChange={(e) => setTaxRegNumber(e.target.value)}
                    className="mt-1 bg-white"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <Label htmlFor="c-lic" className="text-xs font-bold text-stone-700">
                    License Number
                  </Label>
                  <Input
                    id="c-lic"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="mt-1 bg-white"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="c-notes" className="text-xs font-bold text-stone-700">
                    Client Detail <span className="font-normal text-stone-400">(Not Shown on Invoice)</span>
                  </Label>
                  <span className="text-[10px] text-stone-400">{notes.length}/1000</span>
                </div>
                <Textarea
                  id="c-notes"
                  rows={3}
                  maxLength={1000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 bg-white"
                  placeholder="Internal client notes..."
                />
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <button
            type="button"
            onClick={() => setShowMoreFields(!showMoreFields)}
            className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            {showMoreFields ? (
              <>
                Show Less Fields <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show More Fields <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {customerId ? "Save Changes" : "Save Client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
