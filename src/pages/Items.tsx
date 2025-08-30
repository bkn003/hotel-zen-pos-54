import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Package, Search, Plus } from 'lucide-react';
import { AddItemDialog } from '@/components/AddItemDialog';
import { EditItemDialog } from '@/components/EditItemDialog';
import { ItemCategoryManagement } from '@/components/ItemCategoryManagement';

interface Item {
  id: string;
  name: string;
  price: number;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Items: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, selectedCategory, items]);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to fetch items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
      setCategories((data || []).map(cat => cat.name));
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const applyFilters = () => {
    let filtered = items;

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchLower) ||
        (item.category && item.category.toLowerCase().includes(searchLower)) ||
        item.price.toString().includes(searchTerm)
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredItems(filtered);
  };

  const handleItemAdded = () => {
    fetchItems();
  };

  const handleCategoriesUpdated = () => {
    fetchCategories();
  };

  const activeItems = filteredItems.filter(item => item.is_active);
  const inactiveItems = filteredItems.filter(item => !item.is_active);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 px-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center">
          <Package className="w-8 h-8 mr-3 text-primary" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Items Management</h1>
            <p className="text-muted-foreground text-sm">Manage your menu items and categories</p>
          </div>
        </div>
        <div className="flex gap-2">
          {profile?.role === 'admin' && (
            <>
              <ItemCategoryManagement onCategoriesUpdated={handleCategoriesUpdated} />
              <AddItemDialog onItemAdded={handleItemAdded} existingItems={items} />
            </>
          )}
        </div>
      </div>

      {/* Search and Filter */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="w-5 h-5" />
            Search & Filter Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search by name, category, or price..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === 'all' ? "default" : "outline"}
              onClick={() => setSelectedCategory('all')}
              size="sm"
              className="flex-shrink-0"
            >
              All Categories
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                size="sm"
                className="flex-shrink-0"
              >
                {category}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Active ({activeItems.length})
          </TabsTrigger>
          <TabsTrigger value="inactive" className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            Inactive ({inactiveItems.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Items ({activeItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {activeItems.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Active Items Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || selectedCategory !== 'all' ? 'No active items match your search criteria.' : 'No active items available yet.'}
                  </p>
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                  {activeItems.map((item) => (
                    <Card key={item.id} className="p-4 hover:shadow-md transition-shadow flex-shrink-0 w-80 min-w-[280px]">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-lg">{item.name}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.category || 'No Category'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg text-primary">
                            ₹{item.price.toFixed(2)}
                          </span>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            Active
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <div>Created: {new Date(item.created_at).toLocaleDateString()}</div>
                          <div>Updated: {new Date(item.updated_at).toLocaleDateString()}</div>
                        </div>
                        
                        {profile?.role === 'admin' && (
                          <div className="pt-2 w-full">
                            <EditItemDialog item={item} onItemUpdated={handleItemAdded} />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Inactive Items ({inactiveItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {inactiveItems.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No Inactive Items Found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || selectedCategory !== 'all' ? 'No inactive items match your search criteria.' : 'No inactive items available.'}
                  </p>
                </div>
              ) : (
                <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-hide">
                  {inactiveItems.map((item) => (
                    <Card key={item.id} className="p-4 hover:shadow-md transition-shadow bg-muted/50 flex-shrink-0 w-80 min-w-[280px]">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-lg text-muted-foreground">{item.name}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {item.category || 'No Category'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-lg text-muted-foreground">
                            ₹{item.price.toFixed(2)}
                          </span>
                          <Badge variant="destructive">
                            Inactive
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          <div>Created: {new Date(item.created_at).toLocaleDateString()}</div>
                          <div>Updated: {new Date(item.updated_at).toLocaleDateString()}</div>
                        </div>
                        
                        {profile?.role === 'admin' && (
                          <div className="pt-2 w-full">
                            <EditItemDialog item={item} onItemUpdated={handleItemAdded} />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Items;
