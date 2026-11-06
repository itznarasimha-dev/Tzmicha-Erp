import type {
  AttendanceRecord,
  AttendanceCorrection,
  Candidate,
  Contract,
  DailyPayment,
  DocFile,
  Employee,
  EmployeeRequest,
  JobOpening,
  LeaveRequest,
  OffboardingRecord,
  OnboardingRecord,
  PayrollEntry,
  PerformanceReview,
  SettingsData,
  Activity,
  Notification,
  Database,
  AttendanceStatus,
  PayrollStatus,
} from '../types'
import { addDays, daysAgo, daysAhead, hoursBetween, seededRandom, toISO, todayISO } from '../lib/utils'

const photo = (n: number) => `https://i.pravatar.cc/160?img=${n}`

const doc = (id: string, name: string, status: DocFile['status'], days = 30, type = 'application/pdf', size = 248000): DocFile => ({
  id,
  name,
  type,
  size,
  uploadedAt: daysAgo(days),
  status,
})

const monthDay = (offset: number, year: number) => {
  const iso = daysAhead(offset)
  return `${year}-${iso.slice(5)}`
}

const full = (first: string, last: string) => `${first} ${last}`

const employees: Employee[] = [
  {
    id: 'EMP-001', firstName: 'Amara', lastName: 'Okafor', photo: photo(47), email: 'amara.okafor@titanhr.demo', phone: '+1 212 555 0140',
    department: 'People & Culture', designation: 'HR Director', managerId: null, manager: 'Executive Office',
    employmentType: 'Full-time', joiningDate: '2019-03-11', status: 'Active', location: 'New York, US', gender: 'Female',
    dob: monthDay(3, 1987), address: '88 Greenwich St, New York, NY', emergencyContact: 'Chidi Okafor · +1 212 555 0188',
    bankAccount: '•••• 4821', salary: 148000, skills: ['People Strategy', 'Employment Law', 'Culture Design'],
    documents: [doc('DOC-1001', 'Employment Agreement.pdf', 'Verified', 420), doc('DOC-1002', 'Passport.pdf', 'Verified', 300), doc('DOC-1003', 'Tax Form W-4.pdf', 'Verified', 120)],
    bio: 'People leader focused on building humane, high-trust organizations. Leads the global people function across 4 offices.',
  },
  {
    id: 'EMP-002', firstName: 'Daniel', lastName: 'Whitfield', photo: photo(12), email: 'daniel.whitfield@titanhr.demo', phone: '+1 415 555 0121',
    department: 'Engineering', designation: 'VP of Engineering', managerId: null, manager: 'Executive Office',
    employmentType: 'Full-time', joiningDate: '2018-07-02', status: 'Active', location: 'San Francisco, US', gender: 'Male',
    dob: monthDay(44, 1984), address: '1200 Folsom St, San Francisco, CA', emergencyContact: 'Claire Whitfield · +1 415 555 0199',
    bankAccount: '•••• 7743', salary: 186000, skills: ['Platform Architecture', 'Engineering Leadership', 'Scale'],
    documents: [doc('DOC-1004', 'Employment Agreement.pdf', 'Verified', 600), doc('DOC-1005', 'NDA.pdf', 'Verified', 600)],
    bio: 'Engineering leader with 15 years of experience scaling distributed teams and platform infrastructure.',
  },
  {
    id: 'EMP-003', firstName: 'Priya', lastName: 'Raman', photo: photo(44), email: 'priya.raman@titanhr.demo', phone: '+1 415 555 0134',
    department: 'Engineering', designation: 'Engineering Manager', managerId: 'EMP-002', manager: 'Daniel Whitfield',
    employmentType: 'Full-time', joiningDate: '2020-01-20', status: 'Active', location: 'San Francisco, US', gender: 'Female',
    dob: monthDay(71, 1989), address: '455 Market St, San Francisco, CA', emergencyContact: 'Arjun Raman · +1 415 555 0177',
    bankAccount: '•••• 2290', salary: 162000, skills: ['Team Leadership', 'React', 'System Design'],
    documents: [doc('DOC-1006', 'Employment Agreement.pdf', 'Verified', 500), doc('DOC-1007', 'Degree Certificate.pdf', 'Verified', 480)],
    bio: 'Manages the product engineering group. Champions accessibility and developer experience.',
  },
  {
    id: 'EMP-004', firstName: 'Marcus', lastName: 'Chen', photo: photo(11), email: 'marcus.chen@titanhr.demo', phone: '+1 415 555 0163',
    department: 'Engineering', designation: 'Senior Frontend Engineer', managerId: 'EMP-003', manager: 'Priya Raman',
    employmentType: 'Full-time', joiningDate: '2021-05-10', status: 'Active', location: 'Remote, US', gender: 'Male',
    dob: monthDay(18, 1992), address: '18 Oak Ave, Seattle, WA', emergencyContact: 'Lily Chen · +1 206 555 0133',
    bankAccount: '•••• 5512', salary: 138000, skills: ['React', 'TypeScript', 'Design Systems', 'Accessibility'],
    documents: [doc('DOC-1008', 'Employment Agreement.pdf', 'Verified', 380), doc('DOC-1009', 'Remote Work Addendum.pdf', 'Verified', 380)],
    bio: 'Frontend specialist building the design system and core product surfaces.',
  },
  {
    id: 'EMP-005', firstName: 'Sofia', lastName: 'Alvarez', photo: photo(32), email: 'sofia.alvarez@titanhr.demo', phone: '+34 91 555 0182',
    department: 'Engineering', designation: 'Backend Engineer', managerId: 'EMP-003', manager: 'Priya Raman',
    employmentType: 'Full-time', joiningDate: '2022-02-14', status: 'Active', location: 'Madrid, ES', gender: 'Female',
    dob: monthDay(56, 1993), address: 'Calle Serrano 41, Madrid', emergencyContact: 'Diego Alvarez · +34 91 555 0111',
    bankAccount: '•••• 8830', salary: 126000, skills: ['Node.js', 'PostgreSQL', 'AWS'],
    documents: [doc('DOC-1010', 'Employment Agreement.pdf', 'Verified', 300), doc('DOC-1011', 'Visa Documentation.pdf', 'Pending', 14)],
    bio: 'Backend engineer on the payments and identity platform teams.',
  },
  {
    id: 'EMP-006', firstName: 'Noah', lastName: 'Bennett', photo: photo(15), email: 'noah.bennett@titanhr.demo', phone: '+1 512 555 0119',
    department: 'Engineering', designation: 'DevOps Engineer', managerId: 'EMP-002', manager: 'Daniel Whitfield',
    employmentType: 'Full-time', joiningDate: '2021-09-06', status: 'Active', location: 'Austin, US', gender: 'Male',
    dob: monthDay(82, 1990), address: '901 Congress Ave, Austin, TX', emergencyContact: 'Ava Bennett · +1 512 555 0180',
    bankAccount: '•••• 6637', salary: 134000, skills: ['Kubernetes', 'Terraform', 'Observability'],
    documents: [doc('DOC-1012', 'Employment Agreement.pdf', 'Verified', 340)],
    bio: 'Infrastructure and reliability engineer. Maintains the internal developer platform.',
  },
  {
    id: 'EMP-007', firstName: 'Leila', lastName: 'Haddad', photo: photo(49), email: 'leila.haddad@titanhr.demo', phone: '+971 4 555 0120',
    department: 'Engineering', designation: 'QA Engineer', managerId: 'EMP-003', manager: 'Priya Raman',
    employmentType: 'Contract', joiningDate: '2024-04-22', status: 'Active', location: 'Dubai, AE', gender: 'Female',
    dob: monthDay(63, 1995), address: 'Sheikh Zayed Rd, Dubai', emergencyContact: 'Rami Haddad · +971 4 555 0155',
    bankAccount: '•••• 9912', salary: 98000, skills: ['Test Automation', 'Playwright', 'API Testing'],
    documents: [doc('DOC-1013', 'Contractor Agreement.pdf', 'Verified', 200), doc('DOC-1014', 'Trade License.pdf', 'Pending', 9)],
    bio: 'Quality advocate focused on automated regression suites and release confidence.',
  },
  {
    id: 'EMP-008', firstName: 'Ethan', lastName: 'Brooks', photo: photo(33), email: 'ethan.brooks@titanhr.demo', phone: '+1 646 555 0148',
    department: 'Product', designation: 'Senior Product Manager', managerId: 'EMP-009', manager: 'Olivia Grant',
    employmentType: 'Full-time', joiningDate: '2020-11-16', status: 'Active', location: 'New York, US', gender: 'Male',
    dob: monthDay(27, 1991), address: '230 Park Ave, New York, NY', emergencyContact: 'Maya Brooks · +1 646 555 0102',
    bankAccount: '•••• 4410', salary: 152000, skills: ['Product Strategy', 'Discovery', 'Analytics'],
    documents: [doc('DOC-1015', 'Employment Agreement.pdf', 'Verified', 500)],
    bio: 'Owns the workforce planning and payroll product lines.',
  },
  {
    id: 'EMP-009', firstName: 'Olivia', lastName: 'Grant', photo: photo(20), email: 'olivia.grant@titanhr.demo', phone: '+1 646 555 0177',
    department: 'Product', designation: 'Head of Product', managerId: null, manager: 'Executive Office',
    employmentType: 'Full-time', joiningDate: '2019-06-03', status: 'Active', location: 'New York, US', gender: 'Female',
    dob: monthDay(92, 1986), address: '55 Hudson Yards, New York, NY', emergencyContact: 'Sam Grant · +1 646 555 0166',
    bankAccount: '•••• 1129', salary: 176000, skills: ['Product Vision', 'Leadership', 'Roadmapping'],
    documents: [doc('DOC-1016', 'Employment Agreement.pdf', 'Verified', 550)],
    bio: 'Leads product, design, and research. Former founder with a bias for customer evidence.',
  },
  {
    id: 'EMP-010', firstName: 'Yuki', lastName: 'Tanaka', photo: photo(39), email: 'yuki.tanaka@titanhr.demo', phone: '+81 3 5555 0124',
    department: 'Design', designation: 'Senior Product Designer', managerId: 'EMP-009', manager: 'Olivia Grant',
    employmentType: 'Full-time', joiningDate: '2021-03-08', status: 'Active', location: 'Tokyo, JP', gender: 'Female',
    dob: monthDay(5, 1992), address: '2-1 Marunouchi, Tokyo', emergencyContact: 'Ken Tanaka · +81 3 5555 0188',
    bankAccount: '•••• 7721', salary: 128000, skills: ['Interaction Design', 'Prototyping', 'Design Systems'],
    documents: [doc('DOC-1017', 'Employment Agreement.pdf', 'Verified', 420), doc('DOC-1018', 'Portfolio Release.pdf', 'Verified', 120)],
    bio: 'Product designer crafting calm, information-dense workflows for HR teams.',
  },
  {
    id: 'EMP-011', firstName: 'Mateo', lastName: 'Silva', photo: photo(14), email: 'mateo.silva@titanhr.demo', phone: '+55 11 5555 0133',
    department: 'Design', designation: 'UX Researcher', managerId: 'EMP-010', manager: 'Yuki Tanaka',
    employmentType: 'Full-time', joiningDate: '2022-08-15', status: 'On Leave', location: 'São Paulo, BR', gender: 'Male',
    dob: monthDay(38, 1994), address: 'Av. Paulista 1000, São Paulo', emergencyContact: 'Ana Silva · +55 11 5555 0177',
    bankAccount: '•••• 3388', salary: 112000, skills: ['Qualitative Research', 'Usability Testing', 'Synthesis'],
    documents: [doc('DOC-1019', 'Employment Agreement.pdf', 'Verified', 280)],
    bio: 'Mixed-methods researcher focused on employee experience and trust.',
  },
  {
    id: 'EMP-012', firstName: 'Chloe', lastName: 'Dubois', photo: photo(25), email: 'chloe.dubois@titanhr.demo', phone: '+33 1 5555 0166',
    department: 'Marketing', designation: 'Marketing Lead', managerId: null, manager: 'Executive Office',
    employmentType: 'Full-time', joiningDate: '2020-05-18', status: 'Active', location: 'Paris, FR', gender: 'Female',
    dob: monthDay(49, 1989), address: '12 Rue de Rivoli, Paris', emergencyContact: 'Hugo Dubois · +33 1 5555 0199',
    bankAccount: '•••• 6612', salary: 136000, skills: ['Brand Strategy', 'Demand Generation', 'Content'],
    documents: [doc('DOC-1020', 'Employment Agreement.pdf', 'Verified', 520)],
    bio: 'Builds the Titan employer brand and demand engine across EMEA.',
  },
  {
    id: 'EMP-013', firstName: 'Ryan', lastName: 'Patel', photo: photo(53), email: 'ryan.patel@titanhr.demo', phone: '+44 20 5555 0144',
    department: 'Marketing', designation: 'Content Strategist', managerId: 'EMP-012', manager: 'Chloe Dubois',
    employmentType: 'Full-time', joiningDate: '2023-01-09', status: 'Active', location: 'London, UK', gender: 'Male',
    dob: monthDay(85, 1995), address: '32 Shoreditch High St, London', emergencyContact: 'Neha Patel · +44 20 5555 0188',
    bankAccount: '•••• 2204', salary: 96000, skills: ['Copywriting', 'SEO', 'Editorial'],
    documents: [doc('DOC-1021', 'Employment Agreement.pdf', 'Verified', 200), doc('DOC-1022', 'Right to Work.pdf', 'Verified', 200)],
    bio: 'Writes about the future of work and runs the Titan journal.',
  },
  {
    id: 'EMP-014', firstName: 'Isabella', lastName: 'Rossi', photo: photo(9), email: 'isabella.rossi@titanhr.demo', phone: '+1 312 555 0111',
    department: 'Sales', designation: 'Sales Director', managerId: null, manager: 'Executive Office',
    employmentType: 'Full-time', joiningDate: '2019-10-14', status: 'Active', location: 'Chicago, US', gender: 'Female',
    dob: monthDay(30, 1988), address: '401 N Michigan Ave, Chicago, IL', emergencyContact: 'Luca Rossi · +1 312 555 0199',
    bankAccount: '•••• 9951', salary: 168000, skills: ['Enterprise Sales', 'Forecasting', 'Coaching'],
    documents: [doc('DOC-1023', 'Employment Agreement.pdf', 'Verified', 450)],
    bio: 'Leads the enterprise revenue team across North America.',
  },
  {
    id: 'EMP-015', firstName: 'Liam', lastName: "O'Connor", photo: photo(60), email: 'liam.oconnor@titanhr.demo', phone: '+353 1 555 0122',
    department: 'Sales', designation: 'Account Executive', managerId: 'EMP-014', manager: 'Isabella Rossi',
    employmentType: 'Full-time', joiningDate: '2022-06-20', status: 'Active', location: 'Dublin, IE', gender: 'Male',
    dob: monthDay(74, 1993), address: '18 Grand Canal Dock, Dublin', emergencyContact: 'Aoife O Connor · +353 1 555 0177',
    bankAccount: '•••• 7788', salary: 118000, skills: ['Mid-Market Sales', 'Negotiation', 'Salesforce'],
    documents: [doc('DOC-1024', 'Employment Agreement.pdf', 'Verified', 310)],
    bio: 'Consistently overachieves in the mid-market segment across EMEA.',
  },
  {
    id: 'EMP-016', firstName: 'Zara', lastName: 'Ahmed', photo: photo(45), email: 'zara.ahmed@titanhr.demo', phone: '+44 20 5555 0177',
    department: 'Sales', designation: 'Sales Development Rep', managerId: 'EMP-014', manager: 'Isabella Rossi',
    employmentType: 'Full-time', joiningDate: daysAgo(48), status: 'Probation', location: 'London, UK', gender: 'Female',
    dob: monthDay(69, 1999), address: '7 Brick Lane, London', emergencyContact: 'Imran Ahmed · +44 20 5555 0166',
    bankAccount: '•••• 4419', salary: 74000, skills: ['Prospecting', 'CRM', 'Outbound'],
    documents: [doc('DOC-1025', 'Employment Agreement.pdf', 'Pending', 40), doc('DOC-1026', 'Right to Work.pdf', 'Verified', 40)],
    bio: 'New to the revenue team, ramping quickly on enterprise outbound.',
  },
  {
    id: 'EMP-017', firstName: 'Grace', lastName: 'Kim', photo: photo(24), email: 'grace.kim@titanhr.demo', phone: '+1 212 555 0155',
    department: 'Finance', designation: 'Finance Manager', managerId: null, manager: 'Executive Office',
    employmentType: 'Full-time', joiningDate: '2018-12-03', status: 'Active', location: 'New York, US', gender: 'Female',
    dob: monthDay(59, 1986), address: '1 Liberty Plaza, New York, NY', emergencyContact: 'David Kim · +1 212 555 0108',
    bankAccount: '•••• 1104', salary: 158000, skills: ['FP&A', 'Controllers', 'Audit'],
    documents: [doc('DOC-1027', 'Employment Agreement.pdf', 'Verified', 700), doc('DOC-1028', 'CPA Certificate.pdf', 'Verified', 500)],
    bio: 'Owns financial controls, payroll funding, and statutory reporting.',
  },
  {
    id: 'EMP-018', firstName: 'Victor', lastName: 'Nwosu', photo: photo(59), email: 'victor.nwosu@titanhr.demo', phone: '+1 212 555 0139',
    department: 'Finance', designation: 'Payroll Specialist', managerId: 'EMP-017', manager: 'Grace Kim',
    employmentType: 'Full-time', joiningDate: '2021-11-08', status: 'Active', location: 'New York, US', gender: 'Male',
    dob: monthDay(16, 1990), address: '67 Wall St, New York, NY', emergencyContact: 'Ada Nwosu · +1 212 555 0144',
    bankAccount: '•••• 5560', salary: 92000, skills: ['Payroll Operations', 'Compliance', 'Excel'],
    documents: [doc('DOC-1029', 'Employment Agreement.pdf', 'Verified', 330)],
    bio: 'Runs multi-country payroll cycles and reconciliations.',
  },
  {
    id: 'EMP-019', firstName: 'Aisha', lastName: 'Bello', photo: photo(40), email: 'aisha.bello@titanhr.demo', phone: '+1 646 555 0182',
    department: 'People & Culture', designation: 'People Operations Partner', managerId: 'EMP-001', manager: 'Amara Okafor',
    employmentType: 'Full-time', joiningDate: '2020-09-14', status: 'Active', location: 'New York, US', gender: 'Female',
    dob: monthDay(8, 1991), address: '240 Mulberry St, New York, NY', emergencyContact: 'Tunde Bello · +1 646 555 0177',
    bankAccount: '•••• 8834', salary: 104000, skills: ['HRIS', 'Employee Relations', 'Onboarding'],
    documents: [doc('DOC-1030', 'Employment Agreement.pdf', 'Verified', 460), doc('DOC-1031', 'SHRM Certificate.pdf', 'Verified', 220)],
    bio: 'Partners with managers on employee relations, onboarding, and people systems.',
  },
  {
    id: 'EMP-020', firstName: 'Tom', lastName: 'Becker', photo: photo(52), email: 'tom.becker@titanhr.demo', phone: '+49 30 5555 0161',
    department: 'People & Culture', designation: 'Talent Acquisition Lead', managerId: 'EMP-001', manager: 'Amara Okafor',
    employmentType: 'Full-time', joiningDate: '2021-02-01', status: 'Active', location: 'Berlin, DE', gender: 'Male',
    dob: monthDay(35, 1988), address: 'Torstraße 140, Berlin', emergencyContact: 'Nina Becker · +49 30 5555 0199',
    bankAccount: '•••• 7729', salary: 108000, skills: ['Recruiting', 'Employer Brand', 'Interviewing'],
    documents: [doc('DOC-1032', 'Employment Agreement.pdf', 'Verified', 400)],
    bio: 'Leads global talent acquisition and hiring manager enablement.',
  },
  {
    id: 'EMP-021', firstName: 'Elena', lastName: 'Petrova', photo: photo(31), email: 'elena.petrova@titanhr.demo', phone: '+31 20 555 0118',
    department: 'Operations', designation: 'Operations Manager', managerId: null, manager: 'Executive Office',
    employmentType: 'Full-time', joiningDate: '2019-08-19', status: 'Active', location: 'Amsterdam, NL', gender: 'Female',
    dob: monthDay(77, 1987), address: 'Keizersgracht 210, Amsterdam', emergencyContact: 'Mikhail Petrov · +31 20 555 0166',
    bankAccount: '•••• 3345', salary: 142000, skills: ['Workplace', 'Procurement', 'Vendor Management'],
    documents: [doc('DOC-1033', 'Employment Agreement.pdf', 'Verified', 590)],
    bio: 'Keeps the global workplace running — facilities, procurement, and travel.',
  },
  {
    id: 'EMP-022', firstName: 'Hassan', lastName: 'Ali', photo: photo(58), email: 'hassan.ali@titanhr.demo', phone: '+971 4 555 0155',
    department: 'Operations', designation: 'Facilities Coordinator', managerId: 'EMP-021', manager: 'Elena Petrova',
    employmentType: 'Full-time', joiningDate: daysAgo(76), status: 'Probation', location: 'Dubai, AE', gender: 'Male',
    dob: monthDay(22, 1996), address: 'Al Quoz Industrial 3, Dubai', emergencyContact: 'Fatima Ali · +971 4 555 0188',
    bankAccount: '•••• 1123', salary: 62000, skills: ['Facilities', 'Health & Safety', 'Logistics'],
    documents: [doc('DOC-1034', 'Employment Agreement.pdf', 'Verified', 70), doc('DOC-1035', 'Certification.pdf', 'Pending', 12)],
    bio: 'Coordinates the Dubai office and regional facilities operations.',
  },
  {
    id: 'EMP-023', firstName: 'Mina', lastName: 'Park', photo: photo(26), email: 'mina.park@titanhr.demo', phone: '+1 206 555 0127',
    department: 'Customer Success', designation: 'Customer Success Manager', managerId: null, manager: 'Executive Office',
    employmentType: 'Full-time', joiningDate: '2020-02-24', status: 'Active', location: 'Seattle, US', gender: 'Female',
    dob: monthDay(66, 1990), address: '600 Pine St, Seattle, WA', emergencyContact: 'Jae Park · +1 206 555 0101',
    bankAccount: '•••• 8890', salary: 128000, skills: ['Customer Success', 'Retention', 'Playbooks'],
    documents: [doc('DOC-1036', 'Employment Agreement.pdf', 'Verified', 540)],
    bio: 'Leads customer success for the enterprise account portfolio.',
  },
  {
    id: 'EMP-024', firstName: 'Lucas', lastName: 'Moreau', photo: photo(68), email: 'lucas.moreau@titanhr.demo', phone: '+33 1 5555 0199',
    department: 'Customer Success', designation: 'Support Specialist', managerId: 'EMP-023', manager: 'Mina Park',
    employmentType: 'Full-time', joiningDate: '2022-10-17', status: 'Active', location: 'Paris, FR', gender: 'Male',
    dob: monthDay(51, 1994), address: '5 Rue Oberkampf, Paris', emergencyContact: 'Emma Moreau · +33 1 5555 0188',
    bankAccount: '•••• 5521', salary: 78000, skills: ['Technical Support', 'Documentation', 'Triage'],
    documents: [doc('DOC-1037', 'Employment Agreement.pdf', 'Verified', 280)],
    bio: 'Front-line support specialist and internal knowledge base maintainer.',
  },
  {
    id: 'EMP-025', firstName: 'Omar', lastName: 'Farouk', photo: photo(56), email: 'omar.farouk@titanhr.demo', phone: '+971 4 555 0130',
    department: 'Sales', designation: 'Account Executive', managerId: 'EMP-014', manager: 'Isabella Rossi',
    employmentType: 'Full-time', joiningDate: '2021-07-12', status: 'Notice Period', location: 'Dubai, AE', gender: 'Male',
    dob: monthDay(88, 1990), address: 'Business Bay, Dubai', emergencyContact: 'Layla Farouk · +971 4 555 0144',
    bankAccount: '•••• 4467', salary: 116000, skills: ['Enterprise Sales', 'MENA', 'Partnerships'],
    documents: [doc('DOC-1038', 'Employment Agreement.pdf', 'Verified', 380), doc('DOC-1039', 'Resignation Letter.pdf', 'Verified', 8)],
    bio: 'Enterprise seller covering the MENA region. Serving notice period.',
  },
  {
    id: 'EMP-026', firstName: 'Freya', lastName: 'Larsen', photo: photo(29), email: 'freya.larsen@titanhr.demo', phone: '+45 33 555 0120',
    department: 'Design', designation: 'Brand Designer', managerId: 'EMP-010', manager: 'Yuki Tanaka',
    employmentType: 'Full-time', joiningDate: '2019-04-08', status: 'Terminated', location: 'Copenhagen, DK', gender: 'Female',
    dob: '1990-01-19', address: 'Vesterbrogade 42, Copenhagen', emergencyContact: 'Mads Larsen · +45 33 555 0188',
    bankAccount: '•••• 1199', salary: 104000, skills: ['Brand Design', 'Illustration', 'Art Direction'],
    documents: [doc('DOC-1040', 'Employment Agreement.pdf', 'Verified', 800), doc('DOC-1041', 'Relieving Letter.pdf', 'Verified', 55)],
    bio: 'Former brand designer. Historical records retained for compliance.',
  },
]

