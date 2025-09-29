'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface DepartmentFilterProps {
  value: string;
  onChange: (value: string) => void;
  departments: {
    value: string;
    label: string;
    count?: number;
  }[];
  placeholder?: string;
}

export function DepartmentFilter({
  value,
  onChange,
  departments,
  placeholder = "Filtrar por departamento"
}: DepartmentFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full sm:w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los departamentos</SelectItem>
        {departments.map((department) => (
          <SelectItem key={department.value} value={department.value}>
            <div className="flex items-center justify-between w-full">
              <span>{department.label}</span>
              {department.count !== undefined && (
                <Badge variant="secondary" className="ml-2">
                  {department.count}
                </Badge>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}