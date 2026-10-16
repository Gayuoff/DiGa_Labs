import {
  Calendar,
  ChartColumn,
  ChartGantt,
  FileText,
  Kanban,
  LayoutGrid,
  List,
  type LucideIcon,
  Table,
  Target,
} from "lucide-react";
import type { Display } from "@/domain";

export const DISPLAY_ICONS: Record<Display, LucideIcon> = {
  list: List,
  board: Kanban,
  table: Table,
  calendar: Calendar,
  timeline: ChartGantt,
  gallery: LayoutGrid,
  doc: FileText,
  chart: ChartColumn,
  progress: Target,
};

export const DISPLAY_LABELS: Record<Display, string> = {
  list: "List",
  board: "Board",
  table: "Table",
  calendar: "Calendar",
  timeline: "Timeline",
  gallery: "Gallery",
  doc: "Document",
  chart: "Chart",
  progress: "Progress",
};