// ——— Attendance (last 30 days, business days) —————————————————————————
const todayStatuses: AttendanceStatus[] = [
  'Present', 'Present', 'Present', 'Present', 'On Leave', 'Present', 'Absent', 'Late', 'Remote', 'On Leave',
  'Present', 'Late', 'Present', 'Absent', 'Present', 'Present', 'Remote', 'Present', 'Present', 'Late',
  'Present', 'Present', 'Absent', 'Present', 'Present', 'Present',
]

const attendance: AttendanceRecord[] = []
const rand = seededRandom(20261105)
const activeEmployees = employees.filter((e) => e.status !== 'Terminated')

for (let back = 120; back >= 0; back--) {
  const date = daysAgo(back)
  const dow = new Date(date + 'T12:00:00').getDay()
  if ((dow === 0 || dow === 6) && back !== 0) continue
  activeEmployees.forEach((emp, idx) => {
    let status: AttendanceStatus
    if (back === 0) {
      status = todayStatuses[idx % todayStatuses.length]
    } else {
      const r = rand()
      status = r < 0.865 ? 'Present' : r < 0.915 ? 'Late' : r < 0.955 ? 'Remote' : r < 0.985 ? 'Absent' : 'On Leave'
    }
    const baseIn = 8 + Math.floor(rand() * 2)
    const inMin = Math.floor(rand() * 50)
    const checkIn = status === 'Absent' || status === 'On Leave'
      ? null
      : status === 'Late'
        ? `09:${35 + Math.floor(rand() * 22)}`
        : `${String(baseIn).padStart(2, '0')}:${String(inMin).padStart(2, '0')}`
    let checkOut: string | null = null
    if (checkIn) {
      const outH = status === 'Half Day' ? 13 : 17 + Math.floor(rand() * 2)
      checkOut = `${String(outH).padStart(2, '0')}:${String(Math.floor(rand() * 55)).padStart(2, '0')}`
    }
    attendance.push({
      id: `ATT-${emp.id.replace('EMP-', '')}-${date.replace(/-/g, '')}`,
      employeeId: emp.id,
      date,
      checkIn,
      checkOut,
      status,
      hours: checkIn && checkOut ? hoursBetween(checkIn, checkOut) : 0,
      source: idx % 5 === 0 ? 'Web' : idx % 7 === 0 ? 'Manual' : 'Biometric',
      corrected: back === 2 && idx === 6 ? true : undefined,
      note: idx === 6 && back === 2 ? 'Manual correction approved — client meeting off-site.' : undefined,
    })
  })
}

