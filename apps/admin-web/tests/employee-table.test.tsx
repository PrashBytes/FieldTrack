import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

interface EmployeeItem {
  id: string;
  employee_code?: string;
  name: string;
  department: string;
  status: string;
}

function EmployeeFilterView({ employees }: { employees: EmployeeItem[] }) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('ALL');

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(search.toLowerCase())) ||
      emp.department.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || emp.status.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <input
        aria-label="Search employees"
        placeholder="Search employees..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <select
        aria-label="Filter status"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
      >
        <option value="ALL">All</option>
        <option value="ACTIVE">Active</option>
        <option value="ON_LEAVE">On Leave</option>
      </select>

      <div data-testid="count">{filtered.length} employees</div>
      <ul>
        {filtered.map((emp) => (
          <li key={emp.id} data-testid="employee-row">
            {emp.name} - {emp.employee_code} ({emp.status})
          </li>
        ))}
      </ul>
    </div>
  );
}

describe('Employee Table Search & Filter Component', () => {
  const mockEmployees: EmployeeItem[] = [
    { id: '1', employee_code: 'EMP-101', name: 'Sarah Connor', department: 'Executive', status: 'ACTIVE' },
    { id: '2', employee_code: 'EMP-102', name: 'John Doe', department: 'Fleet', status: 'ACTIVE' },
    { id: '3', employee_code: 'EMP-103', name: 'Alex Vance', department: 'Warehouse', status: 'ON_LEAVE' },
  ];

  it('renders all employees by default', () => {
    render(<EmployeeFilterView employees={mockEmployees} />);
    expect(screen.getByTestId('count')).toHaveTextContent('3 employees');
    expect(screen.getAllByTestId('employee-row')).toHaveLength(3);
  });

  it('filters employees by name search query', () => {
    render(<EmployeeFilterView employees={mockEmployees} />);
    const searchInput = screen.getByLabelText('Search employees');
    fireEvent.change(searchInput, { target: { value: 'Alex' } });

    expect(screen.getByTestId('count')).toHaveTextContent('1 employees');
    expect(screen.getByText(/Alex Vance/i)).toBeInTheDocument();
    expect(screen.queryByText(/Sarah Connor/i)).not.toBeInTheDocument();
  });

  it('filters employees by code search query', () => {
    render(<EmployeeFilterView employees={mockEmployees} />);
    const searchInput = screen.getByLabelText('Search employees');
    fireEvent.change(searchInput, { target: { value: 'EMP-101' } });

    expect(screen.getByTestId('count')).toHaveTextContent('1 employees');
    expect(screen.getByText(/Sarah Connor/i)).toBeInTheDocument();
  });

  it('filters employees by status dropdown selection', () => {
    render(<EmployeeFilterView employees={mockEmployees} />);
    const statusSelect = screen.getByLabelText('Filter status');
    fireEvent.change(statusSelect, { target: { value: 'ON_LEAVE' } });

    expect(screen.getByTestId('count')).toHaveTextContent('1 employees');
    expect(screen.getByText(/Alex Vance/i)).toBeInTheDocument();
    expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
  });
});
