
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

export const ItemsReport = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Items Sales Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Items sales report content will be displayed here.</p>
      </CardContent>
    </Card>
  );
};
