export type Language = 'en' | 'am' | 'ar' | 'om' | 'tr' | 'zh' | 'fr';

export interface BusinessSettings {
  id?: string;
  name: string;
  managerName: string;
  accountNumber: string;
  phone: string;
  managerPin?: string;
  hotelImageUrl?: string;
}

export interface MenuItem {
  id?: string;
  name: string;
  price: number;
  available: boolean;
  category: string;
  imageUrl?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id?: string;
  customerName: string;
  chairCode: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed';
  createdAt: number;
  receiptImageUrl?: string;
  voiceNoteUrl?: string;
  voiceText?: string;
}

export interface Feedback {
  id?: string;
  customerName: string;
  comment: string;
  createdAt: number;
}
