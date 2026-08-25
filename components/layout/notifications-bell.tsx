"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatRelative, cn } from "@/lib/utils";
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  type AppNotification,
} from "@/lib/actions/notifications";

interface Props {
  role?: string;
  initialUnreadCount: number;
  collapsed?: boolean;
  variant?: "sidebar" | "icon";
}

export function NotificationsBell({
  role,
  initialUnreadCount,
  collapsed,
  variant = "sidebar",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  if (role !== "admin" && role !== "membro") return null;

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      const data = await getNotificationsAction();
      setNotifications(data);
      setLoading(false);
      setLoaded(true);
    }
  }

  async function handleSelect(notification: AppNotification) {
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationReadAction(notification.id);
    }
    setOpen(false);
    if (notification.link) router.push(notification.link);
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    markAllNotificationsReadAction();
  }

  function handleDelete(id: string) {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.read) setUnreadCount((c) => Math.max(0, c - 1));
    fetch(`/api/notifications/${id}`, { method: "DELETE" });
  }

  function handleDeleteAll() {
    setNotifications([]);
    setUnreadCount(0);
    fetch("/api/notifications", { method: "DELETE" });
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <button
            aria-label="Notificações"
            className="relative flex items-center justify-center rounded-md p-1 text-foreground transition-colors hover:bg-accent"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-semibold leading-none text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ) : (
          <button
            title={collapsed ? "Notificações" : undefined}
            className={cn(
              "relative flex items-center gap-3 border-b border-border py-[9px] text-[14px] text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent/40 hover:text-sidebar-foreground/90",
              collapsed ? "justify-center" : "px-4",
            )}
          >
            <span className="relative shrink-0">
              <Bell className="size-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            {!collapsed && <span className="tracking-[-0.01em]">Notificações</span>}
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={variant === "icon" ? "end" : "start"}
        side={variant === "icon" ? "bottom" : "right"}
        className="w-80"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notificações</p>
          {loaded && notifications.length > 0 && (
            <div className="flex items-center gap-1">
              {notifications.some((n) => !n.read) && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleMarkAllRead}>
                  Marcar todas como lidas
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={handleDeleteAll}
              >
                Eliminar todas
              </Button>
            </div>
          )}
        </div>

        {loading && (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {!loading && loaded && notifications.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            Sem notificações.
          </p>
        )}

        {!loading && notifications.length > 0 && (
          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li key={n.id} className="group relative">
                <button
                  onClick={() => handleSelect(n)}
                  className="flex w-full items-start gap-2 border-b px-3 py-2.5 pr-8 text-left transition-colors last:border-b-0 hover:bg-accent"
                >
                  <span
                    className={cn(
                      "mt-1.5 size-1.5 shrink-0 rounded-full",
                      n.read ? "bg-transparent" : "bg-blue-500",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    {n.body && (
                      <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {formatRelative(n.created_at)}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                  aria-label="Eliminar notificação"
                  className="absolute right-2 top-2.5 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
