import React from 'react';

import { Card, CardContent } from '@/components/ui/card';

export default function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="border-border/70 bg-card/95 shadow-2xl">
        <CardContent className="flex items-center gap-3 px-6 py-5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <span className="text-sm font-medium text-muted-foreground">Loading vault...</span>
        </CardContent>
      </Card>
    </div>
  );
}
