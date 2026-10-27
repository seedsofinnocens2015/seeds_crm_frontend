export interface LeadFilters {
  // Date Ranges
  leadEntryDateFrom: string;
  leadEntryDateTo: string;
  followUpDateFrom: string;
  followUpDateTo: string;
  appointmentDateFrom: string;
  appointmentDateTo: string;
  centreVisitedDateFrom: string;
  centreVisitedDateTo: string;
  campVisitedDateFrom: string;
  campVisitedDateTo: string;

  // Centres & Camps
  centreLocation: string;
  campLocation: string;

  // Ownership & Agent
  leadOwner: string;

  // Marketing & Sources
  leadSource: string;
  campaignName: string;
  sourceName: string;
  source: string;

  // Status & Disposition
  subStatus: string;
  leadStage: string;
  leadValidStatus: string;

  // Quality, Scoring & Patient Profile
  leadScoreMin: string;
  leadScoreMax: string;
  registrationStatus: string;
  ptCity: string;
  ptState: string;
  whenPlanningToStartTreatment: string;
  preMedicalConditions: string;

  // Legacy fallback compatibility keys (optional)
  location?: string;
  callerName?: string;
  treatment?: string;
  subDispositions?: string;
  dispositions?: string;
  validStatus?: string;
  surgeryDateFrom?: string;
  surgeryDateTo?: string;

  // Dashboard quick metric
  quickMetricFilter?: string;
}

export const INITIAL_LEAD_FILTERS: LeadFilters = {
  leadEntryDateFrom: "",
  leadEntryDateTo: "",
  followUpDateFrom: "",
  followUpDateTo: "",
  appointmentDateFrom: "",
  appointmentDateTo: "",
  centreVisitedDateFrom: "",
  centreVisitedDateTo: "",
  campVisitedDateFrom: "",
  campVisitedDateTo: "",
  centreLocation: "",
  campLocation: "",
  leadOwner: "",
  leadSource: "",
  campaignName: "",
  sourceName: "",
  source: "",
  subStatus: "",
  leadStage: "",
  leadValidStatus: "",
  leadScoreMin: "",
  leadScoreMax: "",
  registrationStatus: "",
  ptCity: "",
  ptState: "",
  whenPlanningToStartTreatment: "",
  preMedicalConditions: "",
  quickMetricFilter: "",
};
