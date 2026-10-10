export type DonationPaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
export type DonationPaymentStatus = 'PENDING_APPROVAL' | 'VERIFIED' | 'REJECTED' | 'REVERSED' | 'REFUNDED';

export interface DonationPayment {
  id: string;
  tenantId: string;
  pledgeId: string;
  donorUserId: string;
  amountPaise: number;
  currency: 'INR';
  method: DonationPaymentMethod;
  reference?: string;
  note?: string;
  status: DonationPaymentStatus;
  recordedBy: string;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
