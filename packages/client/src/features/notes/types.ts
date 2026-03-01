export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  parentId?: string;
  children?: string[];
  level: number;
  isExpanded: boolean;
}
