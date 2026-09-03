"use client";

import {Navbar} from "@heroui-pro/react/navbar";
import {Sidebar} from "@heroui-pro/react/sidebar";
import {Avatar, Button, Dropdown, Label, Spinner} from "@heroui/react";
import {
  BadgeCheck,
  Banknote,
  Boxes,
  ClipboardList,
  Coins,
  FileClock,
  Gauge,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Settings2,
  ShieldCheck,
  TicketCheck,
  UserCog,
  UsersRound,
} from "lucide";
import Image from "next/image";
import {usePathname, useRouter} from "next/navigation";

import {InteractiveIcon} from "@/components/system/interactive-icon";
import type {SessionAccount} from "@/lib/auth/contracts";
import type {Role} from "@/lib/domain/contracts";

import {RouteTransition} from "./route-transition";

type AdminNavItem = {
  href: string;
  label: string;
  icon: React.ComponentProps<typeof InteractiveIcon>["icon"];
  adminOnly?: boolean;
};

const navItems: readonly AdminNavItem[] = [
  {href: "/admin", label: "运营总览", icon: LayoutDashboard},
  {href: "/admin/reviews", label: "审核中心", icon: BadgeCheck},
  {href: "/admin/products", label: "商品管理", icon: Boxes},
  {href: "/admin/orders", label: "订单管理", icon: ClipboardList},
  {href: "/admin/finance", label: "资金与对账", icon: Banknote},
  {href: "/admin/crm", label: "CRM 线索", icon: UsersRound},
  {href: "/admin/risk", label: "风控工作台", icon: ShieldCheck},
  {href: "/admin/tokens", label: "Token 管理", icon: Coins},
  {href: "/admin/tickets", label: "工单处理", icon: TicketCheck},
  {href: "/admin/cms", label: "内容管理", icon: Megaphone},
  {href: "/admin/users", label: "用户管理", icon: UserCog},
  {href: "/admin/access", label: "角色与权限", icon: Gauge, adminOnly: true},
  {href: "/admin/audit", label: "审计日志", icon: FileClock},
  {href: "/admin/settings", label: "系统设置", icon: Settings2, adminOnly: true},
];

const roleLabels: Record<Exclude<Role, "guest">, string> = {
  buyer: "买家",
  supplier: "供给方",
  vendor: "设备厂商",
  funder: "资方",
  operator: "平台运营",
  admin: "系统管理员",
};