// ——— Attendance corrections ————————————————————————————————————————
const corrections: AttendanceCorrection[] = [
  {
    id: 'CR-4401', employeeId: 'EMP-013', date: daysAgo(2), requestedStatus: 'Present', checkIn: '09:02', checkOut: '17:48',
    reason: 'Badge reader was offline at the London office entrance. Manager can confirm attendance.',
    status: 'Pending', requestedAt: daysAgo(1),
  },
  {
    id: 'CR-4402', employeeId: 'EMP-022', date: daysAgo(4), requestedStatus: 'Present', checkIn: '08:55', checkOut: '17:15',
    reason: 'Was on an off-site facilities inspection approved by Elena Petrova; no biometric record captured.',
    status: 'Pending', requestedAt: daysAgo(3),
  },
  {
    id: 'CR-4403', employeeId: 'EMP-007', date: daysAgo(9), requestedStatus: 'Remote', checkIn: '09:10', checkOut: '18:00',
    reason: 'Worked remotely due to a building power outage. Deliverables were completed as planned.',
    status: 'Approved', requestedAt: daysAgo(8), reviewedBy: 'Aisha Bello', remarks: 'Approved — outage confirmed by facilities.',
  },
  {
    id: 'CR-4404', employeeId: 'EMP-016', date: daysAgo(11), requestedStatus: 'Late', checkIn: '10:05', checkOut: '18:30',
    reason: 'Requesting status change from absent to late; public transport disruption.',
    status: 'Rejected', requestedAt: daysAgo(10), reviewedBy: 'Aisha Bello', remarks: 'No supporting evidence provided within the correction window.',
  },
]

// ——— Leave requests ————————————————————————————————————————————————
const leaveSeed: Array<[string, string, number, number, string, LeaveRequest['status'], string, LeaveRequest['priority']]> = [
  ['EMP-005', 'Sick Leave', -1, 2, 'Recovering from a viral infection. Doctor advised rest with a follow-up on Thursday.', 'Approved', 'Amara Okafor', 'High'],
  ['EMP-011', 'Annual Leave', -3, 1, 'Family trip to Rio. Handover completed with Yuki and the design pod.', 'Approved', 'Amara Okafor', 'Medium'],
  ['EMP-016', 'Casual Leave', 2, 1, 'Apartment move — need one day for the movers.', 'Pending', 'Aisha Bello', 'Low'],
  ['EMP-004', 'Annual Leave', 8, 4, 'Annual family vacation planned in advance. Coverage agreed with Priya.', 'Pending', 'Amara Okafor', 'Medium'],
  ['EMP-013', 'Sick Leave', -4, 0, 'Migraine — unable to work from screens.', 'Approved', 'Aisha Bello', 'Medium'],
  ['EMP-018', 'Casual Leave', 5, 1, 'Attending a payroll compliance workshop.', 'Pending', 'Aisha Bello', 'Low'],
  ['EMP-015', 'Annual Leave', 14, 5, 'Pre-booked trip to Portugal.', 'Pending', 'Amara Okafor', 'Medium'],
  ['EMP-022', 'Sick Leave', -9, 1, 'Dental procedure and recovery.', 'Approved', 'Aisha Bello', 'Medium'],
  ['EMP-010', 'Compensatory Off', -6, 0, 'Weekend launch support for the payroll release.', 'Approved', 'Amara Okafor', 'Low'],
  ['EMP-012', 'Maternity Leave', 20, 60, 'Planned maternity leave following handover to the marketing pod.', 'Pending', 'Amara Okafor', 'High'],
  ['EMP-007', 'Unpaid Leave', -15, 2, 'Personal matter requiring travel outside the UAE.', 'Rejected', 'Aisha Bello', 'High'],
  ['EMP-020', 'Annual Leave', -22, 3, 'Short break with family.', 'Approved', 'Amara Okafor', 'Low'],
  ['EMP-003', 'Casual Leave', 3, 1, 'Parent-teacher meeting at school.', 'Pending', 'Aisha Bello', 'Medium'],
  ['EMP-024', 'Sick Leave', -30, 1, 'Flu symptoms.', 'Approved', 'Aisha Bello', 'Low'],
  ['EMP-006', 'Annual Leave', 27, 6, 'Hiking holiday booked six months ago.', 'Approved', 'Amara Okafor', 'Low'],
  ['EMP-017', 'Casual Leave', -12, 1, 'Personal errand.', 'Cancelled', 'Aisha Bello', 'Low'],
]

const leaves: LeaveRequest[] = leaveSeed.map((l, i) => {
  const from = daysAhead(l[2])
  const days = l[3]
  return {
    id: `LV-${String(2400 + i)}`,
    employeeId: l[0],
    leaveType: l[1],
    from,
    to: addDays(from, days),
    days: days + 1,
    reason: l[4],
    status: l[5],
    appliedOn: daysAgo(4 + i),
    reviewer: l[6],
    remarks: l[5] === 'Approved' ? 'Approved — coverage confirmed with the reporting manager.' : l[5] === 'Rejected' ? 'Unable to approve during the quarterly close window.' : '',
    priority: l[7],
  }
})

