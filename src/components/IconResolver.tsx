import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface IconResolverProps extends LucideProps {
  name: string;
  className?: string;
}

export const IconResolver = ({ name, ...props }: IconResolverProps) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.Link2;
  return <IconComponent {...props} />;
};
