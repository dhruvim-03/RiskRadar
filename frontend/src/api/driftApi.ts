import axiosClient from './axiosClient';
import { DriftMetric } from '../types';

export const driftApi = {
  getMetrics: async (feature?: string): Promise<DriftMetric[]> => {
    const params = feature ? { feature } : {};
    const res = await axiosClient.get<DriftMetric[]>('/drift/metrics', { params });
    return res.data;
  },

  computeDrift: async (): Promise<DriftMetric[]> => {
    const res = await axiosClient.post<DriftMetric[]>('/drift/compute');
    return res.data;
  },
};