// ——— Recruitment ——————————————————————————————————————————————————
const jobs: JobOpening[] = [
  { id: 'JOB-001', title: 'Senior Frontend Engineer', department: 'Engineering', location: 'New York, US', employmentType: 'Full-time', posted: daysAgo(21), deadline: daysAhead(18), status: 'Open', hiringManager: 'Priya Raman', openings: 2, description: 'Build accessible, high-performance interfaces for the Titan workforce platform.' },
  { id: 'JOB-002', title: 'Product Designer', department: 'Design', location: 'Remote, EU', employmentType: 'Full-time', posted: daysAgo(16), deadline: daysAhead(12), status: 'Open', hiringManager: 'Yuki Tanaka', openings: 1, description: 'Own end-to-end design for payroll and contract workflows.' },
  { id: 'JOB-003', title: 'Account Executive', department: 'Sales', location: 'London, UK', employmentType: 'Full-time', posted: daysAgo(30), deadline: daysAhead(7), status: 'Open', hiringManager: 'Isabella Rossi', openings: 3, description: 'Close mid-market and enterprise deals across EMEA.' },
  { id: 'JOB-004', title: 'Data Analyst', department: 'Product', location: 'Remote, US', employmentType: 'Contract', posted: daysAgo(9), deadline: daysAhead(24), status: 'Open', hiringManager: 'Olivia Grant', openings: 1, description: 'Turn workforce data into insight for product and people teams.' },
  { id: 'JOB-005', title: 'People Operations Intern', department: 'People & Culture', location: 'New York, US', employmentType: 'Internship', posted: daysAgo(12), deadline: daysAhead(15), status: 'Open', hiringManager: 'Amara Okafor', openings: 2, description: 'Support onboarding, people systems, and employee experience initiatives.' },
  { id: 'JOB-006', title: 'DevOps Engineer', department: 'Engineering', location: 'Berlin, DE', employmentType: 'Full-time', posted: daysAgo(40), deadline: daysAhead(3), status: 'On Hold', hiringManager: 'Daniel Whitfield', openings: 1, description: 'Own reliability and developer productivity tooling.' },
  { id: 'JOB-007', title: 'Finance Associate', department: 'Finance', location: 'New York, US', employmentType: 'Full-time', posted: daysAgo(64), deadline: daysAgo(8), status: 'Closed', hiringManager: 'Grace Kim', openings: 1, description: 'Support month-end close and payroll funding.' },
  { id: 'JOB-008', title: 'Customer Success Manager', department: 'Customer Success', location: 'Remote, US', employmentType: 'Full-time', posted: daysAgo(18), deadline: daysAhead(21), status: 'Open', hiringManager: 'Mina Park', openings: 1, description: 'Own enterprise accounts and drive product adoption.' },
]

const candidateSeed: Array<[string, string, string, Candidate['stage'], number, number, number, string, number]> = [
  ['Nadia', 'Rahman', 'JOB-001', 'Interview', 12, 7, 5, 'LinkedIn', 142000],
  ['Jonas', 'Weber', 'JOB-001', 'Screening', 8, 6, 3, 'Referral', 136000],
  ['Ava', 'Thompson', 'JOB-001', 'Applied', 4, 8, 2, 'Careers page', 145000],
  ['Ravi', 'Kumar', 'JOB-001', 'Offer', 18, 9, 4, 'Agency', 150000],
  ['Sienna', 'Brooks', 'JOB-001', 'Hired', 24, 7, 5, 'LinkedIn', 140000],
  ['Emil', 'Nielsen', 'JOB-002', 'Interview', 10, 6, 4, 'Dribbble', 118000],
  ['Ines', 'Costa', 'JOB-002', 'Screening', 6, 5, 3, 'Referral', 112000],
  ['Theo', 'Martin', 'JOB-002', 'Rejected', 20, 4, 2, 'Careers page', 108000],
  ['Maya', 'Iyer', 'JOB-002', 'Offer', 15, 8, 5, 'LinkedIn', 126000],
  ['Oliver', 'Smith', 'JOB-003', 'Interview', 9, 7, 6, 'LinkedIn', 124000],
  ['Fatima', 'Al Zahra', 'JOB-003', 'Screening', 5, 8, 4, 'Referral', 118000],
  ['Ben', 'Carter', 'JOB-003', 'Applied', 3, 5, 3, 'Job board', 110000],
  ['Camila', 'Duarte', 'JOB-003', 'Hired', 28, 9, 7, 'Agency', 132000],
  ['Sam', 'Osei', 'JOB-003', 'Interview', 11, 6, 4, 'Careers page', 115000],
  ['Hana', 'Sato', 'JOB-003', 'Rejected', 22, 5, 2, 'Job board', 105000],
  ['Leo', 'Fischer', 'JOB-004', 'Screening', 7, 6, 3, 'LinkedIn', 96000],
  ['Priyanka', 'Nair', 'JOB-004', 'Interview', 13, 8, 5, 'Referral', 104000],
  ['Owen', 'Murphy', 'JOB-004', 'Applied', 2, 4, 2, 'Careers page', 92000],
  ['Zoe', 'Nguyen', 'JOB-005', 'Applied', 2, 5, 1, 'University fair', 48000],
  ['Idris', 'Bello', 'JOB-005', 'Screening', 6, 6, 1, 'Referral', 50000],
  ['Anya', 'Kowalski', 'JOB-005', 'Interview', 9, 7, 2, 'Careers page', 52000],
  ['Felix', 'Andersen', 'JOB-006', 'Screening', 14, 7, 5, 'LinkedIn', 128000],
  ['Noor', 'Hassan', 'JOB-006', 'Interview', 20, 8, 4, 'Agency', 134000],
  ['Julia', 'Mendes', 'JOB-008', 'Interview', 8, 8, 4, 'LinkedIn', 121000],
  ['Caleb', 'Wright', 'JOB-008', 'Screening', 4, 6, 3, 'Referral', 115000],
  ['Grace', 'Liu', 'JOB-008', 'Offer', 16, 9, 6, 'LinkedIn', 128000],
]

const candidates: Candidate[] = candidateSeed.map((c, i) => {
  const cand: Candidate = {
    id: `CND-${String(3100 + i)}`,
    name: full(c[0], c[1]),
    email: `${c[0].toLowerCase()}.${c[1].toLowerCase().replace(/\s/g, '')}@example.com`,
    phone: `+1 415 555 ${String(2000 + i * 7).slice(-4)}`,
    jobId: c[2],
    stage: c[3],
    appliedOn: daysAgo(c[4]),
    source: c[7],
    resumeName: `${c[0]}_${c[1]}_Resume.pdf`,
    rating: c[6],
    experience: c[5],
    currentCompany: ['Vertex Labs', 'Northwind', 'Acme Corp', 'Lumen Studio', 'Polaris', 'Craft & Co'][i % 6],
    expectedSalary: c[8],
    notes: '',
  }
  if (cand.stage === 'Interview') {
    cand.interview = {
      id: `INT-${i}`,
      round: 'Technical / Portfolio',
      date: daysAhead((i % 5) + 1),
      time: ['10:00', '11:30', '14:00', '15:30'][i % 4],
      interviewer: ['Priya Raman', 'Yuki Tanaka', 'Isabella Rossi', 'Tom Becker'][i % 4],
      mode: i % 2 === 0 ? 'Video' : 'On-site',
      rating: c[6],
    }
  }
  if (cand.stage === 'Offer') {
    cand.offerSalary = c[8]
    cand.offerStatus = i % 2 === 0 ? 'Sent' : 'Accepted'
  }
  if (cand.stage === 'Hired') {
    cand.offerSalary = c[8]
    cand.offerStatus = 'Accepted'
  }
  if (cand.stage === 'Rejected') {
    cand.rejectionReason = ['Strong candidate, but experience is below the level for this role.', 'Compensation expectations above the approved band.', 'Withdrew after accepting another offer.'][i % 3]
  }
  return cand
})

// ——— Onboarding ————————————————————————————————————————————————————
const onboardingChecklist = (seed: number): OnboardingRecord['checklist'] => {
  const items: Array<[string, string, OnboardingRecord['checklist'][number]['category']]> = [
    ['Signed offer letter received', 'Aisha Bello', 'Documents'],
    ['Government ID & address proof', 'Aisha Bello', 'Documents'],
    ['Tax and bank details submitted', 'Victor Nwosu', 'Documents'],
    ['Laptop and equipment prepared', 'Hassan Ali', 'IT & Access'],
    ['Email and ERP account created', 'Noah Bennett', 'IT & Access'],
    ['Manager intro & buddy assigned', 'Tom Becker', 'People'],
    ['Induction session scheduled', 'Aisha Bello', 'People'],
    ['Policy acknowledgements signed', 'Aisha Bello', 'Compliance'],
  ]
  return items.map((it, i) => ({
    id: `OB${seed}-${i}`,
    label: it[0],
    owner: it[1],
    category: it[2],
    done: i < (seed % 6) + 2 ? true : i === 3 && seed % 3 === 0,
  }))
}

const onboardingSeed: Array<[string, string, string, string, string, number, 'Not Started' | 'In Progress' | 'Ready' | 'Completed', string, string, string]> = [
  ['Iris', 'Van Dijk', 'Product Designer', 'Design', 'Yuki Tanaka', 4, 'In Progress', 'EMP-027', 'Design', 'iris.vandijk@titanhr.demo'],
  ['Kwame', 'Mensah', 'Frontend Engineer', 'Engineering', 'Priya Raman', 9, 'In Progress', 'EMP-028', 'Engineering', 'kwame.mensah@titanhr.demo'],
  ['Ella', 'Fitzgerald', 'Account Executive', 'Sales', 'Isabella Rossi', 12, 'Not Started', 'EMP-029', 'Sales', 'ella.fitzgerald@titanhr.demo'],
  ['Arjun', 'Mehta', 'Data Analyst', 'Product', 'Olivia Grant', 17, 'In Progress', 'EMP-030', 'Product', 'arjun.mehta@titanhr.demo'],
  ['Sara', 'Lindqvist', 'People Operations Intern', 'People & Culture', 'Amara Okafor', 24, 'Not Started', 'EMP-031', 'People & Culture', 'sara.lindqvist@titanhr.demo'],
  ['Diego', 'Ramirez', 'Customer Success Manager', 'Customer Success', 'Mina Park', 2, 'Ready', 'EMP-032', 'Customer Success', 'diego.ramirez@titanhr.demo'],
]

const onboarding: OnboardingRecord[] = onboardingSeed.map((o, i) => {
  const checklist = onboardingChecklist(i + 2)
  const done = checklist.filter((c) => c.done).length
  return {
    id: `ONB-${String(900 + i)}`,
    name: full(o[0], o[1]),
    email: o[9],
    designation: o[2],
    department: o[3],
    manager: o[4],
    employmentType: 'Full-time',
    joiningDate: daysAhead(o[5]),
    status: o[6],
    employeeId: o[7],
    notes: 'Demo onboarding record — checklist and documents are local only.',
    documents: [
      { ...doc(`OD-${i}-1`, 'Offer Letter.pdf', done > 2 ? 'Verified' : 'Pending', 12), size: 182000 },
      { ...doc(`OD-${i}-2`, 'ID Proof.pdf', done > 3 ? 'Verified' : 'Pending', 10), size: 420000 },
      { ...doc(`OD-${i}-3`, 'Tax Declaration.pdf', done > 5 ? 'Verified' : 'Pending', 8), size: 96000 },
    ],
    systems: [
      { id: `SYS-${i}-1`, name: 'Email & Workspace', enabled: true },
      { id: `SYS-${i}-2`, name: 'Titan ERP access', enabled: i % 2 === 0 },
      { id: `SYS-${i}-3`, name: 'Slack workspace', enabled: done > 4 },
      { id: `SYS-${i}-4`, name: 'VPN & SSO', enabled: done > 5 },
    ],
    checklist,
  }
})

// ——— Payroll ————————————————————————————————————————————————————————
const now = new Date()
const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
const previousPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

const payrollStatuses: PayrollStatus[] = ['Draft', 'HR Review', 'HR Review', 'Finance Approval', 'Finance Approval', 'Approved', 'Paid', 'Draft', 'HR Review', 'Finance Approval']

