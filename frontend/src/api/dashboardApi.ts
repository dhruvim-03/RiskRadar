import axiosClient from './axiosClient';
import { DashboardSummary } from '../types';

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    const res = await axiosClient.get<DashboardSummary>('/dashboard/summary');
    return res.data;
  },
};
