"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "loading" | "enroll" | "challenge" | "ready";

export default function MfaClient() {
  const supabase = useMemo(() => createClient(), []);
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function inspect() {
      const { data: aal, error: aalError } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalError) {
        if (!cancelled) {
          setError(aalError.message);
          setMode("ready");
        }
        return;
      }

      if (aal.currentLevel === "aal2") {
        window.location.assign("/dashboard");
        return;
      }

      const { data: factors, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) {
        if (!cancelled) {
          setError(factorsError.message);
          setMode("ready");
        }
        return;
      }

      const verifiedTotp = factors.totp.find(
        (factor) => factor.status === "verified"
      );

      if (cancelled) return;

      if (verifiedTotp) {
        setFactorId(verifiedTotp.id);
        setMode("challenge");
      } else {
        setMode("enroll");
      }
    }

    void inspect();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function beginEnrollment() {
    setBusy(true);
    setError("");

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Universal Trading AI Admin",
    });

    if (enrollError) {
      setError(enrollError.message);
      setBusy(false);
      return;
    }

    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setBusy(false);
  }

  async function verify() {
    if (!factorId || code.trim().length < 6) {
      setError("Enter the current code from your authenticator app.");
      return;
    }

    setBusy(true);
    setError("");

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      setError(challengeError.message);
      setBusy(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    if (verifyError) {
      setError(verifyError.message);
      setBusy(false);
      return;
    }

    window.location.assign("/dashboard");
  }

  if (mode === "loading") {
    return <p className="muted mt-4">Checking your MFA status…</p>;
  }

  return (
    <div className="mt-6 space-y-4">
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}

      {mode === "enroll" && !factorId ? (
        <>
          <p className="muted">
            No verified authenticator is enrolled yet. Set up TOTP using an
            authenticator app before entering the admin control plane.
          </p>
          <button type="button" disabled={busy} onClick={beginEnrollment}>
            {busy ? "Preparing…" : "Set up authenticator"}
          </button>
        </>
      ) : null}

      {mode === "enroll" && factorId ? (
        <>
          <p className="muted">
            Scan this QR code with your authenticator app, then enter the current
            six-digit code below.
          </p>
          {qrCode ? (
            <div className="rounded-xl bg-white p-3 inline-block">
              <img
                src={qrCode}
                alt="Authenticator enrollment QR code"
                width={220}
                height={220}
              />
            </div>
          ) : null}
          {secret ? (
            <details className="card">
              <summary className="cursor-pointer">Cannot scan the QR code?</summary>
              <p className="muted mt-2">Enter this secret manually:</p>
              <code className="block mt-2 break-all">{secret}</code>
            </details>
          ) : null}
        </>
      ) : null}

      {mode === "challenge" ? (
        <p className="muted">
          Your account already has a verified authenticator. Enter the current
          code to upgrade this session to AAL2.
        </p>
      ) : null}

      {(mode === "challenge" || (mode === "enroll" && factorId)) ? (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm muted">Authenticator code</span>
            <input
              className="mt-1"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value.trim())}
              placeholder="123456"
              maxLength={8}
            />
          </label>
          <button type="button" disabled={busy} onClick={verify}>
            {busy ? "Verifying…" : "Verify and continue"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
