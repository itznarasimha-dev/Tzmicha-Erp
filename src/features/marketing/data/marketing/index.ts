import type { Campaign, DemoData } from '../../types/marketing'
import { seedCampaigns } from './campaigns'
import { seedPlans } from './plans'
import { seedLeads, seedOpportunities } from './leads'
import { seedFieldTeams, seedFieldVisits, seedResearch } from './field'
import {
  seedContent,
  seedEmails,
  seedInfluencers,
  seedKeywords,
  seedPaidAds,
  seedSeoTasks,
  seedSocialPosts,
  seedVideos,
} from './digital'
import {
  seedDealerSchemes,
  seedPosters,
  seedPromotions,
  seedStoreActivities,
  seedStoreAgreements,
  seedTradeEvents,
} from './trade'
import { seedAgencies } from './partners'
import { seedAssets } from './assets'
import {
  seedCelebrityPayments,
  seedExpenses,
  seedFieldClaims,
  seedInvoices,
} from './expenses'
import { seedApprovals, seedContracts } from './approvals'
import { seedCustomers, seedSalesReps } from './customers'
import { initialAssistantMessage, seedNotifications } from './dashboard'
import {
  seedMarketingExpenses,
  seedMonthlyPlans,
  seedWorkflowConfig,
} from './roleWorkflow'

export function buildSeedData(): DemoData {
  return {
    campaigns: structuredClone(seedCampaigns),
    plans: structuredClone(seedPlans),
    monthlyPlans: structuredClone(seedMonthlyPlans),
    marketingExpenses: structuredClone(seedMarketingExpenses),
    workflowConfig: structuredClone(seedWorkflowConfig),
    leads: structuredClone(seedLeads),
    opportunities: structuredClone(seedOpportunities),
    fieldTeams: structuredClone(seedFieldTeams),
    fieldVisits: structuredClone(seedFieldVisits),
    research: structuredClone(seedResearch),
    socialPosts: structuredClone(seedSocialPosts),
    paidAds: structuredClone(seedPaidAds),
    emails: structuredClone(seedEmails),
    seoTasks: structuredClone(seedSeoTasks),
    keywords: structuredClone(seedKeywords),
    content: structuredClone(seedContent),
    influencers: structuredClone(seedInfluencers),
    videos: structuredClone(seedVideos),
    storeActivities: structuredClone(seedStoreActivities),
    posters: structuredClone(seedPosters),
    promotions: structuredClone(seedPromotions),
    dealerSchemes: structuredClone(seedDealerSchemes),
    storeAgreements: structuredClone(seedStoreAgreements),
    tradeEvents: structuredClone(seedTradeEvents),
    agencies: structuredClone(seedAgencies),
    assets: structuredClone(seedAssets),
    expenses: structuredClone(seedExpenses),
    invoices: structuredClone(seedInvoices),
    celebrityPayments: structuredClone(seedCelebrityPayments),
    fieldClaims: structuredClone(seedFieldClaims),
    customers: structuredClone(seedCustomers),
    salesReps: structuredClone(seedSalesReps),
    approvals: structuredClone(seedApprovals),
    contracts: structuredClone(seedContracts),
    notifications: structuredClone(seedNotifications),
    aiHistory: [structuredClone(initialAssistantMessage)],
    assistantPlans: [],
  }
}

export function campaignName(campaigns: Campaign[], id: string | null | undefined): string {
  if (!id) return 'Unattributed'
  return campaigns.find((c) => c.id === id)?.name ?? 'Unknown campaign'
}
