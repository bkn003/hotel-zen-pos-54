
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Receipt, Plus, X, CheckCircle } from 'lucide-react';
import { Item, PaymentMode } from '@/types/user';

interface BillItem {
  item: Item;
  quantity: number;
}

interface PaymentType {
  id: string;
  name: string;
}

const Billing = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    fetchItems();
    fetchPaymentTypes();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, name, price')
        .eq('is_active', true);

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive",
      });
    }
  };

  const fetchPaymentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('id, payment_type')
        .eq('is_disabled', false);

      if (error) throw error;
      setPaymentTypes(data?.map(p => ({ id: p.id, name: p.payment_type })) || []);
    } catch (error) {
      console.error('Error fetching payment types:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment types",
        variant: "destructive",
      });
    }
  };

  const addItemToBill = () => {
    if (!selectedItem) {
      toast({
        title: "Error",
        description: "Please select an item",
        variant: "destructive",
      });
      return;
    }

    if (quantity <= 0) {
      toast({
        title: "Error",
        description: "Quantity must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    const existingItem = billItems.find(item => item.item.id === selectedItem.id);
    if (existingItem) {
      const updatedBillItems = billItems.map(item =>
        item.item.id === selectedItem.id ? { ...item, quantity: item.quantity + quantity } : item
      );
      setBillItems(updatedBillItems);
    } else {
      setBillItems([...billItems, { item: selectedItem, quantity }]);
    }

    setSelectedItem(null);
    setQuantity(1);
  };

  const removeItemFromBill = (itemId: string) => {
    const updatedBillItems = billItems.filter(item => item.item.id !== itemId);
    setBillItems(updatedBillItems);
  };

  const clearBill = () => {
    setBillItems([]);
  };

  const totalAmount = billItems.reduce((total, item) => total + item.item.price * item.quantity, 0);

  // Map payment types to valid enum values
  const mapPaymentMode = (paymentType: string): PaymentMode => {
    const normalizedType = paymentType.toLowerCase().trim();
    switch (normalizedType) {
      case 'cash':
        return 'cash';
      case 'upi':
      case 'gpay':
      case 'paytm':
      case 'phonepe':
        return 'upi';
      case 'card':
      case 'credit card':
      case 'debit card':
        return 'card';
      default:
        return 'other';
    }
  };

  const processBill = async () => {
    if (billItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to the bill",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPaymentType) {
      toast({
        title: "Error",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessing(true);

      // Create the bill first
      const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert([
          {
            bill_no: '123',
            created_by: profile?.user_id || profile?.id || 'system',
            total_amount: totalAmount,
            payment_mode: mapPaymentMode(selectedPaymentType.name),
            date: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (billError) throw billError;

      // Create bill items
      const billItemsData = billItems.map(item => ({
        bill_id: billData.id,
        item_id: item.item.id,
        quantity: item.quantity,
        price: item.item.price,
        total: item.item.price * item.quantity
      }));

      const { error: billItemsError } = await supabase
        .from('bill_items')
        .insert(billItemsData);

      if (billItemsError) throw billItemsError;

      toast({
        title: "Success",
        description: "Bill processed successfully",
      });

      // Reset the bill
      setBillItems([]);
      setSelectedPaymentType(null);
    } catch (error) {
      console.error('Error processing bill:', error);
      toast({
        title: "Error",
        description: "Failed to process bill",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-4 px-4 max-w-full">
      {/* Header */}
      <div className="flex items-center mb-6">
        <Receipt className="w-8 h-8 mr-3 text-primary" />
        <h1 className="text-2xl font-bold">Billing</h1>
      </div>

      {/* Add Item Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Item</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select onValueChange={(value) => setSelectedItem(items.find(item => item.id === value) || null)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an item" defaultValue={selectedItem?.name} />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            placeholder="Quantity"
            value={quantity.toString()}
            onChange={(e) => setQuantity(parseInt(e.target.value))}
          />
          <Button onClick={addItemToBill}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      </Card>

      {/* Bill Items Table */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bill Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption>A list of items in the current bill.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {billItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No items in the bill</TableCell>
                </TableRow>
              ) : (
                billItems.map((billItem) => (
                  <TableRow key={billItem.item.id}>
                    <TableCell>{billItem.item.name}</TableCell>
                    <TableCell>{billItem.quantity}</TableCell>
                    <TableCell>{billItem.item.price}</TableCell>
                    <TableCell>{billItem.item.price * billItem.quantity}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => removeItemFromBill(billItem.item.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Section */}
      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-lg font-semibold">Total Amount: ${totalAmount.toFixed(2)}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Select onValueChange={(value) => setSelectedPaymentType(paymentTypes.find(pt => pt.id === value) || null)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment method" defaultValue={selectedPaymentType?.name} />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map((paymentType) => (
                  <SelectItem key={paymentType.id} value={paymentType.id}>{paymentType.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={processBill} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Process Bill
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