const payroll: PayrollEntry[] = []
employees.filter((e) => e.status !== 'Terminated').forEach((emp, idx) => {
  const basic = Math.round(emp.salary / 12)
  const allowances = Math.round(basic * 0.18)
  const overtime = idx % 4 === 0 ? 320 : idx % 5 === 0 ? 180 : 0
  const deductions = idx % 6 === 0 ? 120 : 0
  const leaveDeduction = idx % 7 === 0 ? Math.round(basic * 0.04) : 0
  const tax = Math.round((basic + allowances) * 0.22)
  payroll.push({
    id: `PR-${currentPeriod.replace('-', '')}-${emp.id.replace('EMP-', '')}`,
    employeeId: emp.id,
    period: currentPeriod,
    basic,
    allowances,
    overtime,
    deductions,
    leaveDeduction,
    tax,
    attendanceDays: 21 - (idx % 3),
    leaveDays: idx % 5 === 0 ? 1 : 0,
    status: idx < 10 ? payrollStatuses[idx % payrollStatuses.length] : 'HR Review',
    note: idx === 0 ? 'Payroll prepared. Awaiting HR review before finance approval.' : '',
  })
  payroll.push({
    id: `PR-${previousPeriod.replace('-', '')}-${emp.id.replace('EMP-', '')}`,
    employeeId: emp.id,
    period: previousPeriod,
    basic,
    allowances,
    overtime: idx % 3 === 0 ? 240 : 0,
    deductions: 0,
    leaveDeduction: 0,
    tax,
    attendanceDays: 22,
    leaveDays: 0,
    status: 'Paid',
    note: 'Settled in the previous payroll run.',
  })
})

// ——— Contracts ——————————————————————————————————————————————————————
const contractTypes = ['Employment Agreement', 'Fixed Term Contract', 'Consultancy Agreement', 'Vendor Services Agreement', 'NDA', 'Internship Agreement']
const contractPartyNames = [
  employees[3], employees[5], employees[7], employees[14], employees[16], employees[19],
  employees[21], employees[23], employees[9], employees[12],
]

const contractSeed: Array<[number | null, string, Contract['partyType'], Contract['status'], number, number, string, number, Contract['paymentFrequency']]> = [
  [0, 'Senior Frontend Engineer Agreement', 'Employee', 'Active', -320, 410, 'Engineering', 138000, 'Monthly'],
  [1, 'DevOps Engineering Agreement', 'Employee', 'Expiring Soon', -700, 21, 'Engineering', 134000, 'Monthly'],
  [2, 'Senior Product Manager Agreement', 'Employee', 'Active', -480, 260, 'Product', 152000, 'Monthly'],
  [3, 'Account Executive — EMEA', 'Employee', 'Pending Signature', -4, 361, 'Sales', 118000, 'Monthly'],
  [4, 'Finance Manager Employment Agreement', 'Employee', 'Active', -900, 540, 'Finance', 158000, 'Monthly'],
  [5, 'Payroll Operations Agreement', 'Employee', 'Active', -380, 300, 'Finance', 92000, 'Monthly'],
  [6, 'People Operations Partner Agreement', 'Employee', 'Active', -610, 180, 'People & Culture', 104000, 'Monthly'],
  [7, 'Facilities Coordinator Agreement', 'Employee', 'Pending Review', -12, 353, 'Operations', 62000, 'Monthly'],
  [8, 'Brand Design Consultancy', 'Contractor', 'Expired', -500, -30, 'Design', 48000, 'Milestone'],
  [9, 'Content Strategy Retainer', 'Contractor', 'Active', -200, 160, 'Marketing', 36000, 'Quarterly'],
  [null as unknown as number, 'Office Facilities Management', 'Vendor', 'Active', -260, 105, 'Operations', 96000, 'Monthly'],
  [null as unknown as number, 'Legal Advisory Services', 'Vendor', 'Pending Review', -2, 364, 'Finance', 72000, 'Quarterly'],
  [null as unknown as number, 'Recruitment Agency Partnership', 'Vendor', 'Active', -420, 45, 'People & Culture', 54000, 'Milestone'],
  [null as unknown as number, 'Design Software Enterprise License', 'Vendor', 'Expiring Soon', -360, 12, 'Design', 24000, 'Annual'],
  [null as unknown as number, 'Background Verification Services', 'Vendor', 'Active', -150, 210, 'People & Culture', 18000, 'Quarterly'],
  [null as unknown as number, 'Cloud Infrastructure Agreement', 'Vendor', 'Active', -530, 190, 'Engineering', 240000, 'Annual'],
  [null as unknown as number, 'Workplace Catering Services', 'Vendor', 'Pending Signature', -6, 359, 'Operations', 30000, 'Monthly'],
  [null as unknown as number, 'Data Processing Addendum', 'Vendor', 'Draft', 0, 365, 'Engineering', 0, 'One-time'],
  [null as unknown as number, 'Sales Enablement Consultant', 'Contractor', 'Terminated', -300, -45, 'Sales', 28000, 'Milestone'],
  [null as unknown as number, 'Customer Success Playbook', 'Contractor', 'Renewed', -600, 240, 'Customer Success', 22000, 'One-time'],
  [null as unknown as number, 'Employer Brand Video Production', 'Vendor', 'Renewed', -700, 200, 'Marketing', 35000, 'Milestone'],
  [null as unknown as number, 'Security Audit Services', 'Vendor', 'Active', -90, 275, 'Engineering', 48000, 'Milestone'],
]

const contracts: Contract[] = contractSeed.map((c, i) => {
  const emp = c[0] === null ? null : contractPartyNames[c[0]]
  const start = daysAhead(c[4])
  const end = daysAhead(c[5])
  const partyName = emp ? full(emp.firstName, emp.lastName) : [
    'Workspace Facilities Co.', 'Harbor & Grey LLP', 'TalentBridge Partners', 'Canvas Software Inc.',
    'VerifyPro Screening', 'Northwind Cloud', 'Gather & Feast', 'Evergreen Data Office', 'Summit Sales Advisory',
    'Storyline Studio', 'BrightFrame Media', 'Shieldpoint Security',
  ][i % 12]
  const docCount = i % 3
  return {
    id: `CTR-${new Date().getFullYear()}-${String(101 + i)}`,
    title: c[1],
    partyType: c[2],
    employeeId: emp?.id,
    partyName,
    department: c[6],
    contractType: c[2] === 'Vendor' ? contractTypes[i % 2 === 0 ? 3 : 2] : c[2] === 'Contractor' ? contractTypes[2] : contractTypes[0],
    startDate: start,
    endDate: end,
    value: c[7],
    paymentFrequency: c[8],
    status: c[3],
    createdAt: daysAgo(c[4] < 0 ? Math.abs(c[4]) + 5 : 10),
    signatures: [
      { id: `SIG-${i}-1`, name: emp ? full(emp.firstName, emp.lastName) : 'Authorized Signatory', role: c[2], status: c[3] === 'Draft' || c[3] === 'Pending Review' ? 'Pending' : 'Signed', signedAt: c[3] === 'Draft' ? undefined : daysAgo(Math.max(0, Math.abs(c[4]) - 2)) },
      { id: `SIG-${i}-2`, name: 'Amara Okafor', role: 'HR Director', status: c[3] === 'Pending Signature' || c[3] === 'Draft' || c[3] === 'Pending Review' ? 'Pending' : 'Signed', signedAt: c[3] === 'Pending Signature' ? undefined : daysAgo(Math.max(0, Math.abs(c[4]))) },
    ],
    documents: [
      doc(`CDOC-${i}-1`, `${c[1].slice(0, 32)}.pdf`, i % 4 === 3 ? 'Pending' : 'Verified', 20 + i),
      ...(docCount > 1 ? [doc(`CDOC-${i}-2`, 'Signed Addendum.pdf', 'Verified', 40 + i)] : []),
      ...(docCount > 2 ? [doc(`CDOC-${i}-3`, 'Compliance Checklist.pdf', 'Pending', 6 + i)] : []),
    ],
    notes: 'Demo contract record. Documents are placeholders and no data leaves your browser.',
    paymentSchedule: Array.from({ length: c[8] === 'Monthly' ? 6 : 3 }).map((_, k) => ({
      id: `PS-${i}-${k}`,
      dueDate: addDays(start, k * (c[8] === 'Monthly' ? 30 : c[8] === 'Quarterly' ? 90 : 180)),
      amount: c[8] === 'Monthly' ? Math.round(c[7] / 12) : c[8] === 'Quarterly' ? Math.round(c[7] / 4) : Math.round(c[7] / 3),
      status: addDays(start, k * 30) < todayISO() ? 'Paid' : 'Scheduled',
    })),
    history: [
      { id: `CH-${i}-1`, date: daysAgo(c[4] < 0 ? Math.abs(c[4]) + 4 : 12), action: 'Contract created', actor: 'Aisha Bello' },
      { id: `CH-${i}-2`, date: daysAgo(c[4] < 0 ? Math.abs(c[4]) + 2 : 8), action: 'Sent for internal review', actor: 'Amara Okafor' },
      { id: `CH-${i}-3`, date: daysAgo(c[4] < 0 ? Math.abs(c[4]) : 5), action: `Status set to ${c[3]}`, actor: 'Aisha Bello' },
    ],
  }
})

// ——— Daily payments ————————————————————————————————————————————————
const paymentSeed: Array<[string, DailyPayment['partyType'], string | undefined, string, number, DailyPayment['approvalStatus'], DailyPayment['paymentStatus'], number, string]> = [
  ['Marcus Chen', 'Employee', 'EMP-004', 'Overtime', 320, 'Approved', 'Paid', 0, 'Weekend deployment support for release 4.2.'],
  ['Leila Haddad', 'Contractor', 'EMP-007', 'Contractor Fee', 2400, 'Approved', 'Paid', 0, 'QA automation sprint — milestone 3.'],
  ['Ryan Patel', 'Employee', 'EMP-013', 'Reimbursement', 186, 'Pending', 'Pending', 0, 'Home office monitor reimbursement with receipt attached.'],
  ['Workspace Facilities Co.', 'Vendor', undefined, 'Vendor Payment', 4800, 'Pending', 'Pending', 0, 'Monthly facility management — main office.'],
  ['Tom Becker', 'Employee', 'EMP-020', 'Reimbursement', 640, 'Approved', 'Processing', 1, 'Recruitment event travel expenses.'],
  ['Nadia Rahman', 'Contractor', undefined, 'Contractor Fee', 1500, 'Approved', 'Paid', -1, 'Interview panel support — external specialist.'],
  ['Sofia Alvarez', 'Employee', 'EMP-005', 'Salary Advance', 1200, 'Approved', 'Paid', -1, 'Approved salary advance — repayment over 3 months.'],
  ['Harbor & Grey LLP', 'Vendor', undefined, 'Vendor Payment', 6000, 'Pending', 'Overdue', -4, 'Quarterly legal advisory retainer.'],
  ['Liam O\'Connor', 'Employee', 'EMP-015', 'Bonus', 2500, 'Approved', 'Paid', -2, 'Q3 enterprise deal bonus.'],
  ['Gather & Feast', 'Vendor', undefined, 'Vendor Payment', 1850, 'Rejected', 'Failed', -3, 'Catering invoice missing PO reference.'],
  ['Hassan Ali', 'Employee', 'EMP-022', 'Reimbursement', 120, 'Approved', 'Paid', -1, 'Office supplies purchase.'],
  ['Zara Ahmed', 'Employee', 'EMP-016', 'Overtime', 210, 'Pending', 'Pending', 0, 'Weekend sales development sprint.'],
  ['Aisha Bello', 'Employee', 'EMP-019', 'Reimbursement', 340, 'Approved', 'Processing', 0, 'Onboarding kit and welcome materials.'],
  ['TalentBridge Partners', 'Vendor', undefined, 'Vendor Payment', 7500, 'Pending', 'Pending', 2, 'Agency placement fee — two hires.'],
  ['Ethan Brooks', 'Employee', 'EMP-008', 'Overtime', 480, 'Approved', 'Paid', -5, 'Payroll launch war-room coverage.'],
  ['Yuki Tanaka', 'Employee', 'EMP-010', 'Reimbursement', 275, 'Approved', 'Paid', -4, 'Design conference ticket.'],
  ['VerifyPro Screening', 'Vendor', undefined, 'Vendor Payment', 900, 'Approved', 'Paid', -6, 'Background checks — October batch.'],
  ['Noah Bennett', 'Employee', 'EMP-006', 'Salary Advance', 800, 'Rejected', 'Failed', -7, 'Advance request exceeds policy cap.'],
  ['Olivia Grant', 'Employee', 'EMP-009', 'Reimbursement', 520, 'Approved', 'Paid', -3, 'Product research participant incentives.'],
  ['Freya Larsen', 'Employee', 'EMP-026', 'Final Settlement', 8400, 'Approved', 'Paid', -45, 'Full and final settlement — exited employee.'],
  ['Chloe Dubois', 'Employee', 'EMP-012', 'Bonus', 3000, 'Approved', 'Paid', -8, 'Employer brand campaign performance bonus.'],
  ['BrightFrame Media', 'Vendor', undefined, 'Vendor Payment', 3200, 'Pending', 'Pending', 1, 'Employer brand video — final cut.'],
  ['Mina Park', 'Employee', 'EMP-023', 'Overtime', 260, 'Approved', 'Paid', -9, 'Customer escalation coverage.'],
  ['Arjun Mehta', 'Contractor', undefined, 'Contractor Fee', 1750, 'Approved', 'Processing', 0, 'Data analysis sprint — onboarding analytics.'],
]

