export interface JobSearchQuery {
  careerField: string;
  location: string;
}

export interface JobSource {
  name: string;
  rating: number;
  summary: string;
}

export interface JobListing {
  jobTitle: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: JobSource;
}

export interface User {
  fullName: string;
  username: string;
  password?: string; // Password is optional when just displaying user info
}

export interface SavedSearch {
  id: string;
  query: JobSearchQuery;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onDismiss: (id: string) => void;
}