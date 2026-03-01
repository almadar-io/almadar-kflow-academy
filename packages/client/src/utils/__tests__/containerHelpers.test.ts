/**
 * Tests for Generic Container Helpers
 */

import {
  transformListToCardProps,
  createErrorState,
  createLoadingState,
  createEmptyState,
} from '../containerHelpers';

describe('Generic Container Helpers', () => {
  describe('transformListToCardProps', () => {
    it('should transform list to card props', () => {
      const items = [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }];
      const mapper = (item: { id: string; name: string }) => ({
        id: item.id,
        title: item.name,
      });

      const result = transformListToCardProps(items, mapper);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: '1', title: 'Item 1' });
      expect(result[1]).toMatchObject({ id: '2', title: 'Item 2' });
    });

    it('should handle empty list', () => {
      const items: unknown[] = [];
      const mapper = () => ({ id: '1' });

      const result = transformListToCardProps(items, mapper);

      expect(result).toHaveLength(0);
    });
  });

  describe('createErrorState', () => {
    it('should create error state when error exists', () => {
      const result = createErrorState('Something went wrong');

      expect(result).toMatchObject({
        message: 'Something went wrong',
        variant: 'error',
      });
    });

    it('should return null when no error', () => {
      const result = createErrorState(null);

      expect(result).toBeNull();
    });

    it('should support different variants', () => {
      const result = createErrorState('Warning message', 'warning');

      expect(result).toMatchObject({
        message: 'Warning message',
        variant: 'warning',
      });
    });
  });

  describe('createLoadingState', () => {
    it('should create loading state when loading', () => {
      const result = createLoadingState(true);

      expect(result).toMatchObject({
        isLoading: true,
        showSpinner: true,
      });
    });

    it('should create non-loading state when not loading', () => {
      const result = createLoadingState(false);

      expect(result).toMatchObject({
        isLoading: false,
        showSpinner: false,
      });
    });
  });

  describe('createEmptyState', () => {
    it('should create empty state config when list is empty', () => {
      const items: unknown[] = [];
      const config = {
        title: 'No items',
        description: 'Create your first item',
        actionLabel: 'Create Item',
        onAction: () => {},
      };

      const result = createEmptyState(items, config);

      expect(result).toMatchObject(config);
    });

    it('should return null when list has items', () => {
      const items = [{ id: '1' }];
      const config = {
        title: 'No items',
      };

      const result = createEmptyState(items, config);

      expect(result).toBeNull();
    });

    it('should handle optional config fields', () => {
      const items: unknown[] = [];
      const config = {
        title: 'No items',
      };

      const result = createEmptyState(items, config);

      expect(result).toMatchObject({
        title: 'No items',
        description: undefined,
        actionLabel: undefined,
        onAction: undefined,
      });
    });
  });
});
