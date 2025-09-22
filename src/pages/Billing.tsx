import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Search, Grid, List, X, Trash2, Edit2, Check } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Item {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  is_active: boolean;
  category?: string;
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

interface ItemCategory {
  id: string;
  name: string;
  is_deleted: boolean;
}

interface Bill {
  id: string;
  bill_no: string;
  total_amount: number;
  discount: number;
  payment_mode: string;
  date: string;
  created_at: string;
}

interface BillItem {
  id: string;
  item_id: string;
  quantity: number;
  price: number;
  total: number;
  items: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    is_active: boolean;
  };
}

type PaymentMode = "cash" | "upi" | "card" | "other";

const Billing = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [discount, setDiscount] = useState(0);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchPaymentTypes();
    
    // Check if we're editing a bill
    const billData = location.state?.bill;
    if (billData) {
      setEditingBill(billData);
      setIsEditMode(true);
      loadBillData(billData.id);
    }
  }, [location.state]);

  const loadBillData = async (billId: string) => {
    try {
      console.log('Loading bill data for:', billId);
      
      // Fetch bill items with item details
      const { data: billItems, error: billItemsError } = await supabase
        .from('bill_items')
        .select(`
          *,
          items (
            id,
            name,
            price,
            image_url,
            is_active
          )
        `)
        .eq('bill_id', billId);

      if (billItemsError) {
        console.error('Error fetching bill items:', billItemsError);
        throw billItemsError;
      }

      console.log('Bill items loaded:', billItems);

      // Convert bill items to cart items
      if (billItems && billItems.length > 0) {
        const cartItems: CartItem[] = billItems.map((billItem: BillItem) => ({
          id: billItem.items.id,
          name: billItem.items.name,
          price: billItem.price, // Use the price from the bill item (historical price)
          image_url: billItem.items.image_url,
          is_active: billItem.items.is_active,
          quantity: billItem.quantity
        }));

        setCart(cartItems);
        setDiscount(editingBill?.discount || 0);
        setSelectedPayment(editingBill?.payment_mode || '');
      }
    } catch (error) {
      console.error('Error loading bill data:', error);
      toast({
        title: "Error",
        description: "Failed to load bill data",
        variant: "destructive"
      });
    }
  };

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

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('item_categories')
        .select('*')
        .eq('is_deleted', false)
        .order('name');
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive"
      });
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

      // Set default payment only if not in edit mode
      if (!isEditMode) {
        const defaultPayment = types.find(p => p.is_default);
        if (defaultPayment) {
          setSelectedPayment(defaultPayment.payment_type);
        } else if (types.length > 0) {
          setSelectedPayment(types[0].payment_type);
        }
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

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

  const startEditingQuantity = (id: string, currentQuantity: number) => {
    setEditingQuantity(id);
    setTempQuantity(currentQuantity.toString());
  };

  const saveQuantity = (id: string) => {
    const newQuantity = parseInt(tempQuantity);
    if (newQuantity && newQuantity > 0) {
      setCart(prev => 
        prev.map(item =>
          item.id === id ? { ...item, quantity: newQuantity } : item
        ).filter(item => item.quantity > 0)
      );
    } else {
      // If quantity is 0 or invalid, remove item from cart
      setCart(prev => prev.filter(item => item.id !== id));
    }
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const cancelEditQuantity = () => {
    setEditingQuantity(null);
    setTempQuantity('');
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setIsEditMode(false);
    setEditingBill(null);
    // Navigate back to billing without any state
    navigate('/billing', { replace: true });
  };

  const getTotalAmount = () => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.max(0, subtotal - discount);
  };

  // Map payment types to valid enum values
  const mapPaymentMode = (paymentType: string): PaymentMode => {
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

  const updateBill = async () => {
    if (!editingBill) return;
    
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
      console.log('Updating bill:', editingBill.id);

      const paymentMode = mapPaymentMode(selectedPayment);
      
      // Update bill
      const { error: billError } = await supabase
        .from('bills')
        .update({
          total_amount: getTotalAmount(),
          discount: discount,
          payment_mode: paymentMode,
          is_edited: true
        })
        .eq('id', editingBill.id);

      if (billError) {
        console.error('Bill update error:', billError);
        throw billError;
      }

      // Delete existing bill items
      const { error: deleteError } = await supabase
        .from('bill_items')
        .delete()
        .eq('bill_id', editingBill.id);

      if (deleteError) {
        console.error('Error deleting old bill items:', deleteError);
        throw deleteError;
      }

      // Insert new bill items
      const billItems = cart.map(item => ({
        bill_id: editingBill.id,
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
        description: `Bill ${editingBill.bill_no} updated successfully!`
      });

      // Clear cart and navigate back to reports
      clearCart();
      navigate('/reports');
    } catch (error) {
      console.error('Error updating bill:', error);
      toast({
        title: "Error",
        description: "Failed to update bill. Please try again.",
        variant: "destructive"
      });
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

      // First, let's try to get the current max bill number and increment it
      const { data: maxBillData, error: maxBillError } = await supabase
        .from('bills')
        .select('bill_no')
        .order('created_at', { ascending: false })
        .limit(1);

      let billNumber: string;
      if (maxBillError) {
        console.error('Error fetching max bill number:', maxBillError);
        // Fallback to timestamp-based bill number
        billNumber = `BILL-${Date.now()}`;
      } else if (maxBillData && maxBillData.length > 0) {
        const lastBillNo = maxBillData[0].bill_no;
        const lastNumber = parseInt(lastBillNo.replace(/\D/g, '')) || 0;
        billNumber = `BILL-${String(lastNumber + 1).padStart(6, '0')}`;
      } else {
        billNumber = 'BILL-000001';
      }

      console.log('Generated bill number:', billNumber);

      // Map payment type to valid enum value
      const paymentMode = mapPaymentMode(selectedPayment);
      console.log('Mapped payment mode:', paymentMode);

      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          bill_no: billNumber,
          total_amount: getTotalAmount(),
          discount: discount,
          payment_mode: paymentMode,
          created_by: profile?.user_id
        })
        .select()
        .single();

      if (billError) {
        console.error('Bill creation error:', billError);
        throw billError;
      }

      console.log('Bill created successfully:', billData);

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
            <h1 className="text-lg sm:text-2xl font-bold">
              {isEditMode ? `Edit Bill - ${editingBill?.bill_no}` : 'Point of Sale'}
            </h1>
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
                  <CardTitle className="text-lg font-bold flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5" />
                      Cart ({cart.length})
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={clearCart}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      title="Clear Cart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 py-1 space-y-1">
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex items-center justify-between py-2 px-2 border rounded text-sm bg-muted/30">
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="font-bold truncate text-base leading-tight">{item.name}</h4>
                          <p className="text-sm text-muted-foreground font-bold">₹{item.price}</p>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-6 w-6 p-0"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          
                          {editingQuantity === item.id ? (
                            <div className="flex items-center space-x-1">
                              <Input
                                type="number"
                                value={tempQuantity}
                                onChange={(e) => setTempQuantity(e.target.value)}
                                className="h-6 w-16 text-sm text-center p-1 font-bold"
                                min="0"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    saveQuantity(item.id);
                                  } else if (e.key === 'Escape') {
                                    cancelEditQuantity();
                                  }
                                }}
                                onBlur={() => saveQuantity(item.id)}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveQuantity(item.id)}
                                className="h-6 w-6 p-0 text-green-600"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingQuantity(item.id, item.quantity)}
                                className="h-6 min-w-[2.5rem] px-2 text-sm font-bold"
                                title="Click to edit quantity"
                              >
                                {item.quantity}
                              </Button>
                            </div>
                          )}
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-6 w-6 p-0"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                            className="h-6 w-6 p-0 ml-1 text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="text-sm font-bold mb-1 block">Payment</label>
                      <div className="flex overflow-x-auto gap-1 pb-1 scrollbar-hide">
                        {paymentTypes.map(payment => (
                          <Button
                            key={payment.id}
                            variant={selectedPayment === payment.payment_type ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedPayment(payment.payment_type)}
                            className="capitalize whitespace-nowrap flex-shrink-0 min-w-[60px] text-sm font-bold px-3 py-1 h-7"
                          >
                            {payment.payment_type}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-sm font-bold">Discount</label>
                        <Input
                          type="number"
                          min="0"
                          value={discount}
                          onChange={e => setDiscount(Number(e.target.value) || 0)}
                          className="h-7 w-full text-sm font-bold"
                        />
                      </div>

                      <div className="flex flex-col justify-end">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-lg">₹{getTotalAmount()}</span>
                        </div>
                        <Button
                          onClick={isEditMode ? updateBill : generateBill}
                          size="sm"
                          className="w-full h-7 text-sm font-bold"
                        >
                          {isEditMode ? 'Update Bill' : 'Generate Bill'}
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
        <div className={cart.length > 0 ? 'pt-[180px]' : ''}>
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

          {/* Category Filter */}
          <div className="mb-3">
            <div 
              className="flex overflow-x-auto pb-2 scrollbar-hide"
              style={{
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
              }}
            >
              <Button
                variant={selectedCategory === 'All Categories' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('All Categories')}
                className="mr-2 whitespace-nowrap flex-shrink-0 h-7 px-3 text-xs font-bold"
              >
                All Categories
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.name ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.name)}
                  className="mr-2 whitespace-nowrap flex-shrink-0 h-7 px-3 text-xs font-bold"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Items Section */}
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-4 gap-2' 
            : 'space-y-1'
          }>
            {filteredItems.map(item => (
              <Card key={item.id} className={viewMode === 'list' 
                ? 'w-full p-1' 
                : 'w-full p-1'
              }>
                {viewMode === 'grid' ? (
                  <>
                    <CardHeader className="pb-1 p-1">
                      <CardTitle className="text-xs font-bold leading-tight text-center min-h-[3rem] flex items-center justify-center px-1" title={item.name}>
                        <span className="line-clamp-3 break-words">{item.name}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-1 pt-0">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold">₹{item.price}</span>
                        <Button
                          onClick={() => addToCart(item)}
                          size="sm"
                          className="h-6 w-6 p-0"
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
