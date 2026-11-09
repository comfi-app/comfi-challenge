import { IconButton, cx } from "@comfi/ui";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "../icons";

export interface Toast {
  tone: "success" | "danger";
  message: string;
}

const visibleFor = 4_000;

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), visibleFor);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((tone: Toast["tone"], message: string) => setToast({ tone, message }), []);
  const dismissToast = useCallback(() => setToast(null), []);
  return { toast, showToast, dismissToast };
}

export function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div className={cx("fc-toast", `fc-toast--${toast.tone}`)} role={toast.tone === "danger" ? "alert" : "status"}>
      <Icon name={toast.tone === "success" ? "check" : "alert"} />
      <span>{toast.message}</span>
      <IconButton label="Dismiss" onClick={onDismiss}>
        <Icon name="close" size={14} />
      </IconButton>
    </div>
  );
}
