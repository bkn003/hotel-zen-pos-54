
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export const PaymentReport = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Methods Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Payment methods report content will be displayed here.</p>
      </CardContent>
    </Card>
  );
};
