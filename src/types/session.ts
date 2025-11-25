export interface ResearchSession {
  id?: string;
  userId?: string;
  title?: string;
  createdAt: Date;
  endedAt?: Date;
  isActive: boolean;
}

export interface SessionStats {
  sourceCount: number;
  aiSourceCount: number;
  webSourceCount: number;
  videoSourceCount: number;
  duration: number; // in milliseconds
}
