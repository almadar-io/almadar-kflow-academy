/**
 * Type declarations for Storybook packages
 * 
 * TypeScript 4.9.5 with moduleResolution: "node" cannot resolve types from packages
 * that use the 'exports' field. This declaration file provides the types directly.
 */

/// <reference types="@storybook/react-webpack5/dist/index" />

declare module '@storybook/react-webpack5' {
  // Import and re-export the actual types from the dist file
  export type {
    Meta,
    StoryObj,
    StoryFn,
    StoryContext,
    ReactRenderer,
    ReactMeta,
    ReactPreview,
    ReactStory,
    ReactTypes,
    Decorator,
    Loader,
    Preview,
    StorybookConfig,
  } from '@storybook/react-webpack5/dist/index';
}

