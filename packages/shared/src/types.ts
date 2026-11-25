export type Language = "sw" | "en";

export type VehicleCategory = "boda_boda" | "bajaji" | "car";

export type UserRole = "platform_owner" | "passenger" | "driver";

export type AccountStatus = "active" | "suspended" | "deactivated";

export type DriverApprovalStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type DriverAvailability = "offline" | "online" | "busy";

export type RideStatus =
  | "requested"
  | "searching"
  | "accepted"
  | "driver_arriving"
  | "driver_arrived"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_driver_found"
  | "disputed";

export type PaymentMethod = "cash" | "mpesa" | "airtel_money" | "mixx_by_yas";

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type PaymentProvider = "cash" | "mpesa" | "airtel" | "mixx";

export type RideActor = "passenger" | "driver" | "system" | "platform_owner";

export interface FareRule {
  id: string;
  serviceTypeId: string;
  operatingAreaId: string;
  currency: "TZS";
  baseFare: number;
  perKm: number;
  perMinute: number;
  minimumFare: number;
  cancellationFee: number;
  waitingPerMinute: number;
  commissionRate: number;
  roundingIncrement: number;
  version: number;
}

export interface FareEstimateInput {
  rule: FareRule;
  distanceKm: number;
  durationMinutes: number;
  waitingMinutes?: number;
  discountPercent?: number;
}

export interface FareBreakdown {
  currency: "TZS";
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  waitingFare: number;
  subtotal: number;
  discount: number;
  total: number;
  minimumApplied: boolean;
  commissionRate: number;
  commissionAmount: number;
  driverEarnings: number;
  ruleId: string;
  ruleVersion: number;
}

export interface RideSummary {
  id: string;
  status: RideStatus;
  passengerId: string;
  driverId: string | null;
  serviceTypeId: string;
  pickupAddress: string;
  dropoffAddress: string;
  totalFare: number | null;
  currency: "TZS";
  requestedAt: string;
  completedAt: string | null;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SavedPlace {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  icon: "home" | "work" | "star";
}

export interface OperatingArea {
  id: string;
  name: string;
  district: string;
  region: string;
  active: boolean;
  center: LatLng;
  radiusKm: number;
}

export interface ServiceType {
  id: string;
  code: VehicleCategory;
  nameSw: string;
  nameEn: string;
  descriptionSw: string;
  descriptionEn: string;
  seats: number;
  active: boolean;
}

export interface AdminMetrics {
  totalPassengers: number;
  totalDrivers: number;
  pendingDrivers: number;
  approvedDrivers: number;
  onlineDrivers: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  grossBookingValue: number;
  platformRevenue: number;
  driverEarnings: number;
}

export type NotificationChannel = "in_app" | "push" | "sms";
