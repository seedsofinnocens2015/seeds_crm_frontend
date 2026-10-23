export type FormFieldType =
  | "text"
  | "number"
  | "tel"
  | "date"
  | "month"
  | "time"
  | "datetime-local"
  | "email"
  | "url"
  | "select"
  | "textarea"
  | "checkbox";

export interface IFormField {
  id: string; // e.g., "patientName", "custom_abc123"
  label: string; // Display label
  type: FormFieldType;
  section: 1 | 2 | 3 | 4; // Which of the 4 sections
  order: number; // Order index within the section
  required?: boolean;
  options?: string[]; // If select dropdown, list of options
  placeholder?: string;
  enabled?: boolean; // Whether active or hidden
  isSystem?: boolean; // System fields can't be deleted, but can be edited/reordered
  readOnly?: boolean;
  subDispositionMappings?: Record<string, { disposition: string; validStatus: string }>;
}

export interface IFormConfig {
  _id?: string;
  version: number;
  sections: {
    id: 1 | 2 | 3 | 4;
    title: string;
  }[];
  fields: IFormField[];
  subDispositionMappings?: Record<string, { disposition: string; validStatus: string }>;
  updatedBy?: string;
  updatedAt?: Date | string;
  createdAt?: Date | string;
}
