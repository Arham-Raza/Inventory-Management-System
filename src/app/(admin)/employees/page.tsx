import { getAllEmployees } from "@/actions/employees"
import { EmployeesTable } from "@/components/employees/EmployeesTable"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function EmployeesPage() {
  const employees = await getAllEmployees()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff & Roles</h1>
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
