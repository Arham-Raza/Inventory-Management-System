import { getAllEmployees } from "@/actions/employees"
import { EmployeesTable } from "@/components/employees/EmployeesTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHelp } from "@/components/layout/PageHelp"

export default async function EmployeesPage() {
  const employees = await getAllEmployees()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Staff &amp; Roles</h1>
            <PageHelp title="Staff & Roles">
              <p>Every login account in the system and what they&apos;re allowed to touch.</p>
              <ul>
                <li><strong>SUPER_ADMIN</strong> — full access, including this page, Accounting, Discounts, and Component Prices.</li>
                <li><strong>MANAGER</strong> — everything except Accounting, Discounts, Component Prices, and this Staff page.</li>
                <li><strong>DATA_ENTRY</strong> — locked to the Receive Stock page only.</li>
                <li><strong>CASHIER</strong> — locked to the POS terminal only.</li>
                <li>Only a SUPER_ADMIN can see this page at all.</li>
              </ul>
            </PageHelp>
          </div>
          <p className="text-muted-foreground">Manage employee accounts and their system access levels.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <EmployeesTable
            employees={employees.map((emp) => ({
              id: emp.id,
              name: emp.name,
              email: emp.email,
              role: emp.role,
              orderCount: emp._count.orders,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
