"use client";

import {Button} from "@heroui/react";

// Non-blocking backend hints returned with a successful product submit (docs/26 §26.3.2 `data.warnings[]`).
// The product is already submitted; the supplier reads the hints, then leaves or edits the listing later.
export function SubmittedWarnings({onDone, warnings}: {onDone: () => void; warnings: string[]}) {
  return (
    <div className="rounded-xl border border-[#ead9a8] bg-[#fffaf0] px-4 py-3.5" role="status">
      <p className="text-sm font-semibold text-[#7a5a12]">商品已提交审核，但平台发现以下价格提醒</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-5 text-[#7a5a12]">
        {warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
      <p className="mt-2 text-xs text-[#8f7a45]">提醒不影响审核；如需调整价格，可在商品列表中修改后重新提交。</p>
      <div className="mt-3 flex justify-end">
        <Button onPress={onDone} size="sm" variant="primary">返回商品列表</Button>
      </div>
    </div>
  );
}
