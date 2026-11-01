export type WeightLogRead = { id: string; date: string; weight: number };
export type WeightLogCreate = { weight: number; date?: string | null };
export type WeightLogUpdate = { weight: number };
export type ListWeightsParams = { date_from?: string; date_to?: string };
