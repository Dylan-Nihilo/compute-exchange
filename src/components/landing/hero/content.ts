/**
 * Copy for the ComputeSpot landing hero.
 * Source: Figma 交付稿 "ComputeSpot 官网" frame 373:485 (01 / Hero).
 */
export const heroContent = {
  nav: {
    links: [
      {label: "算力市场", href: "/market"},
      {label: "设备市场", href: "/equipment-market"},
      {label: "业务模块", href: "#modules"},
      {label: "平台网络", href: "#network"},
      {label: "合作伙伴", href: "#partners"},
    ],
    login: {label: "登录", href: "/auth/login"},
    register: {label: "注册", href: "/auth/register"},
  },
  title: ["合规算力，", "一站式撮合与交付"],
  body: "连接合规机构与企业需求，支持 GPU 算力分时租赁、包月与灵活订单交付。",
  search: {
    placeholder: "搜索算力需求，如训练集群、推理资源",
    placeholderPrefix: "搜索算力需求，如 ",
    examples: ["训练集群", "推理资源", "现货算力", "按月租赁"],
    submitLabel: "搜索算力",
    target: "/market",
  },
  ctas: {
    primary: {label: "进入算力市场", href: "/market"},
    secondary: {label: "成为合作方", href: "/auth/register"},
  },
  support: "支持多种 GPU 规格，按需匹配算力资源",
  proof: [
    {title: "透明报价", description: "全流程资源与价格可视"},
    {title: "快速撮合", description: "灵活、持续、即时完成匹配"},
    {title: "订单管理", description: "下单、交付、文件在线追踪"},
    {title: "合规使用", description: "采用有资质的合规资源"},
  ],
} as const;
