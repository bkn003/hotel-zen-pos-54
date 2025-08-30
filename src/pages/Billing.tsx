
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Search, Grid, List, X, Trash2 } from 'lucide-react';

interface Item {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  is_active: boolean;
}

interface CartItem extends Item {
  quantity: number;
}

interface PaymentType {
  id: string;
  payment_type: string;
  is_disabled: boolean;
  is_default: boolean;
}

const Billing = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    fetchItems();
    fetchPaymentTypes();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('is_disabled', false)
        .order('payment_type');
      if (error) throw error;
      const types = data || [];
      setPaymentTypes(types);

      // Set default payment
      const defaultPayment = types.find(p => p.is_default);
      if (defaultPayment) {
        setSelectedPayment(defaultPayment.payment_type);
      } else if (types.length > 0) {
        setSelectedPayment(types[0].payment_type);
      }
    } catch (error) {
      console.error('Error fetching payment types:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment types",
        variant: "destructive"
      });
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (item: Item) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    // Clear search after adding to cart for user friendliness
    setSearchQuery('');
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const getTotalAmount = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.max(0, subtotal - discount);
  };

  // Map payment types to valid enum values
  const mapPaymentMode = (paymentType: string): "cash" | "upi" | "card" | "other" => {
    const normalizedType = paymentType.toLowerCase().trim();
    switch (normalizedType) {
      case 'cash':
        return 'cash';
      case 'upi':
      case 'phonepe':
      case 'gpay':
      case 'paytm':
        return 'upi';
      case 'card':
      case 'debit':
      case 'credit':
        return 'card';
      default:
        return 'other';
    }
  };

  const generateBill = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive"
      });
      return;
    }
    if (!selectedPayment) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive"
      });
      return;
    }
    try {
      console.log('Generating bill with payment method:', selectedPayment);

      // Generate bill number
      const { data: billNumber } = await supabase.rpc('generate_bill_number');

      // Map payment type to valid enum value
      const paymentMode = mapPaymentMode(selectedPayment);
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          bill_no: billNumber,
          total_amount: getTotalAmount(),
          discount: discount,
          payment_mode: paymentMode as "cash" | "upi" | "card" | "other",
          created_by: profile?.user_id
        })
        .select()
        .single();
      if (billError) {
        console.error('Bill creation error:', billError);
        throw billError;
      }

      // Create bill items
      const billItems = cart.map(item => ({
        bill_id: billData.id,
        item_id: item.id,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      }));
      const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems);
      if (itemsError) {
        console.error('Bill items error:', itemsError);
        throw itemsError;
      }
      toast({
        title: "Success",
        description: `Bill ${billNumber} generated successfully!`
      });

      // Clear cart
      clearCart();
    } catch (error) {
      console.error('Error generating bill:', error);
      toast({
        title: "Error",
        description: "Failed to generate bill. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      <div className="w-full px-1 py-2">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center">
            <img
              src="/lovable-uploads/dd6a09aa-ab49-41aa-87d8-5ee1b772cb75.png"
              alt="Restaurant"
              className="w-6 h-6 mr-2"
            />
            <h1 className="text-lg sm:text-2xl font-bold">Point of Sale</h1>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-7 w-7 p-0"
            >
              <Grid className="w-3 h-3" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-7 w-7 p-0"
            >
              <List className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Sticky Cart Section - Fixed positioning when cart has items */}
        {cart.length > 0 && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b shadow-md">
            <div className="w-full px-1 py-2">
              <Card className="w-full max-w-[98vw] mx-auto">
                <CardHeader className="pb-1 px-2 py-1">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" />
                      Cart ({cart.length})
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearCart}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      title="Clear Cart"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 py-1 space-y-1">
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-1 px-1 border rounded text-xs bg-muted/30">
                        <div className="flex-1 min-w-0 pr-1">
                          <h4 className="font-bold truncate text-xs">{item.name}</h4>
                          <p className="text-xs text-muted-foreground font-medium">₹{item.price}</p>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-5 w-5 p-0"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="mx-1 min-w-[1rem] text-center text-xs font-bold">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-5 w-5 p-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                            className="h-5 w-5 p-0 ml-1 text-destructive hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-1">
                    <div>
                      <label className="text-xs font-bold mb-1 block">Payment</label>
                      <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-hide">
                        {paymentTypes.map(payment => (
                          <Button
                            key={payment.id}
                            variant={selectedPayment === payment.payment_type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedPayment(payment.payment_type)}
                            className="capitalize whitespace-nowrap flex-shrink-0 min-w-[50px] text-xs font-bold px-2 py-1 h-5"
                          >
                            {payment.payment_type}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="text-xs font-bold">Discount</label>
                        <Input
                          type="number"
                          min="0"
                          value={discount}
                          onChange={e => setDiscount(Number(e.target.value) || 0)}
                          className="h-6 w-full text-xs"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-sm">₹{getTotalAmount()}</span>
                        </div>
                        <Button
                          onClick={generateBill}
                          size="sm"
                          className="w-full h-6 text-xs font-bold"
                        >
                          Generate Bill
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Main Content - Add top padding when cart is visible */}
        <div className={cart.length > 0 ? 'pt-[160px]' : ''}>
          {/* Search */}
          <div className="mb-3">
            <div className="flex items-center relative">
              <Search className="absolute left-2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm font-medium"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-7 gap-1' 
            : 'space-y-1'
          }>
            {filteredItems.map(item => (
              <Card key={item.id} className={viewMode === 'list' 
                ? 'w-full p-1' 
                : 'w-full p-1 max-w-[75px]'
              }>
                {viewMode === 'grid' ? (
                  <>
                    <CardHeader className="pb-1 p-1">
                      <CardTitle className="text-xs font-bold line-clamp-2 leading-tight text-center">{item.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-1 pt-0">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold">₹{item.price}</span>
                        <Button
                          onClick={() => addToCart(item)}
                          size="sm"
                          className="h-5 w-5 p-0"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full p-1">
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-bold truncate text-sm">{item.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="font-bold text-sm">₹{item.price}</span>
                      <Button
                        size="sm"
                        onClick={() => addToCart(item)}
                        className="h-6 w-6 p-0"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
