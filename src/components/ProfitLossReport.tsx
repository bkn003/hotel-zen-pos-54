
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export const ProfitLossReport = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profit & Loss Statement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Profit & loss statement content will be displayed here.</p>
      </CardContent>
    </Card>
  );
};
