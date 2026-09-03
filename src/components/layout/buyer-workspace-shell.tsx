"use client";

import {Navbar} from "@heroui-pro/react/navbar";
import {Sidebar} from "@heroui-pro/react/sidebar";
import {Avatar, Button, Dropdown, Label, Spinner} from "@heroui/react";
import Image from "next/image";
import {useQuery} from "@tanstack/react-query";
import {usePathname, useRouter} from "next/navigation";

import type {SessionAccount} from "@/lib/auth/contracts";
import {fetchUnreadNotificationCount} from "@/lib/buyer-notifications";
import type {Role} from "@/lib/domain/contracts";

import {RouteTransition} from "./route-transition";

const navItems: readonly {
  label: string;
  icon: string;
  href: string;
}[] = [
  {label: "工作台首页", icon: "layout-grid.svg", href: "/console/buyer"},
  {label: "我的订单", icon: "clipboard-list.svg", href: "/console/buyer/orders"},
  {label: "账单中心", icon: "credit-card.svg", href: "/console/buyer/billing"},
  {label: "发票管理", icon: "file-check.svg", href: "/console/buyer/invoices"},
  {label: "工单售后", icon: "life-buoy.svg", href: "/console/buyer/tickets"},
  {
    label: "个人/企业中心",
    icon: "file-check.svg",
    href: "/console/buyer/profile",
  },
  {label: "成为供给方", icon: "building.svg", href: "/supplier/apply"},
  {label: "消息中心", icon: "message-square.svg", href: "/console/buyer/messages"},
];

const roleLabels: Record<Exclude<Role, "guest">, string> = {
  buyer: "买家",
  supplier: "供给方",
  vendor: "设备厂商",
  funder: "资方",
  operator: "平台运营",
  admin: "系统管理员",
};

