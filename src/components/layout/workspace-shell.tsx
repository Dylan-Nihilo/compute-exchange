"use client";

import {AppLayout} from "@heroui-pro/react/app-layout";
import {InlineSelect} from "@heroui-pro/react/inline-select";
import {Navbar} from "@heroui-pro/react/navbar";
import {Sidebar} from "@heroui-pro/react/sidebar";
import {Avatar, Button, Dropdown, Label, ListBox} from "@heroui/react";
import {usePathname, useRouter} from "next/navigation";

import {useCurrentAccount} from "@/lib/auth/queries";
import {useAuthStore} from "@/lib/auth/store";
import type {Role} from "@/lib/domain/contracts";
import {homeForRole} from "@/lib/domain/routes";

const roleLabels: Record<Role, string> = {
  guest: "访客",
  buyer: "买家",
  supplier: "供给方",
  vendor: "设备厂商",
  funder: "资方",
  operator: "平台运营",
  admin: "系统管理员",
};

export function WorkspaceShell({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const router = useRouter();
  const {data: account} = useCurrentAccount();
  const activeRole = useAuthStore((state) => state.activeRole);
  const beginRoleSwitch = useAuthStore((state) => state.beginRoleSwitch);
  const signOut = useAuthStore((state) => state.signOut);

  if (
    !account ||
    !activeRole ||
    activeRole === "guest" ||
    !account.roles.includes(activeRole)
  ) {
    return null;
  }

  const overviewHref = homeForRole(activeRole);
  const navigation = [
    {href: overviewHref, label: "工作台概览"},
    {href: "/market", label: "算力市场"},
    ...(activeRole === "operator" || activeRole === "admin"
      ? []
      : [{href: "/auth/identity", label: "身份与认证"}]),
  ];

  function changeRole(role: Role) {
    beginRoleSwitch(role, account!.roles, homeForRole(role));
  }

  function logout() {
    signOut();
    router.replace("/auth/login");
  }

  const sidebarContent = (
    <>
      <Sidebar.Header>
        <Button
          className="justify-start px-2 font-semibold tracking-[0.12em]"
          fullWidth
          onPress={() => router.push("/")}
          variant="ghost"
        >
          算力交易平台
        </Button>
      </Sidebar.Header>
      <Sidebar.Content>
        <Sidebar.Group>
          <Sidebar.GroupLabel>{roleLabels[activeRole]}</Sidebar.GroupLabel>
          <Sidebar.Menu aria-label="工作台导航" showGuideLines={false}>
            {navigation.map((item) => (
              <Sidebar.MenuItem
                href={item.href}
                id={item.href}
                isCurrent={pathname === item.href}
                key={item.href}
                textValue={item.label}
              >
                <Sidebar.MenuItemContent>
                  <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
                </Sidebar.MenuItemContent>
              </Sidebar.MenuItem>
            ))}
          </Sidebar.Menu>
        </Sidebar.Group>
      </Sidebar.Content>
      <Sidebar.Footer>
        <Dropdown>
          <Button
            className="h-auto justify-start px-2 py-2 text-left"
            fullWidth
            variant="ghost"
          >
            <Avatar size="sm">
              <Avatar.Fallback>{account.displayName.slice(0, 1)}</Avatar.Fallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">
                {account.displayName}
              </span>
              <span className="block truncate text-xs text-muted">{account.email}</span>
            </span>
          </Button>
          <Dropdown.Popover className="min-w-48" placement="top start">
            <Dropdown.Menu
              aria-label="账户操作"
              onAction={(key) => {
                if (key === "logout") logout();
              }}
            >
              <Dropdown.Item id="logout" textValue="退出登录">
                <Label>退出登录</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </Sidebar.Footer>
    </>
  );

  const navbar = (
    <Navbar maxWidth="full">
      <Navbar.Header>
        <AppLayout.MenuToggle aria-label="打开导航" />
        <Sidebar.Trigger aria-label="切换侧栏" />
        <Navbar.Content>
          <Navbar.Label>工作台 / {roleLabels[activeRole]}</Navbar.Label>
        </Navbar.Content>
        <Navbar.Spacer />
        {account.roles.length > 1 ? (
          <InlineSelect
            aria-label="当前身份"
            value={activeRole}
            onChange={(value) => {
              if (value) changeRole(value as Role);
            }}
          >
            <InlineSelect.Trigger id="workspace-role">
              <InlineSelect.Value />
              <InlineSelect.Indicator />
            </InlineSelect.Trigger>
            <InlineSelect.Popover className="min-w-40">
              <ListBox>
                {account.roles.map((role) => (
                  <ListBox.Item id={role} key={role} textValue={roleLabels[role]}>
                    {roleLabels[role]}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </InlineSelect.Popover>
          </InlineSelect>
        ) : null}
      </Navbar.Header>
    </Navbar>
  );

  return (
    <AppLayout
      navigate={router.push}
      navbar={navbar}
      scrollMode="page"
      sidebar={
        <>
          <Sidebar>
            {sidebarContent}
            <Sidebar.Rail aria-label="折叠侧栏" />
          </Sidebar>
          <Sidebar.Mobile>
            <div className="flex h-full flex-col">{sidebarContent}</div>
          </Sidebar.Mobile>
        </>
      }
      sidebarCollapsible="offcanvas"
    >
      {children}
    </AppLayout>
  );
}
