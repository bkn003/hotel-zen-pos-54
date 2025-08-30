
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings, Hotel } from 'lucide-react';

export const Header: React.FC = () => {
  const { profile, signOut } = useAuth();

  if (!profile) return null;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-card border-b border-border px-4 py-3 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Hotel className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-bold text-xl text-foreground">
              {profile.hotel_name || 'Hotel ZEN'} POS
            </h1>
            <p className="text-sm text-muted-foreground">Management System</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Badge 
            variant={profile.role === 'super_admin' ? 'default' : profile.role === 'admin' ? 'secondary' : 'outline'}
            className="hidden md:flex"
          >
            {profile.role === 'super_admin' ? 'Super Admin' : 
             profile.role === 'admin' ? 'Admin' : 'Staff'}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className="hidden md:block text-sm font-medium">
                  {profile.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{profile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.role === 'super_admin' ? 'Super Administrator' : 
                   profile.role === 'admin' ? 'Hotel Administrator' : 'Staff Member'}
                </p>
              </div>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
