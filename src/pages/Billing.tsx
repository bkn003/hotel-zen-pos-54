import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Plus, Minus, Search, Grid, List, X, Trash2, Edit2, Check, Package, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CompletePaymentDialog } from '@/components/CompletePaymentDialog';
import { getCachedImageUrl, cacheImageUrl } from '@/utils/imageUtils';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

interface Item {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  is_active: boolean;
  category?: string;
  unit?: string;
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('billing-view-mode') as 'grid' | 'list') || 'grid';
  });
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<string>('');
  const [discount, setDiscount] = useState(0);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState<string>('');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [additionalCharges, setAdditionalCharges] = useState<any[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [displaySettings, setDisplaySettings] = useState({
    items_per_row: 3,
    category_order: [] as string[]
  });

  // Enable real-time updates
  useRealTimeUpdates();

  // Fetch functions defined before useEffect
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

  const fetchAdditionalCharges = async () => {
    try {
      const { data, error } = await supabase
        .from('additional_charges')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setAdditionalCharges(data || []);
    } catch (error) {
      console.error('Error fetching additional charges:', error);
      toast({
        title: "Error",
        description: "Failed to fetch additional charges",
        variant: "destructive"
      });
    }
  };

  const fetchDisplaySettings = async () => {
    if (!profile?.user_id) return;
    
    try {
      const { data, error } = await supabase
        .from('display_settings')
        .select('*')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setDisplaySettings({
          items_per_row: data.items_per_row,
          category_order: data.category_order || []
        });
      }
    } catch (error) {
      console.error('Error fetching display settings:', error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchPaymentTypes();
    fetchAdditionalCharges();
    if (profile?.user_id) {
      fetchDisplaySettings();
    }

    // Check if we're editing a bill
    const billData = location.state?.bill;
    if (billData) {
      setEditingBill(billData);
      setIsEditMode(true);
      loadBillData(billData.id);
    }
  }, [location.state, profile?.user_id]);

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

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('billing-view-mode', mode);
  };

  const getTotalAmount = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return Math.max(0, subtotal - discount);
  };

  const total = getTotalAmount();

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

  const handleCompletePayment = async (paymentData: {
    paymentMethod: string;
    paymentAmounts: Record<string, number>;
    discount: number;
    discountType: 'flat' | 'percentage';
    additionalCharges: { name: string; amount: number; enabled: boolean }[];
  }) => {
    const user = (await supabase.auth.getUser()).data.user;
    try {
      console.log('Completing payment with data:', paymentData);

      // First, let's try to get the current max bill number and increment it
      const { data: maxBillData, error: maxBillError } = await supabase
        .from('bills')
        .select('bill_no')
        .order('created_at', { ascending: false })
        .limit(1);

      let billNumber: string;
      if (maxBillError) {
        console.error('Error fetching max bill number:', maxBillError);
        billNumber = `BILL-${Date.now()}`;
      } else if (maxBillData && maxBillData.length > 0) {
        const lastBillNo = maxBillData[0].bill_no;
        const lastNumber = parseInt(lastBillNo.replace(/\D/g, '')) || 0;
        billNumber = `BILL-${String(lastNumber + 1).padStart(6, '0')}`;
      } else {
        billNumber = 'BILL-000001';
      }

      console.log('Generated bill number:', billNumber);

      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalAdditionalCharges = paymentData.additionalCharges.reduce((sum, charge) => sum + charge.amount, 0);
      const totalAmount = subtotal + totalAdditionalCharges - paymentData.discount;
      const paymentMode = mapPaymentMode(paymentData.paymentMethod);

      console.log('Mapped payment mode:', paymentMode);

      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert({
          bill_no: billNumber,
          total_amount: totalAmount,
          discount: paymentData.discount,
          payment_mode: paymentMode,
          payment_details: paymentData.paymentAmounts,
          additional_charges: paymentData.additionalCharges.map(c => ({ name: c.name, amount: c.amount })),
          created_by: profile?.user_id
        })
        .select()
        .single();

      if (billError) {
        console.error('Bill creation error:', billError);
        throw billError;
      }

      console.log('Bill created successfully:', billData);

      // Create bill items and reduce stock
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

      // Reduce stock for each item
      for (const item of cart) {
        const { data: currentItem } = await supabase
          .from('items')
          .select('stock_quantity')
          .eq('id', item.id)
          .single();

        if (currentItem) {
          await supabase
            .from('items')
            .update({ stock_quantity: (currentItem.stock_quantity || 0) - item.quantity })
            .eq('id', item.id);
        }
      }

      toast({
        title: "Success",
        description: `Bill ${billNumber} generated successfully!`
      });

      // Clear cart and close dialog
      clearCart();
      setPaymentDialogOpen(false);
    } catch (error) {
      console.error('Error completing payment:', error);
      toast({
        title: "Error",
        description: "Failed to complete payment. Please try again.",
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
    <div className="min-h-screen flex">
      {/* Main Items Area */}
      <div className="flex-1 p-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img 
              src="/lovable-uploads/dd6a09aa-ab49-41aa-87d8-5ee1b772cb75.png" 
              alt="Restaurant" 
              className="w-8 h-8 mr-3" 
            />
            <h1 className="text-2xl font-bold">
              {isEditMode ? `Edit Bill - ${editingBill?.bill_no}` : 'Point of Sale'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant={viewMode === 'grid' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleViewModeChange('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => handleViewModeChange('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="flex items-center relative">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Items Grid - Scrollable */}
        <div className="overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
          {viewMode === 'grid' ? (
            <div className={`grid gap-2 ${
              displaySettings.items_per_row === 1 ? 'grid-cols-1' :
              displaySettings.items_per_row === 2 ? 'grid-cols-2' :
              displaySettings.items_per_row === 3 ? 'grid-cols-3' :
              displaySettings.items_per_row === 4 ? 'grid-cols-4' :
              displaySettings.items_per_row === 5 ? 'grid-cols-5' :
              'grid-cols-6'
            }`}>
              {filteredItems.map((item) => {
                const cartItem = cart.find(c => c.id === item.id);
                const cachedImageUrl = getCachedImageUrl(item.id);
                const imageUrl = item.image_url || cachedImageUrl;

                // Cache the image URL if it exists
                if (item.image_url && !cachedImageUrl) {
                  cacheImageUrl(item.id, item.image_url);
                }

                return (
                  <div key={item.id} className="bg-card rounded-lg border p-1 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative aspect-square mb-1 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {item.image_url ? (
                        <img
                          src={getCachedImageUrl(item.id)}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`${item.image_url ? 'hidden' : ''} w-full h-full flex items-center justify-center text-muted-foreground`}>
                        <Package className="w-8 h-8" />
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col min-h-0 px-1">
                      <h3 className="font-medium text-sm mb-0.5 line-clamp-2 flex-shrink-0">{item.name}</h3>
                      <p className="text-lg font-bold text-primary mb-1 flex-shrink-0">₹{item.price}/{item.unit || 'pc'}</p>
                      
                      {cartItem ? (
                        <div className="flex items-center justify-between mt-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-6 w-6 p-0 bg-red-50 hover:bg-red-100 border-red-200"
                          >
                            <Minus className="h-3 w-3 text-red-600" />
                          </Button>
                          <span className="mx-1 font-semibold min-w-[1.5rem] text-center text-sm">{cartItem.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-6 w-6 p-0 bg-green-50 hover:bg-green-100 border-green-200"
                          >
                            <Plus className="h-3 w-3 text-green-600" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => addToCart(item)}
                          className="w-full h-6 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium mt-auto"
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // List View
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const cartItem = cart.find(c => c.id === item.id);
                const cachedImageUrl = getCachedImageUrl(item.id);
                const imageUrl = item.image_url || cachedImageUrl;

                if (item.image_url && !cachedImageUrl) {
                  cacheImageUrl(item.id, item.image_url);
                }

                return (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {/* Image */}
                          <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          
                          {/* Name and Price */}
                          <div>
                            <h3 className="font-semibold text-sm">{item.name}</h3>
                            <p className="text-lg font-bold text-primary">₹{item.price}/{item.unit || 'pc'}</p>
                          </div>
                        </div>
                        
                        {/* Controls */}
                        <div className="flex items-center space-x-2">
                          {cartItem ? (
                            <div className="flex items-center space-x-2 bg-primary/10 rounded-full py-1 px-3">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, -1)}
                                className="h-6 w-6 p-0 rounded-full"
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="font-semibold min-w-[20px] text-center">
                                {cartItem.quantity}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="h-6 w-6 p-0 rounded-full"
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={() => addToCart(item)}
                              className="bg-primary hover:bg-primary/90 text-white"
                            >
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Cart Section */}
      <div className="hidden md:flex w-80 bg-card border-l flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Cart ({cart.length})
            </h2>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          {cart.length > 0 && (
            <div className="flex justify-between items-center text-sm">
              <span>Total: ₹{total.toFixed(0)}</span>
              <Button
                onClick={() => setPaymentDialogOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                Pay
              </Button>
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-sm line-clamp-2 flex-1">{item.name}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-700 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-primary">₹{item.price}</span>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      
                      {editingQuantity === item.id ? (
                        <div className="flex items-center space-x-1">
                          <Input
                            type="number"
                            value={tempQuantity}
                            onChange={(e) => setTempQuantity(e.target.value)}
                            className="w-12 h-8 text-center p-0"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => saveQuantity(item.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span
                          className="font-semibold min-w-[30px] text-center cursor-pointer hover:bg-gray-200 rounded px-2 py-1"
                          onClick={() => startEditingQuantity(item.id, item.quantity)}
                        >
                          {item.quantity}
                        </span>
                      )}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-2">
                    <span className="text-sm font-semibold">
                      Total: ₹{(item.price * item.quantity).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Cart Button - Simple Pay button like image-60.png */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 md:hidden z-50 px-4">
          <div className="bg-card border rounded-lg shadow-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5" />
                <span className="font-semibold">{cart.length} pc</span>
                <span className="text-lg font-bold">₹{total.toFixed(0)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearCart}
                  className="h-8 px-3"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => setPaymentDialogOpen(true)}
                  className="h-8 px-4 bg-green-600 hover:bg-green-700"
                >
                  Pay
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      <CompletePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        cart={cart}
        paymentTypes={paymentTypes}
        additionalCharges={additionalCharges}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onCompletePayment={handleCompletePayment}
      />
    </div>
  );
};

export default Billing;
