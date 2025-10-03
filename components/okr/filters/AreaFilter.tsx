'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface AreaFilterProps {
  value: string;
  onChange: (value: string) => void;
  areas: {
    value: string;
    label: string;
    count?: number;
  }[];
  placeholder?: string;
}

export function AreaFilter({
  value,
  onChange,
  areas,
  placeholder = "Filtrar por área"
}: AreaFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas las áreas</SelectItem>
        {areas.map((area) => (
          <SelectItem key={area.value} value={area.value}>
            <div className="flex items-center justify-between w-full">
              <span>{area.label}</span>
              {area.count !== undefined && (
                <Badge variant="secondary" className="ml-2">
                  {area.count}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
