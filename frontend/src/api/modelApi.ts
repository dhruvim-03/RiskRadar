import axiosClient from './axiosClient';
import { ModelVersion, RetrainResponse } from '../types';

export const modelApi = {
  getVersions: async (): Promise<ModelVersion[]> => {
    const res = await axiosClient.get<ModelVersion[]>('/model/versions');
    return res.data;
  },

  triggerRetrain: async (): Promise<RetrainResponse> => {
    const res = await axiosClient.post<RetrainResponse>('/model/retrain');
    return res.data;
  },

  getJobStatus: async (jobId: string): Promise<any> => {
    const res = await axiosClient.get(`/model/jobs/${jobId}`);
    return res.data;
  },
};
