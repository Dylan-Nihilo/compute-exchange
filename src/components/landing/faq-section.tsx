import Link from "next/link";

import {SITE_NAME, SITE_URL} from "@/lib/site";

const faqs = [
  {
    question: "如何找到适合的算力资源？",
    answer:
      "登录后进入算力市场，可按 GPU 规格、地域、计费周期与交付方式筛选资源。尚未确定配置时，也可通过首页算力顾问描述用途、规模和预算，登录后获取评估建议。",
    href: "/market",
    action: "进入算力市场",
  },
  {
    question: "算力可以按需租用吗？",
    answer:
      "算力市场提供按小时、按天、按周和按月的计费筛选。具体计费方式、最低租用时长、可用余量与交付条件以所选商品信息为准。",
    href: "/resource-usage-rules",
    action: "查看资源使用规范",
  },
  {
    question: "供给方如何入驻 OmniS？",
    answer:
      "注册并登录账户，完成个人或企业认证后，在供给方申请页面提交入驻资料。申请审核通过后，可进入供给方工作台管理资源与商品。",
    href: "/supplier/apply",
    action: "申请成为供给方",
  },
  {
    question: "AI Token 服务从哪里进入？",
    answer:
      "通过“AI Token 工厂”入口前往 Token 服务站点。服务内容、API 接入方式与计费规则以该站点说明为准。",
    href: "https://token.omnisline.com/",
    action: "进入 Token 工厂",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "@id": `${SITE_URL}/#faq`,
  inLanguage: "zh-CN",
  mainEntity: faqs.map(({question, answer}) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {"@type": "Answer", text: answer},
  })),
};

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c")}}
      />
      <div className="mx-auto grid w-[calc(100%-3rem)] max-w-[81rem] gap-10 py-20 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14 lg:py-28">
        <div>
          <h2 id="faq-title" className="text-[clamp(2rem,3.2vw,2.875rem)] leading-[1.12] font-medium tracking-[-0.055em]">
            采购与合作常见问题
          </h2>
          <p className="mt-6 max-w-[26.25rem] text-sm leading-7 text-muted">
            {SITE_NAME} 连接算力采购与资源供给，提供设备采购、组网与机电安装协作，以及 AI Token 服务入口。
          </p>
        </div>
        <dl className="divide-y divide-border border-y border-border">
          {faqs.map(({question, answer, href, action}) => (
            <div key={question} className="py-6">
              <dt className="text-base font-semibold leading-7">{question}</dt>
              <dd className="mt-2 text-sm leading-7 text-muted">
                <p>{answer}</p>
                <Link
                  href={href}
                  className="mt-3 inline-block py-1 font-medium text-link underline underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                >
                  {action}
                </Link>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
