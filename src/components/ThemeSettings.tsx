import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Palette, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Theme {
    id: string;
    name: string;
    class: string;
    gradient: string;
    description: string;
}

const themes: Theme[] = [
    {
        id: 'blue',
        name: 'Blue',
        class: '',
        gradient: 'linear-gradient(135deg, hsl(218 90% 55%), hsl(230 85% 60%))',
        description: 'Classic blue gradient'
    },
    {
        id: 'purple',
        name: 'Purple Gradient',
        class: 'theme-purple',
        gradient: 'linear-gradient(135deg, hsl(270 70% 55%) 0%, hsl(290 85% 55%) 50%, hsl(320 70% 55%) 100%)',
        description: 'Deep purple with violet'
    },
    {
        id: 'green',
        name: 'Emerald Green',
        class: 'theme-green',
        gradient: 'linear-gradient(135deg, hsl(160 74% 42%) 0%, hsl(175 75% 40%) 50%, hsl(185 70% 45%) 100%)',
        description: 'Fresh emerald & teal'
    },
    {
        id: 'rose',
        name: 'Rose Pink',
        class: 'theme-rose',
        gradient: 'linear-gradient(135deg, hsl(350 75% 58%) 0%, hsl(330 80% 55%) 50%, hsl(310 70% 60%) 100%)',
        description: 'Elegant rose gold'
    },
    {
        id: 'sunset',
        name: 'Sunset Orange',
        class: 'theme-sunset',
        gradient: 'linear-gradient(135deg, hsl(40 95% 55%) 0%, hsl(25 95% 55%) 50%, hsl(10 85% 55%) 100%)',
        description: 'Warm sunset coral'
    }
];

const THEME_STORAGE_KEY = 'hotel_pos_theme';

export const ThemeSettings: React.FC = () => {
    const [activeTheme, setActiveTheme] = useState<string>(() => {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        return saved || 'blue';
    });

    useEffect(() => {
        // Apply theme on mount
        applyTheme(activeTheme);
    }, []);

    const applyTheme = (themeId: string) => {
        const theme = themes.find(t => t.id === themeId);
        if (!theme) return;

        // Remove all theme classes first
        document.documentElement.classList.remove(
            'theme-purple',
            'theme-green',
            'theme-rose',
            'theme-sunset'
        );

        // Add the new theme class (if not default blue)
        if (theme.class) {
            document.documentElement.classList.add(theme.class);
        }
    };

    const handleThemeChange = (themeId: string) => {
        setActiveTheme(themeId);
        localStorage.setItem(THEME_STORAGE_KEY, themeId);
        applyTheme(themeId);

        const theme = themes.find(t => t.id === themeId);
        toast({
            title: "Theme Changed",
            description: `Switched to ${theme?.name} theme`,
        });
    };

    return (
        <Card>
            <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2">
                    <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-base sm:text-lg">App Theme</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
                <p className="text-sm text-muted-foreground mb-4">
                    Choose a theme to personalize your app experience.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {themes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${activeTheme === theme.id
                                    ? 'border-primary ring-2 ring-primary/30 shadow-md'
                                    : 'border-border hover:border-primary/50'
                                }`}
                        >
                            {/* Gradient Preview */}
                            <div
                                className="w-full h-16 sm:h-20 rounded-lg mb-2 shadow-inner relative overflow-hidden"
                                style={{ background: theme.gradient }}
                            >
                                {activeTheme === theme.id && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <div className="bg-white rounded-full p-1">
                                            <Check className="w-4 h-4 text-green-600" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Theme Name */}
                            <span className="text-xs sm:text-sm font-medium text-center">
                                {theme.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground text-center hidden sm:block">
                                {theme.description}
                            </span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
