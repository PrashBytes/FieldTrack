import { describe, it, expect } from 'vitest';

export function calculateTotalHours(checkIn?: string | null, checkOut?: string | null): string {
  if (!checkIn) return '—';
  if (!checkOut) return 'In Progress';
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diffMs = end - start;
  if (diffMs <= 0) return '0.00 hrs';
  const hrs = diffMs / (1000 * 60 * 60);
  return `${hrs.toFixed(2)} hrs`;
}

export function formatAttendanceCsv(
  records: Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    department: string;
    checkInTime: string;
    checkOutTime: string | null;
    status: string;
  }>
): string {
  const headers = [
    'Session ID',
    'Employee Name',
    'Employee Code',
    'Department',
    'Check-In Time',
    'Check-Out Time',
    'Total Hours',
    'Status',
  ];

  const rows = records.map((r) => [
    r.id,
    r.employeeName,
    r.employeeCode,
    r.department,
    r.checkInTime,
    r.checkOutTime || 'In Progress',
    calculateTotalHours(r.checkInTime, r.checkOutTime),
    r.status,
  ]);

  return [
    headers.join(','),
    ...rows.map((row) =>
      row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');
}

describe('Attendance Utilities & CSV Exporter', () => {
  it('correctly calculates total hours for completed shifts', () => {
    const checkIn = '2026-10-13T09:00:00.000Z';
    const checkOut = '2026-10-13T17:30:00.000Z'; // 8.5 hours
    const result = calculateTotalHours(checkIn, checkOut);
    expect(result).toBe('8.50 hrs');
  });

  it('reports "In Progress" when check-out time is missing', () => {
    const checkIn = '2026-10-13T09:00:00.000Z';
    const result = calculateTotalHours(checkIn, null);
    expect(result).toBe('In Progress');
  });

  it('handles negative or invalid interval gracefully', () => {
    const checkIn = '2026-10-13T17:00:00.000Z';
    const checkOut = '2026-10-13T09:00:00.000Z';
    const result = calculateTotalHours(checkIn, checkOut);
    expect(result).toBe('0.00 hrs');
  });

  it('generates valid CSV format with escaped quotes', () => {
    const mockRecords = [
      {
        id: 'sess-01',
        employeeName: 'Sarah Connor',
        employeeCode: 'EMP-001',
        department: 'Field Dispatch',
        checkInTime: '2026-10-13T08:00:00.000Z',
        checkOutTime: '2026-10-13T16:00:00.000Z',
        status: 'COMPLETED',
      },
      {
        id: 'sess-02',
        employeeName: 'John "Rebel" Doe',
        employeeCode: 'EMP-002',
        department: 'Operations',
        checkInTime: '2026-10-13T09:00:00.000Z',
        checkOutTime: null,
        status: 'ACTIVE',
      },
    ];

    const csv = formatAttendanceCsv(mockRecords);
    expect(csv).toContain('Session ID,Employee Name,Employee Code');
    expect(csv).toContain('"Sarah Connor"');
    expect(csv).toContain('"8.00 hrs"');
    // Verify quote escaping
    expect(csv).toContain('"John ""Rebel"" Doe"');
    expect(csv).toContain('"In Progress"');
  });
});
