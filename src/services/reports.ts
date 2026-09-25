import { apiRequest } from "./api";

export type ReportSubjectType = "JOB" | "COMPANY" | "USER";
export type ReportCategory =
  | "SCAM"
  | "HARASSMENT"
  | "FALSE_INFORMATION"
  | "INAPPROPRIATE"
  | "EXPIRED_OR_FILLED"
  | "OTHER";
export type ReportStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";

export const reportCategoryLabels: Record<ReportCategory, string> = {
  SCAM: "Scam or payment request",
  HARASSMENT: "Harassment or abusive conduct",
  FALSE_INFORMATION: "False or misleading information",
  INAPPROPRIATE: "Inappropriate content",
  EXPIRED_OR_FILLED: "Expired or already filled",
  OTHER: "Something else",
};

export const reportStatusLabels: Record<ReportStatus, string> = {
  OPEN: "Submitted",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export type UserReport = {
  id: string;
  subjectType: ReportSubjectType;
  subjectId: string;
  category: ReportCategory;
  description: string;
  status: ReportStatus;
  reviewedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminReport = UserReport & {
  reporter: { id: string; email: string; role: string } | null;
  subject: Record<string, unknown> | null;
  reviewedBy: { id: string; email: string } | null;
};

export type ReportPage<T> = {
  reports: T[];
  total: number;
  page: number;
  limit: number;
};

export type CreateReportInput = {
  subjectType: ReportSubjectType;
  subjectId: string;
  category: ReportCategory;
  description: string;
};

export type AdminReportFilters = {
  page?: number;
  limit?: number;
  status?: ReportStatus | "";
  subjectType?: ReportSubjectType | "";
  category?: ReportCategory | "";
  search?: string;
};

export async function submitReport(input: CreateReportInput) {
  return apiRequest<{ report: UserReport }>("/reports", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listMyReports(
  page = 1,
  limit = 20,
  status?: ReportStatus | "",
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (status) params.set("status", status);
  return apiRequest<ReportPage<UserReport>>(`/reports/me?${params.toString()}`);
}

export function listAdminReports(filters: AdminReportFilters = {}) {
  const params = new URLSearchParams({
    page: String(filters.page ?? 1),
    limit: String(filters.limit ?? 20),
  });
  if (filters.status) params.set("status", filters.status);
  if (filters.subjectType) params.set("subjectType", filters.subjectType);
  if (filters.category) params.set("category", filters.category);
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  return apiRequest<ReportPage<AdminReport>>(
    `/admin/reports?${params.toString()}`,
  );
}

export function getAdminReport(id: string) {
  return apiRequest<{ report: AdminReport }>(
    `/admin/reports/${encodeURIComponent(id)}`,
  );
}

export function startAdminReportReview(id: string) {
  return apiRequest<{ report: AdminReport }>(
    `/admin/reports/${encodeURIComponent(id)}/start-review`,
    { method: "PATCH" },
  );
}

export function resolveAdminReport(id: string, note: string) {
  return apiRequest<{ report: AdminReport }>(
    `/admin/reports/${encodeURIComponent(id)}/resolve`,
    { method: "PATCH", body: JSON.stringify({ note }) },
  );
}

export function dismissAdminReport(id: string, note: string) {
  return apiRequest<{ report: AdminReport }>(
    `/admin/reports/${encodeURIComponent(id)}/dismiss`,
    { method: "PATCH", body: JSON.stringify({ note }) },
  );
}
