/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum EventType {
  CHAT = "chat",
  NARRATIVE = "narrative",
  SCREENSHOT = "screenshot",
  MARKER = "marker"
}

export enum SentimentType {
  POSITIVE = "positive",
  NEUTRAL = "neutral",
  NEGATIVE = "negative"
}

export interface Character {
  id: string; // e.g., "Ivan", "Albee", "Chloe"
  name: string;
  avatarUrl: string;
  color: string; // Tailwind color class or hex string
  relationshipToHugo: string; // Short bio / current relationship status description
  createdAt?: any;
}

export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  characterId: string; // ID of the character who sent/initiated it
  receiverId?: string; // ID of the character who received it
  content: string; // Message content or narrative description
  imageUrl?: string; // Optional screenshot snippet URL or uploaded photo
  type: EventType;
  sentiment?: SentimentType;
  isImportant?: boolean; // Highlight in the timeline
  order: number; // Custom sorting order
  createdAt?: any;
  updatedAt?: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
