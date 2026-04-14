// User Types
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

// Message Types
export interface Message {
  id: string
  conversationId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: {
    audioUrl?: string
    sentiment?: 'positive' | 'neutral' | 'negative'
    tokens?: number
  }
  createdAt: Date
}

// Conversation Types
export interface Conversation {
  id: string
  userId: string
  title: string
  description?: string
  archived: boolean
  createdAt: Date
  updatedAt: Date
  messages?: Message[]
}

// Integration Types
export interface Integration {
  id: string
  userId: string
  provider: 'google' | 'quickbooks' | 'twilio'
  isConnected: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  lastSyncAt?: Date
  createdAt: Date
  updatedAt: Date
}

// Briefing Types
export interface ExecutiveBriefing {
  id: string
  userId: string
  date: Date
  meetings: Array<{
    title: string
    time: string
    duration: number
    attendees: string[]
    location?: string
  }>
  emailSummary?: {
    totalEmails: number
    unreadEmails: number
    topSenders: string[]
    urgentItems: string[]
  }
  financialHighlights?: {
    revenue?: number
    expenses?: number
    netIncome?: number
    keyMetrics: Record<string, number>
  }
  priorities: string[]
  riskAlerts: string[]
  weatherForecast?: string
  travelInfo?: string
  recommendations: string[]
  createdAt: Date
}

// QuickBooks Types
export interface QuickBooksAccount {
  id: string
  name: string
  accountType: string
  balance: number
  currency: string
  active: boolean
}

export interface QuickBooksTransaction {
  id: string
  date: Date
  description: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: string
  account: string
  reconciled: boolean
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasNextPage: boolean
}
