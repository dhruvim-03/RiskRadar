export type UserRole = 'ANALYST' | 'ADMIN';

export interface User {
  id?: number;
  username: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  role: UserRole;
  expiresIn: number;
}

export interface ShapFeature {
  feature: string;
  value: number;
  contribution: number;
}

export interface Transaction {
  transactionId: number;
  transactionRef: string;
  accountId: string;
  amount: number;
  merchantCategory?: string;
  transactionTime: string;
  rawFeatures?: Record<string, number | string>;
  fraudProbability: number;
  riskTier: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  shapTopFeatures?: ShapFeature[];
  modelVersion?: string;
  isConfirmedFraud?: boolean | null;
  scoredAt?: string;
}

export interface TransactionPageResponse {
  content: Transaction[];
  totalElements: number;
  totalPages: number;
  pageNumber: number;
  pageSize: number;
}

export interface ScoreBucket {
  bucket: string;
  count: number;
}

export interface DashboardSummary {
  totalTransactions: number;
  flaggedRate: number;
  scoreDistribution: ScoreBucket[];
  activeModelVersion: string;
  avgFraudProbability: number;
}

export interface DriftMetric {
  featureName: string;
  windowStart: string;
  windowEnd: string;
  driftScore: number;
  thresholdBreached: boolean;
}

export interface ModelVersion {
  version: string;
  trainedAt: string;
  prAuc: number;
  precision: number;
  recall: number;
  isActive: boolean;
}

export interface RetrainResponse {
  jobId: string;
  status: string;
}
