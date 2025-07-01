'use client';

import { Building2, Search, Home } from 'lucide-react';
import { Button } from './button';

interface HeaderProps {
  onNewSearch?: () => void;
  showNewSearchButton?: boolean;
}

export function Header({ onNewSearch, showNewSearchButton = false }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo và brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold logo-text leading-none">
                EstateValuate
              </h1>
              <p className="text-xs text-slate-500 leading-none">
                AI Property Valuation
              </p>
            </div>
          </div>

          {/* Navigation actions */}
          <div className="flex items-center gap-4">
            {showNewSearchButton && (
              <Button
                onClick={onNewSearch}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Tìm kiếm mới
              </Button>
            )}
            
            {/* Professional badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full">
              <Home className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                Định giá chuyên nghiệp
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 