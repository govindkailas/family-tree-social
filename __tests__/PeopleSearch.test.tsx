import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PeopleSearch from '@/components/PeopleSearch'

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        or: jest.fn(() => ({
          limit: jest.fn(() => ({
            data: [
              { id: '1', first_name: 'John', last_name: 'Doe', nick_name: 'Johnny' },
              { id: '2', first_name: 'Jane', last_name: 'Smith', nick_name: null }
            ]
          }))
        }))
      }))
    }))
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

describe('PeopleSearch', () => {
  const mockFamilyId = 'family-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input', () => {
    render(<PeopleSearch familyId={mockFamilyId} />)

    const input = screen.getByPlaceholderText('Search name or nickname...')
    expect(input).toBeInTheDocument()
  })

  it('does not search with less than 2 characters', async () => {
    render(<PeopleSearch familyId={mockFamilyId} />)

    const input = screen.getByPlaceholderText('Search name or nickname...')
    await userEvent.type(input, 'J')

    // Wait for debounce
    await waitFor(() => {
      expect(mockSupabase.from).not.toHaveBeenCalled()
    }, { timeout: 300 })
  })

  it('searches with 2 or more characters', async () => {
    render(<PeopleSearch familyId={mockFamilyId} />)

    const input = screen.getByPlaceholderText('Search name or nickname...')
    await userEvent.type(input, 'Jo')

    // Wait for debounce and API call
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('people')
    }, { timeout: 500 })
  })

  it('displays search results', async () => {
    render(<PeopleSearch familyId={mockFamilyId} />)

    const input = screen.getByPlaceholderText('Search name or nickname...')
    await userEvent.type(input, 'John')

    await waitFor(() => {
      expect(screen.getByText('John Doe (Johnny)')).toBeInTheDocument()
      expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    })
  })

  it('links to person detail pages', async () => {
    render(<PeopleSearch familyId={mockFamilyId} />)

    const input = screen.getByPlaceholderText('Search name or nickname...')
    await userEvent.type(input, 'John')

    await waitFor(() => {
      const links = screen.getAllByRole('link')
      expect(links[0]).toHaveAttribute('href', '/dashboard/people/1')
      expect(links[1]).toHaveAttribute('href', '/dashboard/people/2')
    })
  })

  it('clears results when query is cleared', async () => {
    render(<PeopleSearch familyId={mockFamilyId} />)

    const input = screen.getByPlaceholderText('Search name or nickname...')
    await userEvent.type(input, 'John')

    await waitFor(() => {
      expect(screen.getByText('John Doe (Johnny)')).toBeInTheDocument()
    })

    await userEvent.clear(input)

    await waitFor(() => {
      expect(screen.queryByText('John Doe (Johnny)')).not.toBeInTheDocument()
    }, { timeout: 300 })
  })
})