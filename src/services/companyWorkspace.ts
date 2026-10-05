export function relativeApplicationDate(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 60) return `${minutes || 1} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function upcomingInterviewDate(daysAhead: number) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return date.toISOString()
}

// Interview data is still a separate integration step; job data is loaded from the API.
export const upcomingInterviews = [
  { date: upcomingInterviewDate(2), name: 'Ava Williams', role: 'Product Designer', time: '10:00 AM', applicantId: 'ava-williams', color: 'coral' },
  { date: upcomingInterviewDate(4), name: 'Daniel Kim', role: 'Product Manager', time: '02:30 PM', applicantId: 'daniel-kim', color: 'orange' },
  { date: upcomingInterviewDate(7), name: 'Maria Garcia', role: 'Frontend Developer', time: '11:00 AM', applicantId: 'maria-garcia', color: 'purple' },
]
