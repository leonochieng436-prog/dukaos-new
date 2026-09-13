"use client";

import { Camera, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorOptions = {
  formats?: string[];
};

declare global {
  interface BarcodeDetector {
    detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]>;
  }

  interface BarcodeDetectorConstructor {
    new (options?: BarcodeDetectorOptions): BarcodeDetector;
  }

  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

type CameraBarcodeScannerProps = {
  onDetected: (code: string) => void;
  onClose: () => void;
};

export function CameraBarcodeScanner({ onDetected, onClose }: CameraBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastValueRef = useRef("");
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) {
        setError("This browser does not support camera barcode scanning. Please use the barcode field or a USB/Bluetooth scanner.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setIsReady(true);
      } catch {
        setError("Camera permission is required to scan barcodes from this phone or tablet.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !("BarcodeDetector" in window) || !videoRef.current) return;

    const BarcodeDetectorCtor = window.BarcodeDetector;
    if (!BarcodeDetectorCtor) return;

    const detector = new BarcodeDetectorCtor({
      formats: [
        "qr_code",
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "code_128",
        "code_39",
        "codabar",
      ],
    });

    const interval = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const barcodes = await detector.detect(video);
        const detected = barcodes[0]?.rawValue?.trim();
        if (!detected || detected === lastValueRef.current) return;

        lastValueRef.current = detected;
        onDetected(detected);
      } catch {
        // Ignore transient detection failures and continue scanning.
      }
    }, 600);

    return () => window.clearInterval(interval);
  }, [isReady, onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Barcode scanner</p>
            <h3 className="mt-1 text-lg font-semibold">Scan product</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border-strong p-2 text-muted-foreground transition-colors hover:text-foreground" aria-label="Close scanner">
            <X size={16} />
          </button>
        </div>

        <div className="relative bg-slate-950">
          <video ref={videoRef} className="aspect-square w-full object-cover" playsInline muted />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-40 w-40 rounded-[20px] border-2 border-primary/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]" />
          </div>
        </div>

        <div className="space-y-4 p-4">
          {error ? (
            <div className="rounded-[var(--radius-md)] border border-danger/20 bg-danger-tint px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              {!isReady ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} className="text-primary" />}
              <span>{!isReady ? "Starting camera…" : "Position the barcode inside the frame"}</span>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
