import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#71717a]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter files..."
        className="h-8 pl-8 text-xs bg-[#0a0a0f] border-[#1e1e2e] text-[#e4e4e7] placeholder:text-[#71717a]"
      />
    </div>
  );
}
