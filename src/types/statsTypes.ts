import { RouteProp } from '@react-navigation/native';

export type RootStackParamList = {
  Stats: {
    type: 'deliveryman' | 'unit';
    ids: string[];
    managerUnit?: string | null; // Added managerUnit
  };
};

export type StatsScreenRouteProp = RouteProp<RootStackParamList, 'Stats'>;

export type StatsScreenProps = {
  route: StatsScreenRouteProp;
};

export type TabType = 'overview' | 'details';

export type StatsHeaderProps = {
  type: 'deliveryman' | 'unit';
  selectedData: any[];
};

export type StatsTabsProps = {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
};

// Define StatusHistoryItem
export interface StatusHistoryItem {
  status: string;
  timestamp: any; // Consider using a more specific type like Date or Timestamp
  reason?: string;
  note?: string;
}

export interface Order {
  id: string;
  number: string;
  status: string;
  price: string;
  priceNumber: number;
  reviewRequested?: boolean;
  rating?: number;
  reviewComment?: string;
  reviewDate?: Date;
  items: string[];
  itemCount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  lastStatusUpdate: Date;
  address: string;
  customerName: string;
  customerPhone: string;
  pharmacyUnitId: string;
  deliveryMan?: string;
  deliveryManName?: string;
  licensePlate?: string;
  location: any | null;
  isDelivered: boolean;
  isInDelivery: boolean;
  isInPreparation: boolean;
  isPending: boolean;
  statusHistory: StatusHistoryItem[];
}

export interface StatsOverviewTabProps {
  type: 'deliveryman' | 'unit';
  selectedData?: any[];
  detailedStats?: Array<{
    totalRatings?: number;
    averageRating?: number;
  }>;
  userRole: string | null;
  openBottomSheet: () => void;
  recentOrders?: Order[];
}

export interface DateFilter {
  startDate: Date;
  endDate: Date;
}

export interface StatsDetailsTabProps {
  detailedStats: any[];
  type: 'deliveryman' | 'unit';
  userRole: string | null;
  onDateFilterChange?: (startDate: Date, endDate: Date) => void;
  currentDateFilter?: DateFilter;
}