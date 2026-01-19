import React from 'react';
import { Check } from 'lucide-react';
import { BMADCategory, BMADCategoryId } from '@/shared/types/revenue';
import { cn } from '@/lib/utils';

interface CategoryProgressIndicatorProps {
  categories: BMADCategory[];
  currentCategoryId: BMADCategoryId;
  onCategoryClick?: (categoryId: BMADCategoryId) => void;
}

/**
 * Visual progress indicator showing all categories and their completion status
 * Allows navigation between categories if onCategoryClick is provided
 */
export const CategoryProgressIndicator: React.FC<CategoryProgressIndicatorProps> = ({
  categories,
  currentCategoryId,
  onCategoryClick
}) => {
  const currentIndex = categories.findIndex(cat => cat.id === currentCategoryId);

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {categories.map((category, index) => {
          const isCompleted = category.completed;
          const isCurrent = category.id === currentCategoryId;
          const isPast = index < currentIndex;
          const isClickable = onCategoryClick && (isCompleted || isPast || isCurrent);

          return (
            <React.Fragment key={category.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <button
                  onClick={() => isClickable && onCategoryClick(category.id as BMADCategoryId)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    {
                      'bg-primary border-primary text-primary-foreground': isCurrent && !isCompleted,
                      'bg-green-600 border-green-600 text-white': isCompleted,
                      'bg-muted border-muted-foreground/30 text-muted-foreground': !isCurrent && !isCompleted && !isPast,
                      'cursor-pointer hover:scale-105': isClickable,
                      'cursor-default': !isClickable
                    }
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </button>

                {/* Label */}
                <div className="mt-2 text-center max-w-[100px]">
                  <p
                    className={cn('text-xs font-medium truncate', {
                      'text-foreground': isCurrent,
                      'text-muted-foreground': !isCurrent
                    })}
                    title={category.name}
                  >
                    {category.name}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {index < categories.length - 1 && (
                <div className="flex-1 h-0.5 mx-2 mb-10">
                  <div
                    className={cn('h-full transition-all', {
                      'bg-green-600': isCompleted,
                      'bg-primary': index < currentIndex,
                      'bg-muted-foreground/30': index >= currentIndex
                    })}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress Text */}
      <div className="mt-4 text-center">
        <p className="text-sm text-muted-foreground">
          Step {currentIndex + 1} of {categories.length}:{' '}
          <span className="font-medium text-foreground">
            {categories[currentIndex]?.name}
          </span>
        </p>
      </div>
    </div>
  );
};
