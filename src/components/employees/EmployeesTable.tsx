"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search } from "lucide-react"

type Employee = {
  id: string
  name: string
  email: string
  role: string
  orderCount: number
}

const ROLE_OPTIONS = [
  { value: "ALL", label: "All roles" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "DATA_ENTRY", label: "Data Entry" },
  { value: "CASHIER", label: "Cashier" },
]

export function EmployeesTable({ employees }: { employees: Employee[] }) {
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return employees.filter((emp) => {
      if (roleFilter !== "ALL" && emp.role !== roleFilter) return false
      if (!q) return true
      return (
        emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q)
      )
    })
  }, [employees, search, roleFilter])

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 pb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "ALL")}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground self-center sm:ml-auto">
          {filtered.length} of {employees.length} employees
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email (Login ID)</TableHead>
            <TableHead>Role / Access Level</TableHead>
            <TableHead className="text-right">Transactions Processed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No employees match your search / filter.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.email}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                      emp.role === "SUPER_ADMIN"
                        ? "bg-purple-100 text-purple-800"
                        : emp.role === "MANAGER"
                        ? "bg-blue-100 text-blue-800"
                        : emp.role === "DATA_ENTRY"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {emp.role}
                  </span>
                </TableCell>
                <TableCell className="text-right">{emp.orderCount}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  )
}
