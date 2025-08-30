import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { PaymentMethod } from '@/integrations/supabase/types';

interface BillItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

const Billing = () => {
  const [billNo, setBillNo] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentMode, setPaymentMode] = useState<PaymentMethod>('cash');
  const [discount, setDiscount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Generate a unique bill number on component mount
    setBillNo(generateBillNo());
  }, []);

  const generateBillNo = () => {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `BILL-${timestamp}-${random.toUpperCase()}`;
  };

  const handleAddItem = () => {
    // Logic to add a new item to the bill
    setBillItems([...billItems, { id: generateBillNo(), name: '', price: 0, quantity: 1, total: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
    // Logic to remove an item from the bill
    setBillItems(billItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    // Logic to update an item's details
    setBillItems(
      billItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          updatedItem.total = updatedItem.price * updatedItem.quantity;
          return updatedItem;
        }
        return item;
      })
    );

    // Recalculate total amount
    recalculateTotal();
  };

  const recalculateTotal = () => {
    let newTotal = billItems.reduce((sum, item) => sum + item.total, 0);
    newTotal -= discount;
    setTotalAmount(newTotal);
  };

  const handleDiscountChange = (value: number) => {
    setDiscount(value);
    recalculateTotal();
  };

  const handleSubmit = () => {
    // Logic to submit the bill
    toast({
      title: "Success",
      description: "Bill submitted successfully",
    });
  };

  return (
    <div className="container mx-auto py-6 px-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Create New Bill</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="billNo">Bill No.</Label>
              <Input type="text" id="billNo" value={billNo} readOnly />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    {date ? format(date, "PPP") : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) =>
                      date > new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Select value={paymentMode} onValueChange={(value) => setPaymentMode(value as PaymentMethod)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value))}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{item.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button size="sm" variant="destructive" onClick={() => handleRemoveItem(item.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button onClick={handleAddItem}>Add Item</Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="discount">Discount</Label>
              <Input
                type="number"
                id="discount"
                value={discount}
                onChange={(e) => handleDiscountChange(parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input type="text" id="totalAmount" value={totalAmount} readOnly />
            </div>
          </div>

          <Button onClick={handleSubmit}>Submit Bill</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Billing;
