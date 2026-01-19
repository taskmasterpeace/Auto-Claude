import React from 'react';

interface CategoryHeaderProps {
  title: string;
  description: string;
}

/**
 * Header component for each category form
 * Displays the category name and description
 */
export const CategoryHeader: React.FC<CategoryHeaderProps> = ({
  title,
  description
}) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};