export function AdminWorkspaceShell({
  account,
  activeRole,
  children,
  isLoggingOut,
  onChangeRole,
  onLogout,
}: {
  account: SessionAccount;
  activeRole: "operator" | "admin";
  children: React.ReactNode;
  isLoggingOut: boolean;
  onChangeRole: (role: Exclude<Role, "guest">) => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const visibleItems = navItems.filter(
    ({adminOnly}) => !adminOnly || activeRole === "admin",
  );

  return (
    <div className="omnis-workbench-controls relative min-h-screen overflow-x-clip bg-linear-to-r from-[#f3fbfe] via-[#f9fdff] to-[#fdfeff] text-[#102b3b]">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -top-[360px] left-[40%] h-[640px] w-[640px] max-w-none opacity-65"
        height={640}
        priority
        src="/images/buyer-workspace/atmosphere-ice.svg"
        width={640}
      />
      <div className="pointer-events-none absolute top-[72px] right-0 h-px w-[42%] bg-linear-to-l from-[#c9f556]/65 to-transparent" />

      <Navbar
        className="z-30 border-b border-white/35 bg-white/30 backdrop-blur-xl"
        height="72px"
        maxWidth="full"
        navigate={router.push}
        position="sticky"
      >
        <Navbar.Header className="h-[72px] px-5 sm:px-10">
          <Navbar.Brand>
            <Navbar.Item aria-label="返回万象硅芯首页" className="px-0" href="/">
              <Image
                alt="万象硅芯 OmniS"
                className="h-auto w-[132px] sm:w-[150px]"
                height={37}
                priority
                src="/images/buyer-workspace/brand.png"
                width={150}
              />
            </Navbar.Item>
          </Navbar.Brand>
          <div className="ml-5 hidden items-center gap-2 border-l border-[#b9ccd5]/45 pl-5 md:flex">
            <InteractiveIcon className="text-[#477084]" icon={ScrollText} size={15} />
            <span className="text-xs font-medium tracking-[0.08em] text-[#5e7786]">
              运营控制台
            </span>
          </div>
          <Navbar.Spacer />
          <Navbar.Content className="gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-[#b9ccd5]/35 bg-white/45 px-3 py-1.5 text-[11px] text-[#5e7786] sm:inline-flex">
              <span className="size-1.5 rounded-full bg-[#78ad27]" />
              管理员模式
            </span>
            <Dropdown>
              <Button
                className="h-[46px] gap-2.5 rounded-[14px] border border-white/35 bg-white/15 px-2.5 text-left transition-colors duration-150 hover:bg-white/45 sm:pr-3"
                isPending={isLoggingOut}
                variant="ghost"
              >
                {isLoggingOut ? (
                  <Spinner aria-hidden="true" color="current" size="sm" />
                ) : (
                  <Avatar className="bg-[#173447] text-white" size="sm">
                    <Avatar.Fallback>{account.displayName.slice(0, 1)}</Avatar.Fallback>
                  </Avatar>
                )}
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-36 truncate text-xs font-medium text-[#102b3b]">
                    {isLoggingOut ? "正在退出" : account.displayName}
                  </span>
                  <span className="block text-[10px] text-[#78909c]">
                    {roleLabels[activeRole]}
                  </span>
                </span>
              </Button>
              <Dropdown.Popover className="min-w-52" placement="bottom end">
                <Dropdown.Menu
                  aria-label="管理员账户操作"
                  onAction={(key) => {
                    if (key === "logout") onLogout();
                    else if (typeof key === "string" && key.startsWith("role:")) {
                      onChangeRole(key.slice(5) as Exclude<Role, "guest">);
                    }
                  }}
                >
                  {account.roles
                    .filter((role) => role !== activeRole)
                    .map((role) => (
                      <Dropdown.Item id={`role:${role}`} key={role} textValue={`切换为${roleLabels[role]}`}>
                        <Label>切换为{roleLabels[role]}</Label>
                      </Dropdown.Item>
                    ))}
                  <Dropdown.Item id="logout" isDisabled={isLoggingOut} textValue="退出登录">
                    <Label>{isLoggingOut ? "正在退出" : "退出登录"}</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </Navbar.Content>
        </Navbar.Header>
      </Navbar>

      <div className="relative z-20 border-b border-[#d7e5ea]/55 bg-white/35 px-4 py-2 lg:hidden">
        <nav aria-label="运营控制台导航" className="omnis-scrollbar-x flex gap-1 overflow-x-auto">
          {visibleItems.map((item) => {
            const current = isCurrentPath(pathname, item.href);
            return (
              <button
                aria-current={current ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                  current ? "bg-[#173447] text-white" : "text-[#5e7786] hover:bg-white/70"
                }`}
                key={item.href}
                onClick={() => router.push(item.href)}
                type="button"
              >
                <InteractiveIcon icon={item.icon} size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <Sidebar.Provider
        className="relative z-10 min-h-[calc(100vh-72px)]"
        collapsible="none"
        navigate={router.push}
        toggleShortcut={false}
      >
        <Sidebar className="hidden min-h-[calc(100vh-72px)] w-[224px] shrink-0 border-0 bg-transparent px-4 py-6 shadow-none lg:flex">
          <Sidebar.Content className="omnis-scrollbar gap-1.5 overflow-y-auto px-0 pb-8">
            <Sidebar.Group>
              <Sidebar.GroupLabel className="mb-2 px-0 text-[10px] font-medium text-[#9cb0ba]">
                平台运营
              </Sidebar.GroupLabel>
              <Sidebar.Menu aria-label="运营控制台导航" showGuideLines={false}>
                {visibleItems.map((item) => {
                  const current = isCurrentPath(pathname, item.href);
                  return (
                    <Sidebar.MenuItem
                      className={`text-[13px] font-medium [&_[data-slot=sidebar-menu-item-content]]:min-h-0 [&_[data-slot=sidebar-menu-item-content]]:gap-[11px] [&_[data-slot=sidebar-menu-item-content]]:rounded-[14px] [&_[data-slot=sidebar-menu-item-content]]:px-3 [&_[data-slot=sidebar-menu-item-content]]:py-2.5 [&_[data-slot=sidebar-menu-item-content]]:transition-colors [&_[data-slot=sidebar-menu-item-content]]:duration-150 ${
                        current
                          ? "[&_[data-slot=sidebar-menu-item-content]]:bg-white/65 [&_[data-slot=sidebar-menu-item-content]]:shadow-[0_7px_14px_rgba(20,79,117,0.09)] hover:[&_[data-slot=sidebar-menu-item-content]]:bg-white/75"
                          : "hover:[&_[data-slot=sidebar-menu-item-content]]:bg-white/45"
                      }`}
                      href={item.href}
                      id={item.href}
                      isCurrent={current}
                      key={item.href}
                      textValue={item.label}
                    >
                      <Sidebar.MenuItemContent>
                        <Sidebar.MenuIcon className={current ? "text-[#173447]" : "text-[#6f8793]"}>
                          <InteractiveIcon icon={item.icon} size={17} />
                        </Sidebar.MenuIcon>
                        <Sidebar.MenuLabel className="text-[#173447]">
                          {item.label}
                        </Sidebar.MenuLabel>
                      </Sidebar.MenuItemContent>
                    </Sidebar.MenuItem>
                  );
                })}
              </Sidebar.Menu>
            </Sidebar.Group>
          </Sidebar.Content>
        </Sidebar>

        <Sidebar.Main className="min-h-[calc(100vh-72px)]">
          <RouteTransition>{children}</RouteTransition>
        </Sidebar.Main>
      </Sidebar.Provider>
    </div>
  );
}

function isCurrentPath(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}
