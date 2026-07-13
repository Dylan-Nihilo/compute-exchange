"use client";

import {Button} from "@heroui/react";
import {useEffect, useRef} from "react";

export function ConfirmDialog({
  cancelLabel = "取消",
  confirmLabel = "确认",
  description,
  isPending = false,
  isDestructive = false,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isPending?: boolean;
  isDestructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-labelledby="confirm-dialog-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-foreground/20"
      onCancel={(event) => {
        event.preventDefault();
        if (!isPending) onCancel();
      }}
      onClose={() => {
        if (open && !isPending) onCancel();
      }}
      ref={dialogRef}
    >
      <div className="p-6">
        <h2 className="text-lg font-semibold" id="confirm-dialog-title">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button isDisabled={isPending} onPress={onCancel} variant="ghost">
            {cancelLabel}
          </Button>
          <Button
            isDisabled={isPending}
            onPress={onConfirm}
            variant={isDestructive ? "danger" : "primary"}
          >
            {isPending ? "正在处理" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
