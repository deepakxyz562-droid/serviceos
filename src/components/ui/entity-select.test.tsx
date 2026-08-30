import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EntitySelect } from '@/components/ui/entity-select'

// Mock authFetch to avoid real network calls
vi.mock('@/lib/api', () => ({
  authFetch: vi.fn(),
}))

describe('EntitySelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a search input with placeholder', () => {
    render(
      <EntitySelect
        value={null}
        onChange={() => {}}
        searchFn={async () => []}
        placeholder="Search items…"
      />
    )
    expect(screen.getByPlaceholderText('Search items…')).toBeInTheDocument()
  })

  it('does not search when query is shorter than minChars', async () => {
    const searchFn = vi.fn(async () => [])
    render(<EntitySelect value={null} onChange={() => {}} searchFn={searchFn} minChars={2} />)

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'a' } })

    // Wait past the debounce
    await new Promise((r) => setTimeout(r, 400))
    expect(searchFn).not.toHaveBeenCalled()
  })

  it('calls searchFn after debounce when query >= minChars', async () => {
    const searchFn = vi.fn(async () => [
      { id: '1', label: 'Alice' },
      { id: '2', label: 'Bob' },
    ])
    render(
      <EntitySelect
        value={null}
        onChange={() => {}}
        searchFn={searchFn}
        minChars={2}
        debounceMs={100}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'al' } })

    await waitFor(() => {
      expect(searchFn).toHaveBeenCalledWith('al')
    })
  })

  it('shows search results in dropdown', async () => {
    const searchFn = vi.fn(async () => [
      { id: '1', label: 'Alice', sublabel: '555-0100' },
      { id: '2', label: 'Bob', sublabel: '555-0200' },
    ])
    render(
      <EntitySelect
        value={null}
        onChange={() => {}}
        searchFn={searchFn}
        minChars={2}
        debounceMs={100}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'al' } })

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('calls onChange when a result is selected', async () => {
    const onChange = vi.fn()
    const searchFn = vi.fn(async () => [{ id: '42', label: 'Alice' }])
    render(
      <EntitySelect
        value={null}
        onChange={onChange}
        searchFn={searchFn}
        minChars={2}
        debounceMs={100}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'al' } })

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Alice'))
    expect(onChange).toHaveBeenCalledWith('42')
  })

  it('shows selected option as a chip with clear button', async () => {
    const onChange = vi.fn()
    const searchFn = vi.fn(async () => [{ id: '42', label: 'Alice' }])
    render(
      <EntitySelect
        value={null}
        onChange={onChange}
        searchFn={searchFn}
        minChars={2}
        debounceMs={100}
      />
    )

    // Search and select
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'al' } })

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alice'))

    // Should show as chip
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByLabelText('Clear')).toBeInTheDocument()
  })

  it('calls onChange(null) when clear button is clicked', async () => {
    const onChange = vi.fn()
    const searchFn = vi.fn(async () => [{ id: '42', label: 'Alice' }])
    render(
      <EntitySelect
        value={null}
        onChange={onChange}
        searchFn={searchFn}
        minChars={2}
        debounceMs={100}
      />
    )

    // Select
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'al' } })
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Alice'))

    // Clear
    fireEvent.click(screen.getByLabelText('Clear'))
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows "No results found" when search returns empty', async () => {
    const searchFn = vi.fn(async () => [])
    render(
      <EntitySelect
        value={null}
        onChange={() => {}}
        searchFn={searchFn}
        minChars={2}
        debounceMs={100}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'xyz' } })

    await waitFor(() => {
      expect(screen.getByText(/No results found/)).toBeInTheDocument()
    })
  })

  it('shows "Searching…" while loading', async () => {
    // searchFn that never resolves during the test
    const searchFn = vi.fn(() => new Promise(() => []))
    render(
      <EntitySelect
        value={null}
        onChange={() => {}}
        searchFn={searchFn}
        minChars={2}
        debounceMs={100}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'al' } })

    await waitFor(() => {
      expect(screen.getByText('Searching…')).toBeInTheDocument()
    })
  })
})
