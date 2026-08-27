import appStore from '@/assets/img/app-store.png'
import figma from '@/assets/img/figma.png'
import pinterest from '@/assets/img/pinterest.png'
import slack from '@/assets/img/slack.png'
import spotify from '@/assets/img/spotify.png'
import telegram from '@/assets/img/telegram.png'
import wordpress from '@/assets/img/wordpress.png'

export type Job = {
  id: string
  title: string
  company: string
  logo: string
  location: string
  workplace: 'Remote' | 'Hybrid' | 'On-site'
  type: 'Full-time' | 'Part-time' | 'Contract'
  salary: string
  category: string
  posted: string
  summary: string
  skills: string[]
  description: string
  responsibilities: string[]
  requirements: string[]
}

export type Company = {
  id: string
  name: string
  logo: string
  industry: string
  location: string
  size: string
  openRoles: number
  initials: string
  accent: string
  about: string
  website: string
  founded: string
  benefits: string[]
}

export const jobs: Job[] = [
  {
    id: 'product-designer', title: 'Senior Product Designer', company: 'Figma', logo: figma,
    location: 'London, United Kingdom', workplace: 'Hybrid', type: 'Full-time', salary: '$85k – $110k',
    category: 'Design', posted: '2 days ago',
    summary: 'Shape intuitive tools that help teams turn ambitious ideas into products people love.',
    skills: ['Product design', 'Figma', 'Design systems'],
    description: 'You will join a collaborative product team working on thoughtful, high-impact workflows. You will partner closely with product, research, and engineering to take ideas from rough problem statements to polished releases.',
    responsibilities: ['Lead design from discovery through delivery for core product experiences.', 'Turn research and product data into clear interaction and visual decisions.', 'Partner with engineers to maintain a high bar for craft and accessibility.'],
    requirements: ['5+ years of product design experience in a digital product team.', 'A portfolio that shows your thinking, not only finished screens.', 'Strong communication and comfort working in an iterative environment.'],
  },
  {
    id: 'growth-marketer', title: 'Growth Marketing Manager', company: 'Spotify', logo: spotify,
    location: 'Remote — Europe', workplace: 'Remote', type: 'Full-time', salary: '$70k – $92k',
    category: 'Marketing', posted: '3 days ago',
    summary: 'Build campaigns that connect creators and listeners with the next thing they will love.',
    skills: ['Growth strategy', 'Lifecycle', 'Analytics'],
    description: 'This role owns experiments across acquisition and retention. You will balance sharp analysis with original creative thinking, helping a global community discover more of what matters to them.',
    responsibilities: ['Develop and evaluate multi-channel growth experiments.', 'Translate insights into useful, audience-first messaging.', 'Work with creative and product teams on lifecycle initiatives.'],
    requirements: ['4+ years in growth, lifecycle, or performance marketing.', 'Experience working with product and marketing analytics.', 'An instinct for clear, human communication.'],
  },
  {
    id: 'full-stack-engineer', title: 'Full-Stack Engineer', company: 'Slack', logo: slack,
    location: 'Dublin, Ireland', workplace: 'Hybrid', type: 'Full-time', salary: '$78k – $105k',
    category: 'Technology', posted: '5 days ago',
    summary: 'Create reliable, elegant collaboration experiences used by teams around the world.',
    skills: ['TypeScript', 'Node.js', 'React'],
    description: 'You will build features across the product stack and help make everyday collaboration more focused and less frustrating. The team values kind debate, pragmatic decisions, and dependable software.',
    responsibilities: ['Build and maintain well-tested product features across the stack.', 'Improve performance, observability, and development workflows.', 'Participate in design reviews and technical planning.'],
    requirements: ['3+ years of professional software development experience.', 'Fluency in modern JavaScript or TypeScript.', 'Care for code quality, product details, and your teammates.'],
  },
  {
    id: 'content-strategist', title: 'Content Strategist', company: 'WordPress', logo: wordpress,
    location: 'Remote — Global', workplace: 'Remote', type: 'Contract', salary: '$55k – $70k',
    category: 'Marketing', posted: '1 week ago',
    summary: 'Make complex product stories clear, useful, and genuinely enjoyable to read.',
    skills: ['Content strategy', 'SEO', 'Editorial'],
    description: 'You will define content that guides people through their work with confidence. You will collaborate with product teams and community experts to make every word earn its place.',
    responsibilities: ['Create product narratives and content plans.', 'Edit for clarity, consistency, and audience needs.', 'Measure content performance and improve what matters.'],
    requirements: ['A portfolio of strategic content work.', 'Excellent editorial judgement and organisation.', 'Comfort collaborating across product, support, and marketing.'],
  },
  {
    id: 'data-analyst', title: 'Product Data Analyst', company: 'App Store', logo: appStore,
    location: 'Singapore', workplace: 'On-site', type: 'Full-time', salary: '$60k – $82k',
    category: 'Analyst', posted: '1 week ago',
    summary: 'Turn meaningful product signals into decisions that improve everyday customer experiences.',
    skills: ['SQL', 'Experimentation', 'Tableau'],
    description: 'You will investigate product questions, define useful metrics, and make analysis accessible to the people making decisions. Your work will affect both product direction and customer outcomes.',
    responsibilities: ['Develop reliable reporting and self-service analysis.', 'Design and assess product experiments.', 'Present concise recommendations to non-technical partners.'],
    requirements: ['Strong SQL and practical analytical judgement.', 'Experience with product metrics and experimentation.', 'Ability to tell a clear story with data.'],
  },
  {
    id: 'community-manager', title: 'Community Manager', company: 'Telegram', logo: telegram,
    location: 'Phnom Penh, Cambodia', workplace: 'Hybrid', type: 'Full-time', salary: '$28k – $40k',
    category: 'Marketing', posted: '2 weeks ago',
    summary: 'Grow an informed, welcoming community around products that people use every day.',
    skills: ['Community', 'Social media', 'Events'],
    description: 'You will be the bridge between our community and product teams. You will create conversations, surface insights, and make sure people feel heard at every stage.',
    responsibilities: ['Plan community programmes, events, and communications.', 'Listen for feedback and turn it into product insight.', 'Build strong relationships with community members and partners.'],
    requirements: ['Experience building or supporting an online community.', 'Strong written communication and good judgement.', 'Comfort moving between strategy and hands-on execution.'],
  },
  {
    id: 'brand-designer', title: 'Brand Designer', company: 'Pinterest', logo: pinterest,
    location: 'San Francisco, United States', workplace: 'Hybrid', type: 'Full-time', salary: '$90k – $120k',
    category: 'Design', posted: '2 weeks ago',
    summary: 'Build a distinctive, flexible visual voice across campaigns and product moments.',
    skills: ['Brand systems', 'Art direction', 'Motion'],
    description: 'You will help a widely loved brand stay expressive and coherent as it grows. The work spans campaign concepts, social moments, and the visual systems that make them work at scale.',
    responsibilities: ['Create campaign concepts and high-quality design craft.', 'Evolve brand systems for consistent use across channels.', 'Partner with writers, marketers, and external creative teams.'],
    requirements: ['A standout portfolio of brand or campaign work.', 'Strong typography, composition, and visual storytelling.', 'Ability to make smart creative decisions under real constraints.'],
  },
]

