"use client";

import {
  Alert,
  Button,
  FieldError,
  InputGroup,
  Label,
  Spinner,
  TextField,
  toast,
  Typography,
} from "@heroui/react";
import {DropZone} from "@heroui-pro/react/drop-zone";
import {useState} from "react";

import {solveCaptcha} from "@/lib/captcha/cap";

export function VerificationCodeField({
  canSend,
  id,
  isPending,
  onSend,
  resendSeconds,
}: {
  canSend: boolean;
  id: string;
  isPending: boolean;
  onSend: (captchaToken: string) => Promise<boolean>;
  resendSeconds: number;
}) {
  const [isVerifying, setIsVerifying] = useState(false);

  async function verifyAndSend() {
    setIsVerifying(true);
    try {
      const captchaToken = await solveCaptcha();
      setIsVerifying(false);
      await onSend(captchaToken);
    } catch (error) {
      toast.danger(error instanceof Error ? error.message : "安全验证未完成，请重试");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <TextField
      fullWidth
      isRequired
      name="code"
      validate={(value) =>
        /^[0-9]{6}$/.test(value) ? null : "请输入 6 位数字验证码"
      }
      variant="secondary"
    >
      <Label className="text-[13px] text-[#315064]">验证码</Label>
      <InputGroup
        className="h-[50px] rounded-[13px] border border-[rgba(183,205,215,0.44)] bg-[rgba(251,253,254,0.94)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
        fullWidth
        variant="secondary"
      >
        <InputGroup.Input
          autoComplete="one-time-code"
          id={id}
          inputMode="numeric"
          maxLength={6}
          placeholder="请输入 6 位验证码"
        />
        <InputGroup.Suffix className="pe-1">
          <Button
            className="h-9 shrink-0 rounded-[10px] px-3 text-[#2c6b88]"
            isDisabled={!canSend || isPending || isVerifying || resendSeconds > 0}
            isPending={isPending || isVerifying}
            onPress={() => void verifyAndSend()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {isPending || isVerifying ? <Spinner color="current" size="sm" /> : null}
            {isVerifying
              ? "安全验证中"
              : isPending
                ? "正在发送"
                : resendSeconds > 0
                  ? `${resendSeconds} 秒`
                  : "获取验证码"}
          </Button>
        </InputGroup.Suffix>
      </InputGroup>
      <FieldError />
    </TextField>
  );
}

export function LicenseDropZone({
  fileName,
  id,
  label = "营业执照",
  name = "businessLicense",
  onSelect,
}: {
  fileName: string;
  id: string;
  label?: string;
  name?: string;
  onSelect: (files: FileList) => void;
}) {
  const extension = fileName.split(".").pop()?.toUpperCase() || "FILE";

  return (
    <DropZone className="w-full">
      <DropZone.Area>
        <DropZone.Icon />
        <DropZone.Label>{label}</DropZone.Label>
        <DropZone.Description>支持 JPG、PNG 或 PDF 文件</DropZone.Description>
        <DropZone.Trigger>选择文件</DropZone.Trigger>
      </DropZone.Area>
      <DropZone.Input
        accept=".jpg,.jpeg,.png,.pdf"
        aria-required="true"
        id={id}
        name={name}
        onSelect={onSelect}
      />
      {fileName ? (
        <DropZone.FileList>
          <DropZone.FileItem status="complete">
            <DropZone.FileFormatIcon format={extension} />
            <DropZone.FileInfo>
              <DropZone.FileName>{fileName}</DropZone.FileName>
              <DropZone.FileMeta>已选择</DropZone.FileMeta>
            </DropZone.FileInfo>
          </DropZone.FileItem>
        </DropZone.FileList>
      ) : null}
    </DropZone>
  );
}

export function FormError({error}: {error: unknown}) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "操作未完成，请重试。";

  return (
    <Alert status="danger">
      <Alert.Content>
        <Alert.Title>操作未完成</Alert.Title>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function FormHeading({
  compact = false,
  description,
  eyebrow,
  title,
}: {
  compact?: boolean;
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className={compact ? "mb-3" : "mb-8"}>
      {eyebrow ? (
        <Typography
          className="tracking-[0.12em]"
          color="muted"
          type="body-xs"
          weight="semibold"
        >
          {eyebrow}
        </Typography>
      ) : null}
      <Typography
        className={
          compact
            ? "text-[28px] leading-10 tracking-[-0.035em] text-[#0b263a]"
            : "mt-2 tracking-[-0.035em]"
        }
        type="h1"
      >
        {title}
      </Typography>
      <Typography
        className={compact ? "mt-1 text-sm leading-[22px] text-[#647d8b]" : "mt-3 leading-6"}
        color="muted"
        type="body-sm"
      >
        {description}
      </Typography>
    </header>
  );
}
