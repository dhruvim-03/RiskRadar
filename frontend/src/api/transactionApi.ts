import axiosClient from './axiosClient';
import { Transaction, TransactionPageResponse, ShapFeature } from '../types';

export interface TransactionFilterParams {
  riskTier?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  size?: number;
}

export const transactionApi = {
  getTransactions: async (params: TransactionFilterParams = {}): Promise<TransactionPageResponse> => {
    const res = await axiosClient.get<TransactionPageResponse>('/transactions', { params });
    return res.data;
  },

  getTransactionDetail: async (id: number): Promise<Transaction> => {
    const res = await axiosClient.get<Transaction>(`/transactions/${id}`);
    return res.data;
  },

  getTransactionExplanation: async (id: number): Promise<{ shapTopFeatures: ShapFeature[] }> => {
    const res = await axiosClient.get<{ shapTopFeatures: ShapFeature[] }>(`/transactions/${id}/explanation`);
    return res.data;
  },

  submitTransaction: async (data: Partial<Transaction>): Promise<Transaction> => {
    const res = await axiosClient.post<Transaction>('/transactions', data);
    return res.data;
  },

  updateFeedback: async (id: number, isConfirmedFraud: boolean): Promise<any> => {
    const res = await axiosClient.patch(`/transactions/${id}/feedback`, { isConfirmedFraud });
    return res.data;
  },
};
