
export interface Teacher {
  id: string;
  name: string;
  subject?: string;
  grade?: string;
  school?: string;
  branch?: 'main' | 'boys' | 'girls';
}

export interface Report {
  id: string;
  teacherId: string;
  date: string;
  schoolInfo?: {
    subject?: string;
    grade?: string;
    school?: string;
    branch?: 'main' | 'boys' | 'girls';
  };
  ratings: { [criterionId: string]: number | string };
  strategies?: string;
  aids?: string;
  programs?: string;
  totalPercentage: number;
}

export type CriterionType = 'rating' | 'select' | 'text';

export interface Criterion {
    id: string;
    label: string;
    type: CriterionType;
    options?: string[];
}
