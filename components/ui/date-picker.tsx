"use client";

import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Props {
  value?: string; // ISO date string
  onChange: (value: string) => void;
  placeholder?: string;
}

export function DatePicker({ value, onChange, placeholder = "Seleccionar data" }: Props) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected
            ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: pt })
            : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) {
              onChange(date.toISOString());
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
