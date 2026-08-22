/**
 * Exemple de composant pour s'abonner à un plan avec le provider manuel.
 *
 * L'utilisateur soumet:
 * - L'ID du plan
 * - La preuve de paiement (fichier en base64 ou URL)
 * - Des métadonnées optionnelles (configurables par les développeurs)
 */

import React, { useState } from "react";

export interface ManualSubscribeProps {
  baseURL?: string;
  onSuccess?: (subscription: any) => void;
  onError?: (error: Error) => void;
}

/**
 * Composant pour s'abonner à un plan avec le provider manuel.
 * Combine plan ID, proof de paiement, et metadata optionnelle en une seule requête.
 */
export function ManualProviderSubscribe({
  baseURL = "http://localhost:3000",
  onSuccess,
  onError,
}: ManualSubscribeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    planId: "",
    proofUrl: "",
    proofFile: null as File | null,
    metadata: "", // JSON string
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData((prev) => ({ ...prev, proofFile: file }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.planId) {
        throw new Error("Plan ID is required");
      }

      let proofUrl: string | undefined;

      if (formData.proofFile) {
        proofUrl = await fileToBase64(formData.proofFile);
      } else if (formData.proofUrl) {
        proofUrl = formData.proofUrl;
      } else {
        throw new Error("Proof of payment is required");
      }

      let metadata: Record<string, unknown> | undefined;
      if (formData.metadata.trim()) {
        try {
          metadata = JSON.parse(formData.metadata);
        } catch (err) {
          throw new Error("Invalid JSON in metadata");
        }
      }

      const response = await fetch(`${baseURL}/api/auth/subscriptions/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planId: formData.planId,
          provider: "manual",
          manualProofUrl: proofUrl,
          manualMetadata: metadata,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as any).message || "Subscription failed");
      }

      const data = await response.json();
      onSuccess?.(data.subscription);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      onError?.(new Error(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="manual-provider-subscribe">
      <div className="form-container">
        <h2>Manual Provider Subscription</h2>
        <p>Subscribe by submitting your plan ID and proof of payment</p>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="planId">Plan ID *</label>
            <input
              type="text"
              id="planId"
              name="planId"
              placeholder="e.g., plan_123abc"
              value={formData.planId}
              onChange={handleInputChange}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label>Payment Proof *</label>
            <div className="proof-tabs">
              <label className="tab">
                <input
                  type="radio"
                  value="file"
                  checked={formData.proofFile !== null}
                  onChange={() => setFormData((prev) => ({ ...prev, proofUrl: "" }))}
                  disabled={loading}
                />
                <span>Upload File</span>
              </label>
              <label className="tab">
                <input
                  type="radio"
                  value="url"
                  checked={formData.proofFile === null}
                  onChange={() => setFormData((prev) => ({ ...prev, proofFile: null }))}
                  disabled={loading}
                />
                <span>URL</span>
              </label>
            </div>

            {formData.proofFile === null ? (
              <input
                type="url"
                name="proofUrl"
                placeholder="https://example.com/receipt.pdf"
                value={formData.proofUrl}
                onChange={handleInputChange}
                disabled={loading}
                required
              />
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  disabled={loading}
                  required
                />
                {formData.proofFile && (
                  <div className="file-info">✓ {formData.proofFile.name}</div>
                )}
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="metadata">Metadata (optional)</label>
            <textarea
              id="metadata"
              name="metadata"
              placeholder='{"reference": "INV-2024-001", "notes": "Bank transfer"}'
              value={formData.metadata}
              onChange={handleInputChange}
              disabled={loading}
              rows={4}
            />
            <small>Must be valid JSON object</small>
          </div>

          <button type="submit" disabled={loading} className="btn-submit">
            {loading ? "Processing..." : "Subscribe"}
          </button>
        </form>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        resolve(result);
      } else {
        reject(new Error("Failed to convert file"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default ManualProviderSubscribe;
