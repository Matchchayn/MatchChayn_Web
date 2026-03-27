export interface UserProfile {
  uid: string;
  id?: string; // Alias for uid to match some usages
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  country: string;
  relationshipStatus: string;
  bio: string;
  interests: string[];
  preferences: any;
  media: { type: 'image' | 'video'; url: string }[];
  createdAt: any;
  updatedAt: any;
  role?: string;
  isOnline?: boolean;
  isPro?: boolean;
}

export interface Status {
  id: string;
  userId: string;
  imageUrl: string;
  text?: string;
  createdAt: any;
  expiresAt: any;
  viewedBy?: string[];
  user?: UserProfile;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: any;
  endTime: any;
  location: string;
  imageUrl?: string;
  creatorId: string;
  attendees: string[];
  createdAt: any;
}

export type SignupStep = 'email' | 'otp' | 'password';
export type OnboardingStep = 'profile' | 'interests' | 'preferences' | 'media';
