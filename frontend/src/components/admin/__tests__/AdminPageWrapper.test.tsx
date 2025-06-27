import { render, screen } from '@testing-library/react';
import AdminPageWrapper, { AdminPageHeader, AdminPageContent } from '../AdminPageWrapper';

describe('AdminPageWrapper', () => {
  it('renders children correctly', () => {
    render(
      <AdminPageWrapper>
        <div>Test content</div>
      </AdminPageWrapper>
    );
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies correct spacing classes', () => {
    render(
      <AdminPageWrapper spacing="tight" testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).toHaveClass('space-y-4');
  });

  it('applies correct max width classes', () => {
    render(
      <AdminPageWrapper maxWidth="7xl" testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).toHaveClass('max-w-7xl', 'mx-auto');
  });

  it('applies animation class by default', () => {
    render(
      <AdminPageWrapper testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).toHaveClass('animate-fade-in-up');
  });

  it('can disable animation', () => {
    render(
      <AdminPageWrapper animate={false} testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).not.toHaveClass('animate-fade-in-up');
  });

  it('has proper accessibility attributes', () => {
    render(
      <AdminPageWrapper testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).toHaveAttribute('role', 'main');
    expect(wrapper).toHaveAttribute('aria-label', 'Admin page content');
  });

  it('applies custom className', () => {
    render(
      <AdminPageWrapper className="custom-class" testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).toHaveClass('custom-class');
  });
});

describe('AdminPageHeader', () => {
  it('renders header content correctly', () => {
    render(
      <AdminPageHeader>
        <h1>Page Title</h1>
      </AdminPageHeader>
    );
    
    expect(screen.getByText('Page Title')).toBeInTheDocument();
  });

  it('applies admin-page-header class', () => {
    render(
      <AdminPageHeader className="test-header">
        <h1>Title</h1>
      </AdminPageHeader>
    );
    
    const header = screen.getByText('Title').parentElement;
    expect(header).toHaveClass('admin-page-header');
  });
});

describe('AdminPageContent', () => {
  it('renders content correctly', () => {
    render(
      <AdminPageContent>
        <div>Page content</div>
      </AdminPageContent>
    );
    
    expect(screen.getByText('Page content')).toBeInTheDocument();
  });

  it('applies admin-page-content class', () => {
    render(
      <AdminPageContent className="test-content">
        <div>Content</div>
      </AdminPageContent>
    );
    
    const content = screen.getByText('Content').parentElement;
    expect(content).toHaveClass('admin-page-content');
  });
});

describe('Spacing configurations', () => {
  it('applies tight spacing correctly', () => {
    render(
      <AdminPageWrapper spacing="tight" testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).toHaveClass('space-y-4');
  });

  it('applies normal spacing correctly', () => {
    render(
      <AdminPageWrapper spacing="normal" testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).toHaveClass('space-y-6');
  });

  it('applies loose spacing correctly', () => {
    render(
      <AdminPageWrapper spacing="loose" testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).toHaveClass('space-y-8');
  });
});

describe('Max width configurations', () => {
  const maxWidthTests = [
    { maxWidth: 'sm', expectedClass: 'max-w-sm' },
    { maxWidth: 'md', expectedClass: 'max-w-md' },
    { maxWidth: 'lg', expectedClass: 'max-w-lg' },
    { maxWidth: 'xl', expectedClass: 'max-w-xl' },
    { maxWidth: '2xl', expectedClass: 'max-w-2xl' },
    { maxWidth: '3xl', expectedClass: 'max-w-3xl' },
    { maxWidth: '4xl', expectedClass: 'max-w-4xl' },
    { maxWidth: '5xl', expectedClass: 'max-w-5xl' },
    { maxWidth: '6xl', expectedClass: 'max-w-6xl' },
    { maxWidth: '7xl', expectedClass: 'max-w-7xl' },
  ] as const;

  maxWidthTests.forEach(({ maxWidth, expectedClass }) => {
    it(`applies ${maxWidth} max width correctly`, () => {
      render(
        <AdminPageWrapper maxWidth={maxWidth} testId="test-wrapper">
          <div>Content</div>
        </AdminPageWrapper>
      );
      
      const wrapper = screen.getByTestId('test-wrapper');
      expect(wrapper).toHaveClass(expectedClass, 'mx-auto');
    });
  });

  it('does not apply max width classes when maxWidth is none', () => {
    render(
      <AdminPageWrapper maxWidth="none" testId="test-wrapper">
        <div>Content</div>
      </AdminPageWrapper>
    );
    
    const wrapper = screen.getByTestId('test-wrapper');
    expect(wrapper).not.toHaveClass('mx-auto');
    expect(wrapper.className).not.toMatch(/max-w-/);
  });
});
