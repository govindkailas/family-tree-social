import { render, screen } from '@testing-library/react'
import PersonNode from '@/components/PersonNode'

// Mock React Flow components
jest.mock('reactflow', () => ({
  Handle: ({ children, ...props }: any) => <div data-testid="handle" {...props}>{children}</div>,
  Position: {
    Top: 'top',
    Bottom: 'bottom',
    Left: 'left',
    Right: 'right'
  }
}))

// Mock Next.js Link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <div data-testid="link" data-href={href} {...props}>
      {children}
    </div>
  )
}))

// Mock avatar utility
jest.mock('@/lib/avatar', () => ({
  getAvatarUrl: jest.fn()
}))

describe('PersonNode', () => {
  const mockData = {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    nick_name: 'Johnny',
    birth_date: '1990-01-01',
    avatar_url: null,
    social_links: [
      { platform: 'twitter', url: 'https://twitter.com/johndoe' }
    ]
  }

  beforeEach(() => {
    const { getAvatarUrl } = require('@/lib/avatar')
    getAvatarUrl.mockReturnValue(null)
  })

  it('renders person name and nickname', () => {
    render(<PersonNode data={mockData} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    // Check that nickname is rendered (may be encoded as HTML entities)
    const nicknameElement = screen.getByText(/Johnny/)
    expect(nicknameElement).toBeInTheDocument()
  })

  it('renders birth year', () => {
    render(<PersonNode data={mockData} />)

    expect(screen.getByText('b. 1990')).toBeInTheDocument()
  })

  it('renders initials when no avatar', () => {
    render(<PersonNode data={mockData} />)

    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('renders social links', () => {
    render(<PersonNode data={mockData} />)

    const socialLink = screen.getByText('x')
    expect(socialLink).toBeInTheDocument()
    expect(socialLink).toHaveAttribute('href', 'https://twitter.com/johndoe')
  })

  it('links to person detail page', () => {
    render(<PersonNode data={mockData} />)

    const link = screen.getByTestId('link')
    expect(link).toHaveAttribute('data-href', '/dashboard/people/1')
  })

  it('handles missing data gracefully', () => {
    const minimalData = {
      id: '2',
      first_name: 'Jane'
    }

    render(<PersonNode data={minimalData} />)

    expect(screen.getByText('Jane')).toBeInTheDocument()
    expect(screen.getByText('J')).toBeInTheDocument()
  })
})