"use client";

import {AlertDialog, Button} from "@heroui/react";

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
  return (
    <AlertDialog.Backdrop
      isKeyboardDismissDisabled={isPending}
      isOpen={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isPending) onCancel();
      }}
    >
      <AlertDialog.Container>
        <AlertDialog.Dialog className="sm:max-w-md">
          <AlertDialog.Header>
            <AlertDialog.Icon status={isDestructive ? "danger" : "accent"} />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>
          <AlertDialog.Body>{description}</AlertDialog.Body>
          <AlertDialog.Footer>
            <Button isDisabled={isPending} onPress={onCancel} variant="tertiary">
              {cancelLabel}
            </Button>
            <Button
              isDisabled={isPending}
              isPending={isPending}
              onPress={onConfirm}
              variant={isDestructive ? "danger-soft" : "primary"}
            >
              {isPending ? "正在处理" : confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  );
}
