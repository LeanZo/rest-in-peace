import { useEffect } from "react";
import { Button } from "@/primitives/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={onCancel}
      />
      <div className="relative max-w-sm w-full mx-4 bg-surface-raised border border-border-default rounded-xl shadow-2xl animate-[scaleIn_200ms_cubic-bezier(0.16,1,0.3,1)]">
        <div className="px-5 pt-5 pb-2">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <p className="mt-2 text-xs text-text-secondary leading-relaxed">
            {message}
          </p>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
