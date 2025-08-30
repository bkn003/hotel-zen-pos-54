
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, CreditCard, Package, TrendingUp } from 'lucide-react';
import { BillsReport } from '@/components/BillsReport';
import { ItemsReport } from '@/components/ItemsReport';
import { PaymentReport } from '@/components/PaymentReport';
import { ProfitLossReport } from '@/components/ProfitLossReport';

const Reports = () => {
  return (
    <div className="container mx-auto py-4 px-2 sm:px-4 max-w-full overflow-x-hidden">
      <div className="flex items-center mb-6">
        <FileText className="w-8 h-8 mr-3 text-primary" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm">Comprehensive business analytics and insights</p>
        </div>
      </div>

      <Card className="w-full">
        <CardContent className="p-0">
          <Tabs defaultValue="bills" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-12 rounded-none">
              <TabsTrigger value="bills" className="flex flex-col items-center gap-1 text-xs sm:text-sm font-bold px-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Bills</span>
                <span className="sm:hidden">Bills</span>
              </TabsTrigger>
              <TabsTrigger value="items" className="flex flex-col items-center gap-1 text-xs sm:text-sm font-bold px-2">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Items</span>
                <span className="sm:hidden">Items</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex flex-col items-center gap-1 text-xs sm:text-sm font-bold px-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Payments</span>
                <span className="sm:hidden">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="pnl" className="flex flex-col items-center gap-1 text-xs sm:text-sm font-bold px-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">P&L</span>
                <span className="sm:hidden">P&L</span>
              </TabsTrigger>
            </TabsList>

            <div className="p-4">
              <TabsContent value="bills" className="mt-0">
                <BillsReport />
              </TabsContent>

              <TabsContent value="items" className="mt-0">
                <ItemsReport />
              </TabsContent>

              <TabsContent value="payments" className="mt-0">
                <PaymentReport />
              </TabsContent>

              <TabsContent value="pnl" className="mt-0">
                <ProfitLossReport />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
