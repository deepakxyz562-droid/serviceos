import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DataTable, type Column } from '@/components/ui/data-table'

interface TestRow {
  id: string
  name: string
  status: string
}

const testData: TestRow[] = [
  { id: '1', name: 'Alice', status: 'active' },
  { id: '2', name: 'Bob', status: 'pending' },
  { id: '3', name: 'Charlie', status: 'active' },
]

const columns: Column<TestRow>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name, sortField: 'name' },
  { key: 'status', header: 'Status', render: (r) => r.status },
]

describe('DataTable', () => {
  it('renders data rows', () => {
    render(<DataTable columns={columns} data={testData} rowKey={(r) => r.id} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading=true', () => {
    const { container } = render(
      <DataTable columns={columns} data={[]} rowKey={(r) => r.id} loading />
    )

    // Skeletons render as elements with the 'animate-pulse' class
    const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
    expect(skeletons.length).toBeGreaterThan(0)
    // Headers should still be visible
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('shows error state with retry button when error is set', () => {
    const onRetry = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        error="Network error"
        onRetry={onRetry}
      />
    )

    expect(screen.getByText('Network error')).toBeInTheDocument()
    const retryButton = screen.getByText('Retry')
    fireEvent.click(retryButton)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows empty state when data is empty', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        emptyMessage="No items found"
      />
    )

    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('calls onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />
    )

    fireEvent.click(screen.getByText('Alice'))
    expect(onRowClick).toHaveBeenCalledWith(testData[0])
  })

  it('sorts data when a sortable column header is clicked', () => {
    render(<DataTable columns={columns} data={testData} rowKey={(r) => r.id} />)

    // Initial order: Alice, Bob, Charlie
    const rows = () => screen.getAllByRole('row')
    expect(rows()[1]).toHaveTextContent('Alice')

    // Click "Name" header to sort ascending (already asc, but toggles the icon)
    fireEvent.click(screen.getByText('Name'))

    // Click again to sort descending
    fireEvent.click(screen.getByText('Name'))

    // Now should be: Charlie, Bob, Alice
    expect(rows()[1]).toHaveTextContent('Charlie')
    expect(rows()[3]).toHaveTextContent('Alice')
  })

  it('does not show sort icon for non-sortable columns', () => {
    render(<DataTable columns={columns} data={testData} rowKey={(r) => r.id} />)

    // "Status" column has no sortField, so clicking it should not sort
    const statusHeader = screen.getByText('Status')
    fireEvent.click(statusHeader)
    // No error should be thrown, and the data order should stay the same
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Alice')
  })

  it('hides mobile-hidden columns on small screens', () => {
    const columnsWithHidden: Column<TestRow>[] = [
      { key: 'name', header: 'Name', render: (r) => r.name },
      { key: 'status', header: 'Status', render: (r) => r.status, hideOnMobile: true },
    ]

    render(
      <DataTable columns={columnsWithHidden} data={testData} rowKey={(r) => r.id} />
    )

    // The Status header should have the 'hidden' class (hidden on mobile)
    const statusHeader = screen.getByText('Status').closest('th')
    expect(statusHeader?.className).toContain('hidden')
    expect(statusHeader?.className).toContain('sm:table-cell')
  })
})

describe('DataTable virtualized mode', () => {
  it('renders scroll container with maxHeight in virtualized mode', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        data={testData}
        rowKey={(r) => r.id}
        virtualized
        maxHeight={400}
      />
    )

    // The scroll container should have the maxHeight style
    const scrollContainer = container.querySelector('[style*="max-height"]')
    expect(scrollContainer).toBeTruthy()
    // Headers should still be visible (sticky)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('renders with large dataset in virtualized mode without crashing', () => {
    const largeData: TestRow[] = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
      status: 'active',
    }))

    // Should not crash with 1000 rows — the virtualizer handles it
    const { container } = render(
      <DataTable
        columns={columns}
        data={largeData}
        rowKey={(r) => r.id}
        virtualized
        maxHeight={600}
      />
    )

    // The component should render without throwing
    expect(container.querySelector('[style*="max-height"]')).toBeTruthy()
    // Headers visible
    expect(screen.getByText('Name')).toBeInTheDocument()
  })
})