export const companies: Company[] = [
  { id: 'figma', name: 'Figma', logo: figma, industry: 'Design software', location: 'London, United Kingdom', size: '501–1,000 people', openRoles: 12, initials: 'F', accent: '#f1efff', website: 'figma.com', founded: '2012', about: 'Figma makes collaborative design accessible to everyone. Its browser-based tools bring product teams together from the first spark of an idea to the final detail.', benefits: ['Flexible working', 'Learning budget', 'Health coverage', 'Generous parental leave'] },
  { id: 'spotify', name: 'Spotify', logo: spotify, industry: 'Music & audio', location: 'Stockholm, Sweden', size: '5,001–10,000 people', openRoles: 18, initials: 'S', accent: '#e9f8ee', website: 'spotify.com', founded: '2006', about: 'Spotify gives millions of creators the opportunity to live off their art and billions of fans the chance to enjoy and be inspired by it.', benefits: ['Remote-friendly', 'Wellbeing fund', 'Free premium plan', 'Global team gatherings'] },
  { id: 'slack', name: 'Slack', logo: slack, industry: 'Workplace software', location: 'Dublin, Ireland', size: '1,001–5,000 people', openRoles: 9, initials: 'S', accent: '#f8eff7', website: 'slack.com', founded: '2013', about: 'Slack is a productivity platform that brings people, information, and tools together to help teams get their best work done.', benefits: ['Hybrid work', 'Home-office support', 'Volunteer days', 'Inclusive benefits'] },
  { id: 'wordpress', name: 'WordPress', logo: wordpress, industry: 'Publishing technology', location: 'Remote — Global', size: '501–1,000 people', openRoles: 7, initials: 'W', accent: '#eef6fb', website: 'wordpress.com', founded: '2003', about: 'WordPress powers publishing for people and organisations of every size, with open-source tools that make the web more accessible.', benefits: ['Work from anywhere', 'Sabbatical leave', 'Open-source time', 'Annual team meetups'] },
  { id: 'telegram', name: 'Telegram', logo: telegram, industry: 'Communications', location: 'Dubai, United Arab Emirates', size: '201–500 people', openRoles: 6, initials: 'T', accent: '#eef8ff', website: 'telegram.org', founded: '2013', about: 'Telegram builds fast, private communication tools for hundreds of millions of people around the world.', benefits: ['Flexible hours', 'Small autonomous teams', 'Travel allowance', 'Meaningful ownership'] },
  { id: 'pinterest', name: 'Pinterest', logo: pinterest, industry: 'Consumer internet', location: 'San Francisco, United States', size: '1,001–5,000 people', openRoles: 14, initials: 'P', accent: '#fff0f1', website: 'pinterest.com', founded: '2010', about: 'Pinterest is a visual discovery engine helping people find inspiration and make their next idea happen.', benefits: ['Hybrid work', 'Career coaching', 'Wellness benefits', 'Employee resource groups'] },
]

export function getJob(id: string) {
  return jobs.find((job) => job.id === id) ?? jobs[0]!
}

export function getCompany(id: string) {
  return companies.find((company) => company.id === id) ?? companies[0]!
}