const payments: DailyPayment[] = paymentSeed.map((p, i) => {
  const employee = p[2] ? employees.find((e) => e.id === p[2]) : undefined
  const relatedContract = contracts.find((c) => c.employeeId === p[2] && c.status === 'Active')
  return {
    id: `PAY-${String(7100 + i)}`,
    payee: p[0],
    partyType: p[1],
    employeeId: employee?.id,
    contractId: p[1] === 'Employee' ? relatedContract?.id : contracts[i % 4 === 0 ? 10 : 12]?.id,
    date: daysAhead(p[7]),
    dueDate: daysAhead(p[7] + 2),
    category: p[3],
    amount: p[4],
    method: (p[1] === 'Vendor' ? 'Bank Transfer' : p[4] > 2000 ? 'Bank Transfer' : ['UPI', 'Bank Transfer', 'Card'][i % 3]) as DailyPayment['method'],
    approvalStatus: p[5],
    paymentStatus: p[6],
    description: p[8],
    approvedBy: p[5] === 'Approved' ? 'Grace Kim' : undefined,
    remarks: p[5] === 'Rejected' ? 'Rejected by Finance — supporting documentation incomplete.' : p[6] === 'Overdue' ? 'Payment past due date — follow up with payee.' : '',
    history: [
      { id: `PH-${i}-1`, date: daysAgo(Math.abs(p[7]) + 2), action: 'Payment recorded', actor: 'Aisha Bello' },
      { id: `PH-${i}-2`, date: daysAgo(Math.abs(p[7]) + 1), action: 'Submitted for approval', actor: 'Aisha Bello' },
      ...(p[5] === 'Approved' ? [{ id: `PH-${i}-3`, date: daysAgo(Math.abs(p[7])), action: 'Approved by Finance', actor: 'Grace Kim' }] : []),
      ...(p[6] === 'Paid' ? [{ id: `PH-${i}-4`, date: daysAgo(Math.abs(p[7])), action: 'Marked as paid', actor: 'Grace Kim' }] : []),
    ],
  }
})

// ——— Performance reviews ——————————————————————————————————————————
const reviewEmployees = ['EMP-004', 'EMP-005', 'EMP-006', 'EMP-007', 'EMP-010', 'EMP-011', 'EMP-013', 'EMP-015', 'EMP-016', 'EMP-018', 'EMP-019', 'EMP-022', 'EMP-023', 'EMP-024']
const reviewStatuses: PerformanceReview['status'][] = ['Completed', 'HR Review', 'Manager Review', 'Self Assessment', 'Not Started', 'In Progress' as unknown as PerformanceReview['status']]
const goalsSeed = [
  ['Ship design system v2', 'Adopt across 3 product surfaces', 100, 30, 'Completed'],
  ['Improve API p95 latency', 'Reduce from 420ms to 250ms', 82, 25, 'On Track'],
  ['Reduce payroll errors', 'Below 0.5% per cycle', 64, 25, 'At Risk'],
  ['Grow enterprise pipeline', '$2.4M qualified pipeline', 71, 20, 'On Track'],
  ['Onboarding NPS', 'Reach 60+', 45, 20, 'At Risk'],
  ['Complete security training', '100% team completion', 100, 15, 'Completed'],
] as const

const reviews: PerformanceReview[] = reviewEmployees.map((id, i) => {
  const status = i === 0 ? 'Completed' : reviewStatuses[i % 5]
  const goals = goalsSeed.slice(0, 4).map((g, k) => ({
    id: `G-${i}-${k}`,
    title: g[0],
    target: g[1],
    progress: Math.min(100, g[2] + ((i * 7) % 20) - 10),
    weight: g[3],
    status: (Math.min(100, g[2] + ((i * 7) % 20) - 10) >= 100 ? 'Completed' : k % 3 === 0 ? 'At Risk' : 'On Track') as 'Completed' | 'On Track' | 'At Risk',
  }))
  return {
    id: `REV-${String(5300 + i)}`,
    employeeId: id,
    period: 'H2 2026',
    cycle: 'H2 2026 Performance Cycle',
    dueDate: daysAhead(10 + (i % 12)),
    status,
    selfRating: 3 + (i % 3),
    managerRating: 3 + ((i + 1) % 3),
    hrRating: status === 'Completed' ? 4 : 0,
    goals,
    strengths: status === 'Completed' ? 'Strong ownership, clear communication, and reliable delivery across cross-functional work.' : '',
    improvements: status === 'Completed' ? 'Could delegate more consistently and create more space for strategic work.' : '',
    comments: status === 'Completed' ? 'Consistent above-expectation performance. Recommended for the H1 appraisal pool.' : '',
    manager: 'Reporting manager',
    completedAt: status === 'Completed' ? daysAgo(6) : undefined,
  }
})

// ——— Employee requests ————————————————————————————————————————————
const requestSeed: Array<[string, string, string, string, EmployeeRequest['status'], EmployeeRequest['priority'], string, number]> = [
  ['EMP-005', 'Employment Certificate', 'Employment certificate for visa application', 'I need a signed employment certificate for my Spanish visa renewal. It should include my designation and start date.', 'In Progress', 'High', 'Aisha Bello', -2],
  ['EMP-014', 'Experience Letter', 'Experience letter for mortgage application', 'The bank needs a formal experience letter confirming my role and tenure. Please address it to First National Bank.', 'Open', 'High', 'Aisha Bello', -1],
  ['EMP-013', 'Profile Update', 'Update home address', 'I have moved to a new apartment. Requesting an update to my address in the HRIS.', 'Resolved', 'Low', 'Aisha Bello', -6],
  ['EMP-009', 'Document Request', 'Salary slips for July–October', 'Please share consolidated salary slips for the last four months for a rental application.', 'In Progress', 'Medium', 'Victor Nwosu', -3],
  ['EMP-021', 'HR Query', 'Clarification on remote work policy', 'Could you clarify the number of remote days available for operations managers in Q4?', 'Open', 'Medium', 'Amara Okafor', 0],
  ['EMP-016', 'Employment Certificate', 'Bank account opening letter', 'Requesting a standard employment letter for opening a new bank account.', 'Open', 'Low', 'Aisha Bello', -1],
  ['EMP-022', 'Document Request', 'Certification reimbursement status', 'Following up on the reimbursement for my health and safety certification submitted last month.', 'In Progress', 'Medium', 'Victor Nwosu', -4],
  ['EMP-010', 'HR Query', 'Compensatory off balance', 'I would like to confirm my remaining compensatory off balance after the October launch.', 'Resolved', 'Low', 'Aisha Bello', -8],
  ['EMP-006', 'Profile Update', 'Add new dependent to benefits', 'Please add my newborn daughter to the health insurance plan effective next month.', 'Open', 'High', 'Aisha Bello', -2],
  ['EMP-024', 'Experience Letter', 'Visa experience letter', 'The French consulate requires an experience letter with my annual compensation details.', 'Rejected', 'Medium', 'Amara Okafor', -10],
  ['EMP-003', 'Other', 'Request standing desk', 'Ergonomic assessment recommended a standing desk; requesting procurement support.', 'In Progress', 'Low', 'Hassan Ali', -5],
  ['EMP-020', 'Document Request', 'Recruitment data export', 'Requesting an export of Q3 candidate pipeline data for the hiring review.', 'Resolved', 'Low', 'Tom Becker', -7],
  ['EMP-018', 'HR Query', 'Payslip tax deduction inquiry', 'My federal tax deduction appears higher this month. Requesting a breakdown.', 'Open', 'Medium', 'Victor Nwosu', 0],
  ['EMP-012', 'Employment Certificate', 'Maternity leave confirmation letter', 'Requesting a confirmation letter for maternity leave dates for my insurance provider.', 'Resolved', 'High', 'Aisha Bello', -14],
]

const requests: EmployeeRequest[] = requestSeed.map((r, i) => ({
  id: `REQ-${String(8400 + i)}`,
  employeeId: r[0],
  type: r[1],
  subject: r[2],
  description: r[3],
  status: r[4],
  priority: r[5],
  assignedTo: r[6],
  createdAt: daysAgo(Math.abs(r[7])),
  responses: [
    { id: `RR-${i}-1`, author: full(employees.find((e) => e.id === r[0])!.firstName, employees.find((e) => e.id === r[0])!.lastName), message: r[3], date: daysAgo(Math.abs(r[7])) },
    ...(r[4] !== 'Open' ? [{ id: `RR-${i}-2`, author: r[6], message: r[4] === 'Rejected' ? 'Unable to issue this letter in its requested format. Please contact People Ops to discuss alternatives.' : r[4] === 'Resolved' ? 'Completed and shared with the employee via secure document link.' : 'Reviewing with the relevant team. Expected completion within two business days.', date: daysAgo(Math.max(0, Math.abs(r[7]) - 1)) }] : []),
  ],
}))