export function BuyerWorkspaceShell({
  account,
  children,
  isLoggingOut,
  onChangeRole,
  onLogout,
}: {
  account: SessionAccount;
  children: React.ReactNode;
  isLoggingOut: boolean;
  onChangeRole: (role: Exclude<Role, "guest">) => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const unreadQuery = useQuery({
    queryKey: ["buyer", "notifications", "unread-count"],
    queryFn: () => fetchUnreadNotificationCount(),
    refetchInterval: 60_000,
  });
  const unreadCount = unreadQuery.data ?? 0;

  return (
    <div className="omnis-workbench-controls relative min-h-screen overflow-x-clip bg-linear-to-r from-[#f3fbfe] via-[#f9fdff] to-[#fdfeff] text-[#102b3b]">
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -top-[330px] left-[46%] h-[620px] w-[620px] max-w-none opacity-80"
        height={620}
        priority
        src="/images/buyer-workspace/atmosphere-ice.svg"
        width={620}
      />
      <Image
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute top-[610px] right-[8%] h-[360px] w-[520px] max-w-none opacity-70"
        height={360}
        src="/images/buyer-workspace/atmosphere-cyan.svg"
        width={520}
      />

      <Navbar
        className="z-20 border-b border-white/30 bg-white/25 backdrop-blur-xl"
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
          <Navbar.Spacer />
          <Navbar.Content className="gap-2">
            <Button
              aria-label={unreadCount > 0 ? `消息中心, ${unreadCount} 条未读` : "消息中心"}
              className="relative h-10 w-10 min-w-10 rounded-xl border border-white/25 bg-transparent px-0"
              onPress={() => router.push("/console/buyer/messages")}
              variant="ghost"
            >
              <Image alt="" aria-hidden="true" height={16} src="/images/buyer-workspace/notification.svg" width={16} />
              {unreadCount > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#0485f7] px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Button>
            <Dropdown>
              <Button
                className="h-[46px] gap-2.5 rounded-[14px] border border-white/30 bg-white/10 px-2.5 text-left transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-white/35 sm:pr-3"
                isPending={isLoggingOut}
                variant="ghost"
              >
                {isLoggingOut ? (
                  <Spinner aria-hidden="true" color="current" size="sm" />
                ) : (
                  <Avatar className="bg-[#0485f7]/15 text-[#07567b]" size="sm">
                    <Avatar.Fallback>{account.displayName.slice(0, 1)}</Avatar.Fallback>
                  </Avatar>
                )}
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-36 truncate text-xs font-medium text-[#102b3b]">
                    {isLoggingOut ? "正在退出" : account.displayName}
                  </span>
                  <span className="block text-[10px] text-[#78909c]">买家账户</span>
                </span>
                <Image alt="" aria-hidden="true" height={16} src="/images/buyer-workspace/chevron-down.svg" width={16} />
              </Button>
              <Dropdown.Popover className="min-w-52" placement="bottom end">
                <Dropdown.Menu
                  aria-label="账户操作"
                  onAction={(key) => {
                    if (key === "logout") onLogout();
                    else if (typeof key === "string" && key.startsWith("role:")) {
                      onChangeRole(key.slice(5) as Exclude<Role, "guest">);
                    }
                  }}
                >
                  {account.roles
                    .filter((role) => role !== "buyer")
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

      <Sidebar.Provider
        className="relative z-10 min-h-[calc(100vh-72px)]"
        collapsible="none"
        navigate={router.push}
        toggleShortcut={false}
      >
        <Sidebar className="hidden min-h-[calc(100vh-72px)] w-[212px] shrink-0 border-0 bg-transparent px-4 py-6 shadow-none lg:flex">
          <Sidebar.Content className="gap-1.5 overflow-visible px-0">
            <Sidebar.Group>
              <Sidebar.GroupLabel className="mb-2 px-0 text-[10px] font-medium text-[#9cb0ba]">
                买家中心
              </Sidebar.GroupLabel>
              <Sidebar.Menu aria-label="买家工作台导航" showGuideLines={false}>
                {navItems.map((item) => {
                  const href = item.href;
                  const isCurrent = href
                    ? pathname === href ||
                      (href !== "/console/buyer" && pathname.startsWith(`${href}/`))
                    : false;

                  return (
                    <Sidebar.MenuItem
                    aria-disabled={!href}
                    className={`text-[13px] font-medium [&_[data-slot=sidebar-menu-item-content]]:min-h-0 [&_[data-slot=sidebar-menu-item-content]]:gap-[11px] [&_[data-slot=sidebar-menu-item-content]]:rounded-[14px] [&_[data-slot=sidebar-menu-item-content]]:px-3 [&_[data-slot=sidebar-menu-item-content]]:py-3 [&_[data-slot=sidebar-menu-item-content]]:transition-colors [&_[data-slot=sidebar-menu-item-content]]:duration-150 ${
                      isCurrent
                        ? "[&_[data-slot=sidebar-menu-item-content]]:bg-white/55 [&_[data-slot=sidebar-menu-item-content]]:shadow-[0_7px_9px_rgba(20,79,117,0.11)] hover:[&_[data-slot=sidebar-menu-item-content]]:bg-white/70"
                        : href
                          ? "hover:[&_[data-slot=sidebar-menu-item-content]]:bg-white/45"
                          : "!cursor-not-allowed !opacity-100"
                    }`}
                    href={href}
                    id={item.label}
                    isCurrent={isCurrent}
                    key={item.label}
                    textValue={item.label}
                  >
                    <Sidebar.MenuItemContent>
                      <Sidebar.MenuIcon className={href ? "text-[#5e7786]" : "text-[#9cb0ba]"}>
                        <Image alt="" aria-hidden="true" height={18} src={`/images/buyer-workspace/${item.icon}`} width={18} />
                      </Sidebar.MenuIcon>
                      <Sidebar.MenuLabel className={href ? "text-[#173447]" : "text-[#9cb0ba]"}>
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
