
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export const BillsReport = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Bills Report
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Bills report content will be displayed here.</p>
      </CardContent>
    </Card>
  );
};
