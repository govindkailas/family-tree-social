import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateFamily from '@/components/CreateFamily'

// Mock Next.js router
const mockRouter = {
  refresh: jest.fn(),
  push: jest.fn()
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter
}))

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: jest.fn()
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn()
      }))
    }))
  }))
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabase)
}))

describe('CreateFamily', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null
    })
  })

  it('renders the form correctly', () => {
    render(<CreateFamily />)

    expect(screen.getByText('Welcome to Family Tree')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('e.g. "The Smiths" or "Wright Family"')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create family tree' })).toBeInTheDocument()
  })

  it('shows family name preview when typing', async () => {
    render(<CreateFamily />)

    const input = screen.getByPlaceholderText('e.g. "The Smiths" or "Wright Family"')
    await userEvent.type(input, 'Smith Family')

    expect(screen.getByText('Smith Family Family')).toBeInTheDocument()
  })

  it('disables submit button when family name is empty', () => {
    render(<CreateFamily />)

    const button = screen.getByRole('button', { name: 'Create family tree' })
    expect(button).toBeDisabled()
  })

  it('enables submit button when family name is provided', async () => {
    render(<CreateFamily />)

    const input = screen.getByPlaceholderText('e.g. "The Smiths" or "Wright Family"')
    const button = screen.getByRole('button', { name: 'Create family tree' })

    await userEvent.type(input, 'Test Family')
    expect(button).not.toBeDisabled()
  })

  it('shows loading state during submission', async () => {
    // Mock successful creation
    mockSupabase.from.mockReturnValueOnce({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'family-123' },
            error: null
          }))
        }))
      }))
    }).mockReturnValueOnce({
      insert: jest.fn(() => ({
        error: null
      }))
    })

    render(<CreateFamily />)

    const input = screen.getByPlaceholderText('e.g. "The Smiths" or "Wright Family"')
    const button = screen.getByRole('button', { name: 'Create family tree' })

    await userEvent.type(input, 'Test Family')
    fireEvent.click(button)

    expect(screen.getByText('Creating…')).toBeInTheDocument()
  })

  it('handles authentication error', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: null
    })

    render(<CreateFamily />)

    const input = screen.getByPlaceholderText('e.g. "The Smiths" or "Wright Family"')
    const button = screen.getByRole('button', { name: 'Create family tree' })

    await userEvent.type(input, 'Test Family')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()
    })
  })

  it('handles family creation error', async () => {
    mockSupabase.from.mockReturnValueOnce({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: null,
            error: { message: 'Database error' }
          }))
        }))
      }))
    })

    render(<CreateFamily />)

    const input = screen.getByPlaceholderText('e.g. "The Smiths" or "Wright Family"')
    const button = screen.getByRole('button', { name: 'Create family tree' })

    await userEvent.type(input, 'Test Family')
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeInTheDocument()
    })
  })

  it('refreshes router on successful creation', async () => {
    // Mock successful creation
    mockSupabase.from.mockReturnValueOnce({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({
            data: { id: 'family-123' },
            error: null
          }))
        }))
      }))
    }).mockReturnValueOnce({
      insert: jest.fn(() => ({
        error: null
      }))
    })

    render(<CreateFamily />)

    const input = screen.getByPlaceholderText('e.g. "The Smiths" or "Wright Family"')
    const button = screen.getByRole('button', { name: 'Create family tree' })

    await userEvent.type(input, 'Test Family')
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockRouter.refresh).toHaveBeenCalled()
    })
  })
})