export type ResumeRecord = { id: string; fileName: string; mimeType: string; fileSize: number; isDefault: boolean; createdAt: string }
export type Education = { school: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string; description: string }
export type Experience = { company: string; position: string; employmentType: string; startDate: string; endDate: string; current: boolean; description: string }
export type Language = { name: string; proficiency: string }
export type CandidateProfile = {
  phone: string | null; websiteUrl: string | null; linkedinUrl: string | null; githubUrl: string | null;
  isOpenToWork: boolean; profileImageUrl: string | null; skills: string[];
  education: Education[]; experience: Experience[]; languages: Language[];
}
export type ApplicationStatus = 'APPLIED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN'
export type ApplicationRecord = {
  id: string; jobId: string; status: ApplicationStatus; description: string; coverLetter: string; phone: string; portfolioUrl: string;
  job: { id: string; title: string; company: string; location: string; isDemo: boolean };
  resume: { id: string; fileName: string; fileSize: number }; candidate: { firstName: string; lastName: string; email: string };
  createdAt: string; updatedAt: string; history: { status: ApplicationStatus; at: string }[];
}
export const statusLabels: Record<ApplicationStatus, string> = { APPLIED: 'Applied', UNDER_REVIEW: 'Under review', SHORTLISTED: 'Shortlisted', INTERVIEW: 'Interview', OFFERED: 'Offered', HIRED: 'Hired', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn' }
export function dateLabel(value: string) { return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) }
export function fileSize(value: number) { return value < 1024 * 1024 ? `${Math.max(1, Math.round(value / 1024))} KB` : `${(value / 1024 / 1024).toFixed(1)} MB` }
