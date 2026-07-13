"use client";

import {Alert, Label, Slider, Typography} from "@heroui/react";
import {DropZone} from "@heroui-pro/react/drop-zone";
import {useEffect, useRef} from "react";

export function SliderVerification({
  disabled = false,
  id,
  onValueChange,
  value,
}: {
  disabled?: boolean;
  id: string;
  onValueChange: (value: number) => void;
  value: number;
}) {
  const verified = value === 100;
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.id = id;
  }, [id]);

  return (
    <Slider
      className="w-full"
      isDisabled={disabled || verified}
      maxValue={100}
      minValue={0}
      onChange={(nextValue) => {
        if (!verified) onValueChange(Number(nextValue));
      }}
      step={10}
      value={value}
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <Label>安全验证</Label>
        <Slider.Output className={verified ? "text-success" : "text-muted"}>
          {verified ? "验证已完成" : "向右拖动滑块"}
        </Slider.Output>
      </div>
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb
          aria-valuetext={verified ? "验证已完成" : `验证进度 ${value}%`}
          inputRef={inputRef}
        />
      </Slider.Track>
    </Slider>
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
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow?: string;
  title: string;
}) {
  return (
    <header className="mb-8">
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
      <Typography className="mt-2 tracking-[-0.035em]" type="h1">
        {title}
      </Typography>
      <Typography className="mt-3 leading-6" color="muted" type="body-sm">
        {description}
      </Typography>
    </header>
  );
}
