
export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isImage?: boolean;
  imageUrl?: string;
  isAudio?: boolean;
  audioUrl?: string;
  isFavorite?: boolean;
  canDeepDive?: boolean;
}

export enum AppMode {
  DASHBOARD = 'dashboard',
  CHAT = 'chat',
  EMERGENCY = 'emergency',
  CALCULATOR = 'calculator',
  MONITOR = 'monitor',
  LIBRARY = 'library',
  PHYTOTHERAPY = 'phytotherapy',
  SETTINGS = 'settings'
}

export interface VitalSigns {
  bpSistolic: number;
  bpDiastolic: number;
  heartRate: number;
  respRate: number;
  temp: number;
  spo2: number;
  timestamp: Date;
}

export interface StudyLevel {
  id: 'leigo' | 'iniciante' | 'intermediário' | 'avançado';
  label: string;
}

export type ResponseDetail = 'resumo' | 'detalhado';
export type AppLanguage = 'pt-BR' | 'en' | 'es' | 'fr';

export interface UserProfile {
  name: string;
  phone: string;
  countryCode: string;
  country: string;
  profession: 'Estudante' | 'Técnico' | 'Enfermeiro' | 'Outro';
}

export interface Course {
  id: string;
  title: string;
  category: 'Nursing' | 'General Medicine' | 'Natural Medicine';
  description: string;
  icon: string;
}
