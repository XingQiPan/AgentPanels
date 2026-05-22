import { Boxes, ClipboardList, Home, MessageSquare } from "lucide-react";
import type { PageKey } from "./AppShell";

export const visibleNavItems: Array<{ key: PageKey; label: string; icon: typeof Home }> = [
  { key: "overview", label: "总览", icon: Home },
  { key: "workspace", label: "工作区", icon: Boxes },
  { key: "sessions", label: "会话", icon: MessageSquare },
  { key: "runs", label: "运行记录", icon: ClipboardList },
];

export const hiddenFutureNavItems = ["Agents", "Skills", "Agent 开发", "设置"];
