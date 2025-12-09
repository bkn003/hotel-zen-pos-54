import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Minus, Trash2 } from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
}

const getSimplifiedUnit = (unit?: string): string => {
  if (!unit) return 'pc';
  const unitMap: Record<string, string> = {
    'Piece (pc)': 'pc',
    'Kilogram (kg)': 'kg',
    'Gram (g)': 'g',
    'Liter (L)': 'lt',
    'Milliliter (mL)': 'ml',
    'Dozen (dz)': 'dz',
    'Box (box)': 'box',
    'Packet (pkt)': 'pkt',
  };
  return unitMap[unit] || unit.toLowerCase();
};

const isWeightOrVolumeUnit = (unit?: string): boolean => {
  if (!unit) return false;
  const weightVolumeUnits = ['kg', 'Kilogram (kg)', 'g', 'Gram (g)', 'lt', 'Liter (L)', 'ml', 'Milliliter (mL)'];
  return weightVolumeUnits.includes(unit) || weightVolumeUnits.includes(getSimplifiedUnit(unit));
};

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
  const [itemPriceOverrides, setItemPriceOverrides] = useState<Record<string, number>>({});
  const hasInitialized = React.useRef(false);

  // Calculate subtotal with price overrides
  const cartSubtotal = cart.reduce((sum, item) => {
    const effectivePrice = itemPriceOverrides[item.id] !== undefined ? itemPriceOverrides[item.id] : item.price;
    return sum + (effectivePrice * item.quantity);
  }, 0);

  const totalAdditionalCharges = additionalCharges
    .filter(charge => selectedCharges[charge.id])
    .reduce((sum, charge) => {
      if (charge.charge_type === 'fixed') {
        return sum + charge.amount;
      } else if (charge.charge_type === 'per_unit') {
        const totalQuantity = cart.reduce((qty, item) => qty + item.quantity, 0);
        return sum + (charge.amount * totalQuantity);
      } else if (charge.charge_type === 'percentage') {
        return sum + (cartSubtotal * charge.amount / 100);
      }
      return sum;
    }, 0);

  const subtotal = cartSubtotal + totalAdditionalCharges;
  const discountAmount = discountType === 'percentage'
    ? (subtotal * discount) / 100
    : discount;
  const total = subtotal - discountAmount;
  const totalPaymentAmount = Object.values(paymentAmounts).reduce((sum, amount) => sum + amount, 0);
  const remaining = total - totalPaymentAmount;

  const handlePaymentAmountChange = (paymentType: string, amount: number) => {
    setPaymentAmounts(prev => ({ ...prev, [paymentType]: amount || 0 }));
  };

  const handleCompletePayment = () => {
    const primaryPaymentMethod = Object.entries(paymentAmounts)
      .find(([_, amount]) => amount > 0)?.[0] || paymentTypes[0]?.payment_type || 'cash';
    const validCart = cart.filter(item => item.quantity > 0);

    const selectedAdditionalCharges = additionalCharges
      .filter(charge => selectedCharges[charge.id])
      .map(charge => ({
        name: charge.name,
        amount: charge.charge_type === 'fixed' ? charge.amount :
          charge.charge_type === 'per_unit' ? charge.amount * validCart.reduce((qty, item) => qty + item.quantity, 0) :
            cartSubtotal * charge.amount / 100,
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

  const handleChargeRowClick = (chargeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCharges(prev => ({ ...prev, [chargeId]: !prev[chargeId] }));
  };

  React.useEffect(() => {
    if (!open) {
      hasInitialized.current = false;
      setSelectedCharges({});
      setPaymentAmounts({});
      setDiscount(0);
      setDiscountType('flat');
      setItemPriceOverrides({});
    }
  }, [open]);

  React.useEffect(() => {
    if (open && paymentTypes.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;

      const defaultCharges: Record<string, boolean> = {};
      additionalCharges.forEach(charge => {
        if (charge.is_active) {
          defaultCharges[charge.id] = true;
        }
      });
      setSelectedCharges(defaultCharges);

      const defaultPayment = paymentTypes.find(p => p.is_default);
      if (defaultPayment && total > 0) {
        setPaymentAmounts({ [defaultPayment.payment_type]: total });
      }
    }
  }, [open, paymentTypes, additionalCharges, total]);

  React.useEffect(() => {
    if (open && hasInitialized.current) {
      const selectedPaymentType = Object.entries(paymentAmounts).find(([_, amount]) => amount > 0)?.[0];
      if (selectedPaymentType) {
        setPaymentAmounts({ [selectedPaymentType]: total });
      }
    }
  }, [total, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[95vh] flex flex-col p-0 gap-0 overflow-hidden border-2 border-primary/20">
        <DialogHeader className="p-3 pb-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
          <DialogTitle className="text-base flex items-center gap-2">
            <span className="bg-white/20 p-1 rounded">💳</span>
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Order Summary - Collapsible */}
          <details className="group" open>
            <summary className="font-semibold text-sm cursor-pointer flex items-center justify-between bg-muted/50 p-3 rounded-lg hover:bg-muted transition-colors">
              <span>Order Summary ({cart.length} items)</span>
              <span className="text-primary font-bold text-base">₹{cartSubtotal.toFixed(2)}</span>
            </summary>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {cart.map((item) => {
                const effectivePrice = itemPriceOverrides[item.id] !== undefined ? itemPriceOverrides[item.id] : item.price;
                return (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="font-semibold truncate text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">₹{item.price}/{getSimplifiedUnit(item.unit)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.id, -1)} className="h-6 w-6 p-0 rounded-full bg-red-500 text-white border-0 hover:bg-red-600">
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                      <Button size="sm" variant="outline" onClick={() => onUpdateQuantity(item.id, 1)} className="h-6 w-6 p-0 rounded-full bg-green-500 text-white border-0 hover:bg-green-600">
                        <Plus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground mx-1">×</span>
                      <Input
                        type="number"
                        value={effectivePrice}
                        onChange={(e) => {
                          const newPrice = Number(e.target.value) || 0;
                          setItemPriceOverrides(prev => ({ ...prev, [item.id]: newPrice }));
                        }}
                        className="h-6 w-14 text-xs text-center p-0 border-orange-400 bg-orange-50 dark:bg-orange-900/30 rounded font-bold"
                        min="0"
                        step="1"
                        title="Edit price"
                      />
                      <span className="text-sm font-bold min-w-[2.5rem] text-right text-primary">₹{(effectivePrice * item.quantity).toFixed(0)}</span>
                      <Button size="sm" variant="ghost" onClick={() => onRemoveItem(item.id)} className="h-6 w-6 p-0 text-destructive hover:bg-red-50">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>

          {/* Additional Charges */}
          {additionalCharges.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-2">
              <h3 className="font-medium text-sm mb-1.5 text-primary">Additional Charges</h3>
              <div className="space-y-1">
                {additionalCharges.map((charge) => {
                  const isSelected = selectedCharges[charge.id];
                  const calculatedAmount = charge.charge_type === 'fixed' ? charge.amount :
                    charge.charge_type === 'per_unit' ? charge.amount * cart.reduce((qty, item) => qty + item.quantity, 0) :
                      cartSubtotal * charge.amount / 100;

                  return (
                    <div
                      key={charge.id}
                      onClick={(e) => handleChargeRowClick(charge.id, e)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${isSelected
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-white/50 dark:bg-gray-800/50 border border-transparent hover:border-muted'
                        }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => { }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded-sm data-[state=checked]:bg-primary data-[state=checked]:border-primary pointer-events-none"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium text-xs truncate block ${isSelected ? 'text-primary' : ''}`}>
                            {charge.name}
                          </span>
                          {charge.charge_type === 'per_unit' && (
                            <span className="text-[10px] text-muted-foreground">₹{charge.amount}/{charge.unit}</span>
                          )}
                          {charge.charge_type === 'percentage' && (
                            <span className="text-[10px] text-muted-foreground">{charge.amount}%</span>
                          )}
                        </div>
                      </div>
                      <span className={`font-bold text-xs ml-2 flex-shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                        ₹{calculatedAmount.toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Discount */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-2">
            <h3 className="font-medium text-sm mb-1.5 text-green-700 dark:text-green-400">Discount (Optional)</h3>
            <div className="flex items-center gap-1">
              <Select value={discountType} onValueChange={(value: 'flat' | 'percentage') => setDiscountType(value)}>
                <SelectTrigger className="w-16 h-7 text-[10px] bg-white dark:bg-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">₹ Flat</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="flex-1 h-7 text-xs bg-white dark:bg-gray-800"
                placeholder="0"
                min="0"
                step={discountType === 'percentage' ? '1' : '0.01'}
                max={discountType === 'percentage' ? '100' : undefined}
              />
            </div>
          </div>

          {/* Payment Methods - Fixed alignment */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 rounded-lg p-3">
            <h3 className="font-semibold text-sm mb-3 text-orange-700 dark:text-orange-400">Payment Methods *</h3>
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(paymentTypes.length, 4)}, minmax(0, 1fr))` }}>
              {paymentTypes.map((payment) => (
                <div key={payment.id} className="flex flex-col items-center">
                  <Button
                    variant={paymentAmounts[payment.payment_type] > 0 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentAmounts({ [payment.payment_type]: total })}
                    className={`capitalize text-xs h-8 w-full font-bold rounded-lg transition-all duration-200 mb-1.5 ${paymentAmounts[payment.payment_type] > 0 ? 'bg-gradient-to-r from-primary to-primary/80 shadow-md' : 'bg-white dark:bg-gray-800'}`}
                  >
                    {payment.payment_type}
                  </Button>
                  <Input
                    type="number"
                    value={paymentAmounts[payment.payment_type] || 0}
                    onChange={(e) => handlePaymentAmountChange(payment.payment_type, Number(e.target.value))}
                    className="h-8 text-sm text-center bg-white dark:bg-gray-800 font-bold border-2 border-primary/20 focus:border-primary rounded-lg w-full"
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
              ))}
            </div>
            {remaining !== 0 && (
              <div className="text-right mt-2">
                <span className={`text-xs font-medium ${remaining > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  Remaining: ₹{remaining.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Summary - Fixed at bottom */}
        <div className="border-t-2 border-primary/20 p-3 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900 dark:to-slate-900">
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{cartSubtotal.toFixed(2)}</span>
            </div>
            {additionalCharges.filter(charge => selectedCharges[charge.id]).map((charge) => {
              const calculatedAmount = charge.charge_type === 'fixed' ? charge.amount :
                charge.charge_type === 'per_unit' ? charge.amount * cart.reduce((qty, item) => qty + item.quantity, 0) :
                  cartSubtotal * charge.amount / 100;
              return (
                <div key={charge.id} className="flex justify-between text-primary">
                  <span>{charge.name}:</span>
                  <span>+₹{calculatedAmount.toFixed(2)}</span>
                </div>
              );
            })}
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-between font-bold text-sm pt-1 mt-1 border-t border-primary/20">
            <span>Total:</span>
            <span className="text-primary text-base">₹{total.toFixed(2)}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 h-8 text-xs">
              Cancel
            </Button>
            <Button
              onClick={handleCompletePayment}
              disabled={remaining !== 0}
              className="flex-1 h-8 text-xs bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg"
            >
              Complete Payment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
