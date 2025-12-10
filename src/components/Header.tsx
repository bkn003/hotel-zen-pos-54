import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { LogOut, User, Hotel } from 'lucide-react';

export const Header: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  if (!profile) return null;

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    await signOut();
  };

  return (
    <>
      <header className="bg-card border-b border-border px-3 md:px-6 py-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Hotel className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-bold text-base text-foreground">
                ZEN POS
              </h1>
              <p className="text-xs text-muted-foreground">Management System</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Badge variant={profile.role === 'admin' ? 'default' : 'outline'} className="hidden md:flex">
              {profile.role === 'admin' ? 'Admin' : 'Staff'}
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
                    {profile.role === 'admin' ? 'Hotel Administrator' : 'Staff Member'}
                  </p>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => setShowSignOutConfirm(true)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-destructive" />
              Confirm Sign Out
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out from ZEN POS?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowSignOutConfirm(false)}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="flex-1 sm:flex-none"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};