// ——— Offboarding ——————————————————————————————————————————————————
const offboarding: OffboardingRecord[] = [
  {
    id: 'OFF-2201', employeeId: 'EMP-025', resignationDate: daysAgo(8), lastWorkingDay: daysAhead(22),
    reason: 'Accepted an external leadership opportunity closer to family.', noticePeriodDays: 30, status: 'In Progress',
    exitInterviewDate: daysAhead(18), exitInterviewNotes: '',
    clearances: [
      { id: 'CL-1', department: 'Department', owner: 'Isabella Rossi', status: 'Cleared', note: 'Pipeline handover complete.' },
      { id: 'CL-2', department: 'IT', owner: 'Noah Bennett', status: 'Pending', note: '' },
      { id: 'CL-3', department: 'Finance', owner: 'Grace Kim', status: 'Pending', note: '' },
      { id: 'CL-4', department: 'HR', owner: 'Aisha Bello', status: 'Pending', note: '' },
    ],
    settlementAmount: 12800, settlementStatus: 'Pending', settlementNotes: 'Includes 22 days of unpaid leave encashment and final bonus.',
    documents: [doc('OFFD-1', 'Resignation Letter.pdf', 'Verified', 8)],
    history: [
      { id: 'OH-1', date: daysAgo(8), action: 'Resignation submitted', actor: 'Omar Farouk' },
      { id: 'OH-2', date: daysAgo(7), action: 'Resignation acknowledged', actor: 'Aisha Bello' },
      { id: 'OH-3', date: daysAgo(6), action: 'Notice period started', actor: 'System' },
    ],
  },
  {
    id: 'OFF-2202', employeeId: 'EMP-026', resignationDate: daysAgo(95), lastWorkingDay: daysAgo(58),
    reason: 'Relocating to freelance practice.', noticePeriodDays: 30, status: 'Completed',
    exitInterviewDate: daysAgo(62), exitInterviewNotes: 'Positive exit. Suggested clearer design career ladders and more brand team exposure.',
    clearances: [
      { id: 'CL-5', department: 'Department', owner: 'Yuki Tanaka', status: 'Cleared', note: 'All files handed over.' },
      { id: 'CL-6', department: 'IT', owner: 'Noah Bennett', status: 'Cleared', note: 'Assets returned.' },
      { id: 'CL-7', department: 'Finance', owner: 'Grace Kim', status: 'Cleared', note: 'No outstanding advances.' },
      { id: 'CL-8', department: 'HR', owner: 'Aisha Bello', status: 'Cleared', note: 'Exit documents issued.' },
    ],
    settlementAmount: 8400, settlementStatus: 'Paid', settlementNotes: 'Settled on the final payroll cycle.',
    documents: [doc('OFFD-2', 'Resignation Letter.pdf', 'Verified', 95), doc('OFFD-3', 'Relieving Letter.pdf', 'Verified', 58), doc('OFFD-4', 'Experience Certificate.pdf', 'Verified', 58)],
    history: [
      { id: 'OH-4', date: daysAgo(95), action: 'Resignation submitted', actor: 'Freya Larsen' },
      { id: 'OH-5', date: daysAgo(60), action: 'Clearances completed', actor: 'Aisha Bello' },
      { id: 'OH-6', date: daysAgo(58), action: 'Offboarding completed', actor: 'Amara Okafor' },
    ],
  },
  {
    id: 'OFF-2203', employeeId: 'EMP-015', resignationDate: daysAgo(2), lastWorkingDay: daysAhead(43),
    reason: 'Returning to full-time studies.', noticePeriodDays: 45, status: 'In Progress',
    clearances: [
      { id: 'CL-9', department: 'Department', owner: 'Isabella Rossi', status: 'Pending', note: '' },
      { id: 'CL-10', department: 'IT', owner: 'Noah Bennett', status: 'Pending', note: '' },
      { id: 'CL-11', department: 'Finance', owner: 'Grace Kim', status: 'Pending', note: '' },
      { id: 'CL-12', department: 'HR', owner: 'Aisha Bello', status: 'Pending', note: '' },
    ],
    settlementAmount: 6200, settlementStatus: 'Pending', settlementNotes: 'Draft estimate pending attendance close.',
    documents: [doc('OFFD-5', 'Resignation Letter.pdf', 'Pending', 2)],
    history: [{ id: 'OH-7', date: daysAgo(2), action: 'Resignation submitted', actor: "Liam O'Connor" }],
  },
  {
    id: 'OFF-2204', employeeId: 'EMP-007', resignationDate: daysAhead(5), lastWorkingDay: daysAhead(35), reason: 'Contract not being renewed; planning a career break.', noticePeriodDays: 30, status: 'In Progress',
    clearances: [
      { id: 'CL-13', department: 'Department', owner: 'Priya Raman', status: 'Pending', note: '' },
      { id: 'CL-14', department: 'IT', owner: 'Noah Bennett', status: 'Pending', note: '' },
      { id: 'CL-15', department: 'Finance', owner: 'Grace Kim', status: 'Pending', note: '' },
      { id: 'CL-16', department: 'HR', owner: 'Aisha Bello', status: 'Pending', note: '' },
    ],
    settlementAmount: 3400, settlementStatus: 'Pending', settlementNotes: 'Contract end settlement estimate.',
    documents: [],
    history: [{ id: 'OH-8', date: daysAgo(1), action: 'Offboarding record created', actor: 'Aisha Bello' }],
  },
  {
    id: 'OFF-2205', employeeId: 'EMP-022', resignationDate: daysAhead(10), lastWorkingDay: daysAhead(40), reason: 'Probation outcome — not progressing to confirmation.', noticePeriodDays: 15, status: 'Clearance',
    clearances: [
      { id: 'CL-17', department: 'Department', owner: 'Elena Petrova', status: 'Cleared', note: 'Handover plan documented.' },
      { id: 'CL-18', department: 'IT', owner: 'Noah Bennett', status: 'Cleared', note: 'Access scheduled for deactivation.' },
      { id: 'CL-19', department: 'Finance', owner: 'Grace Kim', status: 'Blocked', note: 'Awaiting equipment deposit reconciliation.' },
      { id: 'CL-20', department: 'HR', owner: 'Aisha Bello', status: 'Pending', note: '' },
    ],
    settlementAmount: 2100, settlementStatus: 'Processing', settlementNotes: 'Deduction for unreturned equipment to be confirmed by Finance.',
    documents: [doc('OFFD-6', 'Probation Outcome Letter.pdf', 'Verified', 4)],
    history: [
      { id: 'OH-9', date: daysAgo(4), action: 'Probation outcome recorded', actor: 'Aisha Bello' },
      { id: 'OH-10', date: daysAgo(2), action: 'Clearance initiated', actor: 'Aisha Bello' },
    ],
  },
]

