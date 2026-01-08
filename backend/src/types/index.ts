export enum UserRole {
    BUYER = 'buyer',
    SELLER = 'seller',
    ADMIN = 'admin',
    EMPLOYEE = 'employee',
    PARTNER = 'partner',
    LEGAL_PARTNER = 'legal_partner',
    GROUND_PARTNER = 'ground_partner',
}

export enum PropertyStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    SOLD = 'sold',
    RENTED = 'rented',
    INACTIVE = 'inactive',
    REJECTED = 'rejected',
}

export enum PropertyType {
    APARTMENT = 'apartment',
    VILLA = 'villa',
    HOUSE = 'house',
    PLOT = 'plot',
    COMMERCIAL = 'commercial',
}

export enum TransactionStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export enum NotificationType {
    MESSAGE = 'message',
    OFFER = 'offer',
    INQUIRY = 'inquiry',
    PAYMENT = 'payment',
    SYSTEM = 'system',
    ALERT = 'alert',
}

export interface User {
    uid: string;
    email: string;
    displayName: string;
    phoneNumber?: string;
    photoURL?: string;
    role: UserRole;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    lastLogin?: string;
    isActive: boolean;
    metadata?: Record<string, any>;
}

export interface Property {
    id: string;
    title: string;
    description: string;
    propertyType: PropertyType;
    price: number;
    area: number;
    bedrooms?: number;
    bathrooms?: number;
    city: string;
    state: string;
    address: string;
    latitude?: number;
    longitude?: number;
    images: string[];
    amenities: string[];
    furnished?: string;
    status: PropertyStatus;
    sellerId: string;
    sellerEmail: string;
    views: number;
    favorites: number;
    inquiries: number;
    createdAt: string;
    updatedAt: string;
    expiresAt?: string;
}

export interface Transaction {
    id: string;
    userId: string;
    amount: number;
    currency: string;
    serviceId: string;
    serviceName: string;
    paymentMethod: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    status: TransactionStatus;
    metadata?: Record<string, any>;
    createdAt: string;
    completedAt?: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    read: boolean;
    metadata?: Record<string, any>;
    createdAt: string;
    readAt?: string;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    receiverId: string;
    content: string;
    attachments?: string[];
    read: boolean;
    createdAt: string;
    readAt?: string;
}

export interface Lead {
    id: string;
    propertyId: string;
    userId: string;
    partnerId?: string;
    name: string;
    email: string;
    phone: string;
    message?: string;
    status: string;
    source: string;
    createdAt: string;
    updatedAt: string;
}

export interface Subscription {
    id: string;
    userId: string;
    planId: string;
    planName: string;
    price: number;
    listingsAllowed: number;
    listingsUsed: number;
    startDate: string;
    expiryDate: string;
    isActive: boolean;
    createdAt: string;
}
