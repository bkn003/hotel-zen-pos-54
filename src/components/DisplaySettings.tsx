import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DisplaySettingsProps {
  userId: string;
}

export const DisplaySettings: React.FC<DisplaySettingsProps> = ({ userId }) => {
  const [settings, setSettings] = useState({
    items_per_row: 3,
    category_order: [] as string[]
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, [userId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('display_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          items_per_row: data.items_per_row,
          category_order: data.category_order || []
        });
      }
    } catch (error) {
      console.error('Error fetching display settings:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('item_categories')
        .select('name')
        .eq('is_deleted', false)
        .order('name');

      if (error) throw error;

      setAvailableCategories(data?.map(cat => cat.name) || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const { error } = await supabase
        .from('display_settings')
        .upsert({
          user_id: userId,
          items_per_row: settings.items_per_row,
          category_order: settings.category_order
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Display settings have been updated successfully"
      });
    } catch (error) {
      console.error('Error saving display settings:', error);
      toast({
        title: "Error",
        description: "Failed to save display settings",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addCategoryToOrder = (category: string) => {
    if (!settings.category_order.includes(category)) {
      setSettings(prev => ({
        ...prev,
        category_order: [...prev.category_order, category]
      }));
    }
  };

  const removeCategoryFromOrder = (category: string) => {
    setSettings(prev => ({
      ...prev,
      category_order: prev.category_order.filter(cat => cat !== category)
    }));
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...settings.category_order];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      setSettings(prev => ({ ...prev, category_order: newOrder }));
    }
  };

  const unorderedCategories = availableCategories.filter(
    cat => !settings.category_order.includes(cat)
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🎛️</span>
            <span>Display Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Items per Row Setting */}
          <div>
            <Label htmlFor="items_per_row">Items per Row in Billing Page</Label>
            <Select
              value={settings.items_per_row.toString()}
              onValueChange={(value) => setSettings(prev => ({ 
                ...prev, 
                items_per_row: parseInt(value) 
              }))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Item per Row</SelectItem>
                <SelectItem value="2">2 Items per Row</SelectItem>
                <SelectItem value="3">3 Items per Row (Default)</SelectItem>
                <SelectItem value="4">4 Items per Row</SelectItem>
                <SelectItem value="5">5 Items per Row</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Fewer items per row = larger cards and images.
            </p>
          </div>

          {/* Category Display Order */}
          <div>
            <Label>Category Display Order</Label>
            <div className="mt-2 space-y-4">
              {/* Ordered Categories */}
              {settings.category_order.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Drag to reorder categories:</h4>
                  <div className="space-y-2">
                    {settings.category_order.map((category, index) => (
                      <div
                        key={category}
                        className="flex items-center space-x-2 p-2 bg-muted rounded"
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        <Badge variant="secondary" className="flex-1">
                          {category}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveCategory(index, 'up')}
                            disabled={index === 0}
                            className="h-6 w-6 p-0"
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveCategory(index, 'down')}
                            disabled={index === settings.category_order.length - 1}
                            className="h-6 w-6 p-0"
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCategoryFromOrder(category)}
                            className="h-6 w-6 p-0 text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Categories */}
              {unorderedCategories.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h4 className="text-sm font-medium mb-3">Available Categories:</h4>
                  <div className="flex flex-wrap gap-2">
                    {unorderedCategories.map(category => (
                      <Badge
                        key={category}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => addCategoryToOrder(category)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {category}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click to add them to the order above.
                  </p>
                </div>
              )}

              {availableCategories.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No categories found. Create some categories first.
                </p>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Display Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};