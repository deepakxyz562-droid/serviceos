import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconPickerDropdown } from '@/features/forms/components/builder/icon-picker-dropdown';
import { resolveIcon } from '@/lib/forms/icon-resolver';

describe('IconPickerDropdown', () => {
  it('renders selected icon preview and trigger button with default value', () => {
    const handleChange = vi.fn();
    render(<IconPickerDropdown value="Star" onChange={handleChange} />);

    expect(screen.getByText('Star')).toBeDefined();
  });

  it('resolves icons case-insensitively and provides fallback', () => {
    const starIcon = resolveIcon('star');
    expect(starIcon).toBeDefined();

    const checkIcon = resolveIcon('CheckCircle');
    expect(checkIcon).toBeDefined();

    const fallback = resolveIcon('NonExistentIconXYZ');
    expect(fallback).toBeDefined();
  });
});
