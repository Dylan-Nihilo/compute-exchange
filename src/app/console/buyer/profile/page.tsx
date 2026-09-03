"use client";

import {Button, Chip} from "@heroui/react";
import {BadgeCheck, Building2, Mail, Phone, UserRound} from "lucide";
import {useRouter} from "next/navigation";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import {useCurrentAccount} from "@/lib/auth/queries";

const statusCopy = {
  unverified: {label: "未认证", color: "default" as const},
  pending: {label: "审核中", color: "warning" as const},
  verified: {label: "已认证", color: "success" as const},
  rejected: {label: "需重新提交", color: "danger" as const},
};

export default function BuyerProfilePage() {
  const router = useRouter();
  const {data: account} = useCurrentAccount();

  if (!account) return null;

  const verification = statusCopy[account.verificationStatus];
  const canVerify =
    account.verificationStatus === "unverified" ||
    account.verificationStatus === "rejected";

  return (
    <section className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-medium text-[#6f8794]">账户设置</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-9 tracking-[-0.02em] text-[#102b3b]">
          个人/企业中心
        </h1>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-[20px] border border-white/35 bg-white/32 p-5 shadow-[0_10px_14px_rgba(14,48,69,0.05)] backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-2.5">
            <InteractiveIcon icon={UserRound} size={18} />
            <h2 className="text-base font-semibold text-[#173447]">账户信息</h2>
          </div>
          <dl className="divide-y divide-[#b0c9d6]/20">
            <ProfileRow label="账户名称" value={account.displayName} />
            <ProfileRow
              icon={Phone}
              label="绑定手机"
              value={maskPhone(account.phoneNumber)}
            />
            <ProfileRow
              icon={Mail}
              label="绑定邮箱"
              value={account.email || "未绑定"}
            />
            <ProfileRow label="当前身份" value="买家" />
          </dl>
        </section>

        <section className="flex flex-col justify-between rounded-[20px] border border-white/35 bg-white/32 p-5 shadow-[0_10px_14px_rgba(14,48,69,0.05)] backdrop-blur-xl">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <InteractiveIcon icon={BadgeCheck} size={18} />
                <h2 className="text-base font-semibold text-[#173447]">
                  个人/企业认证
                </h2>
              </div>
              <Chip color={verification.color} size="sm" variant="soft">
                {verification.label}
              </Chip>
            </div>
            <p className="mt-4 text-sm leading-6 text-[#6f8794]">
              {account.verificationStatus === "verified"
                ? "账户主体认证已完成。"
                : account.verificationStatus === "pending"
                  ? "认证资料已提交，请等待审核结果。"
                  : "完成个人或企业主体认证后，可使用受认证保护的交易功能。"}
            </p>
          </div>
          {canVerify ? (
            <Button
              className="mt-6 h-10 rounded-xl"
              onPress={() => router.push("/auth/verify")}
              variant="primary"
            >
              {account.verificationStatus === "rejected" ? "重新认证" : "开始认证"}
            </Button>
          ) : null}
        </section>
      </div>

      <section className="flex flex-col gap-4 rounded-[20px] border border-white/35 bg-white/24 p-5 shadow-[0_10px_14px_rgba(14,48,69,0.04)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <InteractiveIcon className="mt-0.5" icon={Building2} size={20} />
          <div>
            <h2 className="text-base font-semibold text-[#173447]">成为供给方</h2>
            <p className="mt-1 text-sm text-[#6f8794]">
              提交机房与经营资质，审核通过后进入供给方工作台。
            </p>
          </div>
        </div>
        <Button
          className="h-10 shrink-0 rounded-xl"
          isDisabled={account.verificationStatus !== "verified"}
          onPress={() => router.push("/supplier/apply")}
          variant="outline"
        >
          申请成为供给方
        </Button>
      </section>
    </section>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon?: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-h-14 grid-cols-[120px_minmax(0,1fr)] items-center gap-4 py-2 text-sm">
      <dt className="flex items-center gap-2 text-[#78909c]">
        {Icon ? <InteractiveIcon icon={Icon} size={15} /> : null}
        {label}
      </dt>
      <dd className="min-w-0 truncate text-right font-medium text-[#244b61]">
        {value}
      </dd>
    </div>
  );
}

function maskPhone(value: string) {
  return value.replace(/^(\d{3})\d+(\d{4})$/, "$1****$2");
}
