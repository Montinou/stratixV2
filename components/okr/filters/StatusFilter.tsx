'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface StatusFilterProps {
  value: string;
  onChange: (value: string) => void;
  statuses: {
    value: string;
    label: string;
    count?: number;
  }[];
  placeholder?: string;
}

export function StatusFilter({ value, onChange, statuses, placeholder = "Filtrar por estado" }: StatusFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los estados</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status.value} value={status.value}>
            <div className="flex items-center justify-between w-full">
              <span>{status.label}</span>
              {status.count !== undefined && (
                <Badge variant="secondary" className="ml-2">
                  {status.count}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}