// ——— Settings ——————————————————————————————————————————————————————
const settings: SettingsData = {
  departments: [
    { id: 'DEP-1', name: 'Engineering', head: 'Daniel Whitfield', code: 'ENG' },
    { id: 'DEP-2', name: 'Product', head: 'Olivia Grant', code: 'PRD' },
    { id: 'DEP-3', name: 'Design', head: 'Yuki Tanaka', code: 'DSN' },
    { id: 'DEP-4', name: 'Marketing', head: 'Chloe Dubois', code: 'MKT' },
    { id: 'DEP-5', name: 'Sales', head: 'Isabella Rossi', code: 'SLS' },
    { id: 'DEP-6', name: 'Finance', head: 'Grace Kim', code: 'FIN' },
    { id: 'DEP-7', name: 'People & Culture', head: 'Amara Okafor', code: 'PPL' },
    { id: 'DEP-8', name: 'Operations', head: 'Elena Petrova', code: 'OPS' },
    { id: 'DEP-9', name: 'Customer Success', head: 'Mina Park', code: 'CSM' },
  ],
  designations: [
    { id: 'DES-1', name: 'HR Director', department: 'People & Culture', level: 'Executive' },
    { id: 'DES-2', name: 'VP of Engineering', department: 'Engineering', level: 'Executive' },
    { id: 'DES-3', name: 'Engineering Manager', department: 'Engineering', level: 'Lead' },
    { id: 'DES-4', name: 'Senior Frontend Engineer', department: 'Engineering', level: 'Senior' },
    { id: 'DES-5', name: 'Backend Engineer', department: 'Engineering', level: 'Mid' },
    { id: 'DES-6', name: 'DevOps Engineer', department: 'Engineering', level: 'Mid' },
    { id: 'DES-7', name: 'QA Engineer', department: 'Engineering', level: 'Mid' },
    { id: 'DES-8', name: 'Head of Product', department: 'Product', level: 'Executive' },
    { id: 'DES-9', name: 'Senior Product Manager', department: 'Product', level: 'Senior' },
    { id: 'DES-10', name: 'Senior Product Designer', department: 'Design', level: 'Senior' },
    { id: 'DES-11', name: 'Product Designer', department: 'Design', level: 'Mid' },
    { id: 'DES-12', name: 'UX Researcher', department: 'Design', level: 'Mid' },
    { id: 'DES-13', name: 'Marketing Lead', department: 'Marketing', level: 'Lead' },
    { id: 'DES-14', name: 'Content Strategist', department: 'Marketing', level: 'Mid' },
    { id: 'DES-15', name: 'Sales Director', department: 'Sales', level: 'Executive' },
    { id: 'DES-16', name: 'Account Executive', department: 'Sales', level: 'Mid' },
    { id: 'DES-17', name: 'Sales Development Rep', department: 'Sales', level: 'Junior' },
    { id: 'DES-18', name: 'Finance Manager', department: 'Finance', level: 'Lead' },
    { id: 'DES-19', name: 'Payroll Specialist', department: 'Finance', level: 'Mid' },
    { id: 'DES-20', name: 'People Operations Partner', department: 'People & Culture', level: 'Mid' },
    { id: 'DES-21', name: 'Talent Acquisition Lead', department: 'People & Culture', level: 'Lead' },
    { id: 'DES-22', name: 'Operations Manager', department: 'Operations', level: 'Lead' },
    { id: 'DES-23', name: 'Facilities Coordinator', department: 'Operations', level: 'Junior' },
    { id: 'DES-24', name: 'Customer Success Manager', department: 'Customer Success', level: 'Lead' },
    { id: 'DES-25', name: 'Support Specialist', department: 'Customer Success', level: 'Junior' },
  ],
  employmentTypes: [
    { id: 'ET-1', name: 'Full-time', description: 'Standard permanent employment with benefits.' },
    { id: 'ET-2', name: 'Part-time', description: 'Reduced weekly hours with pro-rated benefits.' },
    { id: 'ET-3', name: 'Contract', description: 'Fixed-term engagement with defined deliverables.' },
    { id: 'ET-4', name: 'Internship', description: 'Time-bound learning engagement.' },
  ],
  employeeStatuses: [
    { id: 'ES-1', name: 'Active', description: 'Currently employed and working.', color: 'green' },
    { id: 'ES-2', name: 'Probation', description: 'Within the initial probation period.', color: 'amber' },
    { id: 'ES-3', name: 'On Leave', description: 'On an approved extended leave.', color: 'blue' },
    { id: 'ES-4', name: 'Notice Period', description: 'Serving notice before departure.', color: 'violet' },
    { id: 'ES-5', name: 'Terminated', description: 'Employment ended. Records retained.', color: 'red' },
  ],
  workingHours: [
    { id: 'WH-1', day: 'Monday', start: '09:00', end: '17:30', hours: 8, active: true },
    { id: 'WH-2', day: 'Tuesday', start: '09:00', end: '17:30', hours: 8, active: true },
    { id: 'WH-3', day: 'Wednesday', start: '09:00', end: '17:30', hours: 8, active: true },
    { id: 'WH-4', day: 'Thursday', start: '09:00', end: '17:30', hours: 8, active: true },
    { id: 'WH-5', day: 'Friday', start: '09:00', end: '16:30', hours: 7, active: true },
    { id: 'WH-6', day: 'Saturday', start: '—', end: '—', hours: 0, active: false },
    { id: 'WH-7', day: 'Sunday', start: '—', end: '—', hours: 0, active: false },
  ],
  attendancePolicies: [
    { id: 'AP-1', name: 'Workday start', value: '09:00', description: 'Check-in after this time is marked late.' },
    { id: 'AP-2', name: 'Late grace period', value: '10 minutes', description: 'Check-ins within the grace window are not marked late.' },
    { id: 'AP-3', name: 'Half-day threshold', value: '4 hours', description: 'Below this many hours is recorded as a half day.' },
    { id: 'AP-4', name: 'Overtime eligibility', value: 'Approval required', description: 'Overtime must be pre-approved by the reporting manager.' },
    { id: 'AP-5', name: 'Remote work allowance', value: '2 days / week', description: 'Hybrid employees may work remotely twice a week.' },
    { id: 'AP-6', name: 'Correction window', value: '7 days', description: 'Attendance corrections must be raised within seven days.' },
  ],
  holidays: [
    { id: 'HOL-1', name: 'New Year\'s Day', date: `${now.getFullYear()}-01-01`, type: 'Public' },
    { id: 'HOL-2', name: 'Martin Luther King Jr. Day', date: `${now.getFullYear()}-01-19`, type: 'Public' },
    { id: 'HOL-3', name: 'Company Foundation Day', date: `${now.getFullYear()}-03-11`, type: 'Company' },
    { id: 'HOL-4', name: 'Summer Wellness Day', date: daysAhead(24), type: 'Optional' },
    { id: 'HOL-5', name: 'Independence Day (US)', date: `${now.getFullYear()}-07-04`, type: 'Public' },
    { id: 'HOL-6', name: 'Labor Day', date: `${now.getFullYear()}-09-07`, type: 'Public' },
    { id: 'HOL-7', name: 'Thanksgiving', date: `${now.getFullYear()}-11-26`, type: 'Public' },
    { id: 'HOL-8', name: 'Winter Office Closure', date: `${now.getFullYear()}-12-24`, type: 'Company' },
    { id: 'HOL-9', name: 'Christmas Day', date: `${now.getFullYear()}-12-25`, type: 'Public' },
  ],
  leaveTypes: [
    { id: 'LT-1', name: 'Annual Leave', allocation: 20, paid: true, carryForward: true, requiresApproval: true, color: 'indigo', description: 'Planned personal time off, accrued monthly.' },
    { id: 'LT-2', name: 'Sick Leave', allocation: 10, paid: true, carryForward: false, requiresApproval: false, color: 'rose', description: 'Medical absence with documentation where required.' },
    { id: 'LT-3', name: 'Casual Leave', allocation: 8, paid: true, carryForward: false, requiresApproval: true, color: 'amber', description: 'Short-notice personal leave for unplanned needs.' },
    { id: 'LT-4', name: 'Parental Leave', allocation: 60, paid: true, carryForward: false, requiresApproval: true, color: 'teal', description: 'Maternity, paternity, and adoption leave.' },
    { id: 'LT-5', name: 'Unpaid Leave', allocation: 30, paid: false, carryForward: false, requiresApproval: true, color: 'slate', description: 'Extended leave without pay, subject to approval.' },
    { id: 'LT-6', name: 'Compensatory Off', allocation: 6, paid: true, carryForward: true, requiresApproval: true, color: 'violet', description: 'Time off earned for approved overtime or weekend work.' },
  ],
  recruitmentStages: [
    { id: 'RS-1', name: 'Applied', order: 1, sla: '2 days' },
    { id: 'RS-2', name: 'Screening', order: 2, sla: '3 days' },
    { id: 'RS-3', name: 'Interview', order: 3, sla: '7 days' },
    { id: 'RS-4', name: 'Offer', order: 4, sla: '5 days' },
    { id: 'RS-5', name: 'Hired', order: 5, sla: '—' },
  ],
  onboardingChecklists: [
    { id: 'OC-1', label: 'Signed offer letter received', owner: 'People Ops', category: 'Documents' },
    { id: 'OC-2', label: 'Government ID & address proof', owner: 'People Ops', category: 'Documents' },
    { id: 'OC-3', label: 'Tax and bank details submitted', owner: 'Payroll', category: 'Documents' },
    { id: 'OC-4', label: 'Laptop and equipment prepared', owner: 'IT', category: 'IT & Access' },
    { id: 'OC-5', label: 'Email and ERP account created', owner: 'IT', category: 'IT & Access' },
    { id: 'OC-6', label: 'Manager intro & buddy assigned', owner: 'Talent', category: 'People' },
    { id: 'OC-7', label: 'Induction session scheduled', owner: 'People Ops', category: 'People' },
    { id: 'OC-8', label: 'Policy acknowledgements signed', owner: 'People Ops', category: 'Compliance' },
  ],
  contractTypes: [
    { id: 'CT-1', name: 'Employment Agreement', description: 'Permanent employee terms.', defaultTerm: 'Indefinite' },
    { id: 'CT-2', name: 'Fixed Term Contract', description: 'Time-bound employment.', defaultTerm: '12 months' },
    { id: 'CT-3', name: 'Consultancy Agreement', description: 'Individual contractor engagement.', defaultTerm: '6 months' },
    { id: 'CT-4', name: 'Vendor Services Agreement', description: 'Services provided by an organization.', defaultTerm: '12 months' },
    { id: 'CT-5', name: 'NDA', description: 'Mutual confidentiality agreement.', defaultTerm: '24 months' },
    { id: 'CT-6', name: 'Internship Agreement', description: 'Internship terms and stipend.', defaultTerm: '6 months' },
  ],
  paymentCategories: [
    { id: 'PC-1', name: 'Salary Advance', description: 'Advance against earned salary.', taxable: false },
    { id: 'PC-2', name: 'Contractor Fee', description: 'Fees for contractor deliverables.', taxable: true },
    { id: 'PC-3', name: 'Reimbursement', description: 'Approved expense reimbursement.', taxable: false },
    { id: 'PC-4', name: 'Overtime', description: 'Approved overtime compensation.', taxable: true },
    { id: 'PC-5', name: 'Bonus', description: 'Performance or spot bonus.', taxable: true },
    { id: 'PC-6', name: 'Vendor Payment', description: 'Payment against a vendor contract.', taxable: true },
    { id: 'PC-7', name: 'Final Settlement', description: 'Full and final exit settlement.', taxable: true },
  ],
  reviewTemplates: [
    { id: 'RT-1', name: 'Standard Half-Yearly Review', sections: 'Goals, competencies, development plan, overall rating', cycle: 'Half-yearly' },
    { id: 'RT-2', name: 'Probation Confirmation', sections: 'Role fit, core skills, manager recommendation', cycle: 'One-time' },
    { id: 'RT-3', name: 'Leadership 360', sections: 'Strategic impact, people leadership, peer feedback', cycle: 'Annual' },
    { id: 'RT-4', name: 'Internship Review', sections: 'Learning outcomes, project delivery, mentorship feedback', cycle: 'End of term' },
  ],
}

// ——— Activity & notifications ———————————————————————————————————
const activities: Activity[] = [
  { id: 'ACT-1', type: 'leave', title: 'Leave request approved', detail: 'Sofia Alvarez · Sick Leave · 3 days', actor: 'Amara Okafor', date: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: 'ACT-2', type: 'payment', title: 'Payment marked as paid', detail: 'PAY-7100 · Marcus Chen · $320', actor: 'Grace Kim', date: new Date(Date.now() - 65 * 60000).toISOString() },
  { id: 'ACT-3', type: 'recruitment', title: 'Candidate moved to Offer', detail: 'Ravi Kumar · Senior Frontend Engineer', actor: 'Tom Becker', date: new Date(Date.now() - 3 * 3600000).toISOString() },
  { id: 'ACT-4', type: 'contract', title: 'Contract sent for signature', detail: 'CTR-104 · Account Executive — EMEA', actor: 'Aisha Bello', date: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'ACT-5', type: 'employee', title: 'Employee profile updated', detail: 'Zara Ahmed · Probation review scheduled', actor: 'Aisha Bello', date: new Date(Date.now() - 26 * 3600000).toISOString() },
  { id: 'ACT-6', type: 'onboarding', title: 'Onboarding checklist updated', detail: 'Kwame Mensah · IT access provisioned', actor: 'Noah Bennett', date: new Date(Date.now() - 30 * 3600000).toISOString() },
  { id: 'ACT-7', type: 'request', title: 'Employee request assigned', detail: 'REQ-8405 · Remote work policy query', actor: 'Amara Okafor', date: new Date(Date.now() - 34 * 3600000).toISOString() },
  { id: 'ACT-8', type: 'performance', title: 'Review cycle launched', detail: 'H2 2026 cycle · 14 employees', actor: 'Amara Okafor', date: new Date(Date.now() - 50 * 3600000).toISOString() },
  { id: 'ACT-9', type: 'offboarding', title: 'Clearance marked blocked', detail: 'OFF-2205 · Hassan Ali · Finance', actor: 'Grace Kim', date: new Date(Date.now() - 55 * 3600000).toISOString() },
  { id: 'ACT-10', type: 'attendance', title: 'Attendance correction approved', detail: 'Leila Haddad · 2 days ago', actor: 'Aisha Bello', date: new Date(Date.now() - 72 * 3600000).toISOString() },
]

const notifications: Notification[] = [
  { id: 'NT-1', title: '3 contracts expiring in 30 days', detail: 'Review renewals for DevOps Engineering and 2 vendor agreements.', date: new Date(Date.now() - 12 * 60000).toISOString(), read: false, type: 'warning' },
  { id: 'NT-2', title: '5 leave requests awaiting approval', detail: 'Oldest pending request is 4 days old.', date: new Date(Date.now() - 45 * 60000).toISOString(), read: false, type: 'info' },
  { id: 'NT-3', title: 'Payroll ready for HR review', detail: `${monthLabelLocal(currentPeriod)} payroll has unresolved entries.`, date: new Date(Date.now() - 2 * 3600000).toISOString(), read: false, type: 'info' },
  { id: 'NT-4', title: 'Daily payment overdue', detail: 'Harbor & Grey LLP · $6,000 · 4 days overdue.', date: new Date(Date.now() - 6 * 3600000).toISOString(), read: false, type: 'danger' },
  { id: 'NT-5', title: 'Onboarding ready for Diego Ramirez', detail: 'All pre-joining checks complete. Starts in 2 days.', date: new Date(Date.now() - 22 * 3600000).toISOString(), read: true, type: 'success' },
  { id: 'NT-6', title: 'New candidate applications', detail: '6 new applications across 3 open roles.', date: new Date(Date.now() - 28 * 3600000).toISOString(), read: true, type: 'info' },
]

function monthLabelLocal(period: string) {
  const [y, m] = period.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function createDemoDatabase(): Database {
  return {
    employees: employees.map((e) => ({ ...e })),
    attendance,
    leaves,
    jobs,
    candidates,
    onboarding,
    payroll,
    contracts,
    payments,
    reviews,
    requests,
    offboarding,
    corrections,
    settings,
    activities,
    notifications,
  }
}

export const DEMO_META = {
  currentPeriod,
  previousPeriod,
  version: 1,
}
