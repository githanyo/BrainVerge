export type Status = "Active" | "Archived" | "Abandoned";

export type GrowthItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: Status;
  archived_reason?: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
  growthStage: string;
  growthStageLabel: string;
  stageDescription: string;
  plantIcon: string;
  confidenceScore: number;
  commitmentScore: number;
  consistencyScore: number;
  growthScore: number;
  streakDays: number;
  longestStreak: number;
  daysInactive: number;
  decay: { level: string; icon: string; message: string };
  counts: { activities: number; notes: number; files: number };
};

export type Note = {
  id: string;
  growth_item_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
};

export type FileAttachment = {
  id: string;
  growth_item_id: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
  file_size: number;
};

export type Activity = {
  id: string;
  growth_item_id: string;
  title?: string;
  action_type: string;
  timestamp: string;
};

export type ConfidenceEntry = {
  id: string;
  growth_item_id: string;
  discuss_score: number;
  apply_score: number;
  teach_score: number;
  note: string;
  created_at: string;
};

export type Dashboard = {
  items: GrowthItem[];
  active: GrowthItem[];
  top: GrowthItem[];
  atRisk: GrowthItem[];
  recent: Activity[];
  heatmap: { date: string; count: number }[];
  categories: { category: string; count: number; avgGrowth: number }[];
  insights: string[];
  summary: {
    activeCount: number;
    archivedCount: number;
    abandonedCount: number;
    currentStreak: number;
    longestStreak: number;
    avgGrowth: number;
  };
};

export type Detail = {
  item: GrowthItem;
  notes: Note[];
  files: FileAttachment[];
  activities: Activity[];
  confidence: ConfidenceEntry[];
};
