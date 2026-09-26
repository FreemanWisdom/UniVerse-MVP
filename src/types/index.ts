export type UserRole = "student" | "admin";

export interface StudentProfileSummary {
  id: string;
  fullName: string;
  avatarUrl?: string;
  schoolId?: string;
  faculty?: string;
  department?: string;
  isVerified?: boolean;
}

export interface NavigationItem {
  title: string;
  href: string;
  iconName?: string;
  badge?: string | number;
}
