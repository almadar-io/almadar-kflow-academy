# Authentication Feature

This feature provides Firebase authentication for the KFlow application using `react-firebase-hooks` and Google authentication.

## Features

- Google Sign-In
- Email/Password Sign-In and Sign-Up
- Protected Routes
- User Profile Management
- Redux State Management
- TypeScript Support

## Setup

1. Create a `.env` file in the root directory with your Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

2. Enable Google Authentication in your Firebase Console:
   - Go to Authentication > Sign-in method
   - Enable Google provider
   - Add your authorized domains

## Components

### Login
- Handles both Google and email/password authentication
- Toggle between sign-in and sign-up modes
- Form validation and error handling

### UserProfile
- Displays user information (name, email, photo)
- Sign out functionality
- Responsive design

### ProtectedRoute
- Guards routes that require authentication
- Redirects unauthenticated users to login
- Shows loading state during authentication check

## Hooks

### useAuth
- Custom hook that integrates `react-firebase-hooks` with Redux
- Automatically syncs authentication state
- Provides loading and error states

## Context

### AuthContext
- Provides authentication methods throughout the app
- Manages user state and authentication flow
- Integrates with Redux for state management

## Redux Integration

The auth feature includes a Redux slice (`authSlice.ts`) that manages:
- User state
- Loading states
- Error handling
- Authentication actions

## Usage

### Basic Authentication Check
```tsx
import { useAuthContext } from '../features/auth';

const MyComponent = () => {
  const { user, loading } = useAuthContext();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please sign in</div>;
  
  return <div>Welcome, {user.displayName}!</div>;
};
```

### Protected Routes
```tsx
import { ProtectedRoute } from '../features/auth';

<Route 
  path="/protected" 
  element={
    <ProtectedRoute>
      <ProtectedComponent />
    </ProtectedRoute>
  } 
/>
```

### Sign In/Out
```tsx
import { useAuthContext } from '../features/auth';

const AuthButtons = () => {
  const { signInWithGoogle, signOut } = useAuthContext();
  
  return (
    <div>
      <button onClick={signInWithGoogle}>Sign in with Google</button>
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
};
```

## File Structure

```
src/features/auth/
├── components/
│   ├── Login.tsx
│   ├── UserProfile.tsx
│   ├── ProtectedRoute.tsx
│   └── index.ts
├── hooks/
│   ├── useAuth.ts
│   └── index.ts
├── AuthContext.tsx
├── authService.ts
├── authSlice.ts
├── types.ts
├── index.ts
└── README.md
```

## Dependencies

- `firebase` - Firebase SDK
- `react-firebase-hooks` - React hooks for Firebase
- `@reduxjs/toolkit` - Redux state management
- `react-redux` - React Redux bindings
