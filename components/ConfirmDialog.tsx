"use client";

import { useRef } from "react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  /** Name the action, e.g. "Delete event". */
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

/** Confirmation for actions that can't be undone. Cancel gets focus, so Enter is safe. */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} initialFocus={cancelRef}>
      <p className="text-base text-gray-700 dark:text-gray-300">{message}</p>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button ref={cancelRef} type="button" onClick={onClose} className="btn-secondary">
          {cancelText}
        </button>
        <button type="button" onClick={handleConfirm} className={danger ? "btn-danger" : "btn-primary"}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
