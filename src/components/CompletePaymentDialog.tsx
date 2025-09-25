import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Minus, X, Trash2 } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PaymentType {
  id: string;
  payment_type: string;
  is_disabled: boolean;
  is_default: boolean;
}

interface AdditionalCharge {
  id: string;
  name: string;
  charge_type: 'fixed' | 'per_unit' | 'percentage';
  amount: number;
  unit?: string;
  description?: string;
  is_active: boolean;
  is_default: boolean;
}

interface CompletePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  paymentTypes: PaymentType[];
  additionalCharges: AdditionalCharge[];
  onUpdateQuantity: (itemId: string, change: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCompletePayment: (paymentData: {
    paymentMethod: string;
    paymentAmounts: Record<string, number>;
    discount: number;
    discountType: 'flat' | 'percentage';
    additionalCharges: { name: string; amount: number; enabled: boolean }[];
  }) => void;
}

export const CompletePaymentDialog: React.FC<CompletePaymentDialogProps> = ({
  open,
  onOpenChange,
  cart,
  paymentTypes,
  additionalCharges,
  onUpdateQuantity,
  onRemoveItem,
  onCompletePayment
}) => {
  const [paymentAmounts, setPaymentAmounts] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'flat' | 'percentage'>('flat');
  const [selectedCharges, setSelectedCharges] = useState<Record<string, boolean>>({});

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate additional charges based on their type
  const totalAdditionalCharges = additionalCharges
    .filter(charge => selectedCharges[charge.id])
    .reduce((sum, charge) => {
      if (charge.charge_type === 'fixed') {
        return sum + charge.amount;
      } else if (charge.charge_type === 'per_unit') {
        const totalQuantity = cart.reduce((qty, item) => qty + item.quantity, 0);
        return sum + (charge.amount * totalQuantity);
      } else if (charge.charge_type === 'percentage') {
        return sum + (subtotal * charge.amount / 100);
      }
      return sum;
    }, 0);
  
  const discountAmount = discountType === 'percentage' 
    ? (subtotal * discount) / 100 
    : discount;
  
  const total = subtotal + totalAdditionalCharges - discountAmount;
  const totalPaymentAmount = Object.values(paymentAmounts).reduce((sum, amount) => sum + amount, 0);
  const remaining = total - totalPaymentAmount;

  const handlePaymentAmountChange = (paymentType: string, amount: number) => {
    setPaymentAmounts(prev => ({
      ...prev,
      [paymentType]: amount || 0
    }));
  };

  const handleCompletePayment = () => {
    const primaryPaymentMethod = Object.entries(paymentAmounts)
      .find(([_, amount]) => amount > 0)?.[0] || paymentTypes[0]?.payment_type || 'cash';

    const selectedAdditionalCharges = additionalCharges
      .filter(charge => selectedCharges[charge.id])
      .map(charge => ({
        name: charge.name,
        amount: charge.charge_type === 'fixed' ? charge.amount :
                charge.charge_type === 'per_unit' ? charge.amount * cart.reduce((qty, item) => qty + item.quantity, 0) :
                subtotal * charge.amount / 100,
        enabled: true
      }));

    onCompletePayment({
      paymentMethod: primaryPaymentMethod,
      paymentAmounts,
      discount: discountAmount,
      discountType,
      additionalCharges: selectedAdditionalCharges
    });
  };

  const toggleAdditionalCharge = (chargeId: string) => {
    setSelectedCharges(prev => ({
      ...prev,
      [chargeId]: !prev[chargeId]
    }));
  };

  // Initialize default charges
  React.useEffect(() => {
    const defaultCharges: Record<string, boolean> = {};
    additionalCharges.forEach(charge => {
      if (charge.is_default) {
        defaultCharges[charge.id] = true;
      }
    });
    setSelectedCharges(defaultCharges);
  }, [additionalCharges]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div>
            <h3 className="font-semibold mb-3">Order Summary</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-muted-foreground">
                      ₹{item.price.toFixed(2)} per 1kg
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="min-w-[2rem] text-center text-sm">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <div className="text-sm font-medium min-w-[4rem] text-right">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onRemoveItem(item.id)}
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Charges */}
          {additionalCharges.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Additional Charges</h3>
              <div className="space-y-2">
                {additionalCharges.map((charge) => {
                  const isSelected = selectedCharges[charge.id];
                  const calculatedAmount = charge.charge_type === 'fixed' ? charge.amount :
                                         charge.charge_type === 'per_unit' ? charge.amount * cart.reduce((qty, item) => qty + item.quantity, 0) :
                                         subtotal * charge.amount / 100;
                  
                  return (
                    <div key={charge.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleAdditionalCharge(charge.id)}
                        />
                        <div>
                          <span className="text-sm font-medium">{charge.name}</span>
                          {charge.charge_type === 'per_unit' && (
                            <span className="text-xs text-muted-foreground ml-1">
                              (₹{charge.amount}/{charge.unit})
                            </span>
                          )}
                          {charge.charge_type === 'percentage' && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({charge.amount}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium">
                        ₹{calculatedAmount.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Discount */}
          <div>
            <h3 className="font-semibold mb-3">Discount (Optional)</h3>
            <div className="flex items-center space-x-2">
              <Select value={discountType} onValueChange={(value: 'flat' | 'percentage') => setDiscountType(value)}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">₹ Flat</SelectItem>
                  <SelectItem value="percentage">% Percent</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="flex-1 h-8"
                placeholder="0"
                min="0"
                step={discountType === 'percentage' ? '1' : '0.01'}
                max={discountType === 'percentage' ? '100' : undefined}
              />
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <h3 className="font-semibold mb-3">Payment Methods *</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {paymentTypes.map((payment) => (
                <Button
                  key={payment.id}
                  variant={paymentAmounts[payment.payment_type] > 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const currentAmount = paymentAmounts[payment.payment_type] || 0;
                    if (currentAmount === 0) {
                      handlePaymentAmountChange(payment.payment_type, remaining > 0 ? remaining : total);
                    }
                  }}
                  className="capitalize text-xs h-8"
                >
                  {payment.payment_type.toUpperCase()}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {paymentTypes.map((payment) => (
                <Input
                  key={`amount-${payment.id}`}
                  type="number"
                  value={paymentAmounts[payment.payment_type] || 0}
                  onChange={(e) => handlePaymentAmountChange(payment.payment_type, Number(e.target.value))}
                  className="h-8 text-sm text-center"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              ))}
            </div>
            <div className="text-right mt-2">
              <span className="text-sm">Remaining: <span className="font-medium">₹{remaining.toFixed(2)}</span></span>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {additionalCharges.filter(charge => selectedCharges[charge.id]).map((charge) => {
              const calculatedAmount = charge.charge_type === 'fixed' ? charge.amount :
                                     charge.charge_type === 'per_unit' ? charge.amount * cart.reduce((qty, item) => qty + item.quantity, 0) :
                                     subtotal * charge.amount / 100;
              return (
                <div key={charge.id} className="flex justify-between text-sm">
                  <span>{charge.name}:</span>
                  <span>+₹{calculatedAmount.toFixed(2)}</span>
                </div>
              );
            })}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount:</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
              <span>Total:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompletePayment}
              disabled={remaining !== 0}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Complete Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};