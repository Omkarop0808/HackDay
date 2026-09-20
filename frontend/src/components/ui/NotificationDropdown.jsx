import { useState, useEffect } from "react";
import { Bell, CheckCircle2, CircleDashed } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { useUser } from "@/context/UserContext";

export function NotificationDropdown() {
  const { user } = useUser();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/notifications/${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching notifications", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const res = await fetch(`http://localhost:8000/api/notifications/${id}/read`, {
        method: 'PUT'
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error("Error marking as read", err);
    }
  };

  const markAllAsRead = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`http://localhost:8000/api/notifications/markAllRead/${user.uid}`, {
        method: 'PUT'
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Error marking all as read", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-2">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-1 text-xs h-6">
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[300px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem 
                key={n._id} 
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={() => {
                  if (!n.isRead) markAsRead(n._id);
                  if (n.actionUrl) window.location.href = n.actionUrl;
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-sm">{n.title}</span>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                {n.type === 'SubscriptionSniper' && (
                  <span className="text-[10px] font-medium text-destructive mt-1 bg-destructive/10 px-2 py-0.5 rounded-full">
                    Sniper Alert
                  </span>
                )}
                {n.type === 'MicroSacrifice' && (
                  <span className="text-[10px] font-medium text-primary mt-1 bg-primary/10 px-2 py-0.5 rounded-full">
                    Savings Tip
                  </span>
                )}
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
