"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "success" | "info" | "warning";
  onConfirm: () => void;
}

export function ConfirmModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
}: ConfirmModalProps) {
  const icons = {
    danger: <XCircle className="w-10 h-10 text-red-500" />,
    success: <CheckCircle className="w-10 h-10 text-green-500" />,
    warning: <AlertTriangle className="w-10 h-10 text-yellow-500" />,
    info: <Info className="w-10 h-10 text-blue-500" />,
  };

  const confirmBtnClass = {
    danger: "bg-red-500 hover:bg-red-600 text-white",
    success: "bg-green-500 hover:bg-green-600 text-white",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white",
    info: "bg-blue-500 hover:bg-blue-600 text-white",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2">{icons[variant]}</div>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-3 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${confirmBtnClass[variant]}`}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AlertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  variant?: "success" | "error" | "info" | "warning";
}

export function AlertModal({
  open,
  onOpenChange,
  title,
  description,
  variant = "info",
}: AlertModalProps) {
  const icons = {
    error: <XCircle className="w-10 h-10 text-red-500" />,
    success: <CheckCircle className="w-10 h-10 text-green-500" />,
    warning: <AlertTriangle className="w-10 h-10 text-yellow-500" />,
    info: <Info className="w-10 h-10 text-blue-500" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-sm text-center">
        <DialogHeader className="items-center">
          <div className="mx-auto mb-2">{icons[variant]}</div>
          <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
