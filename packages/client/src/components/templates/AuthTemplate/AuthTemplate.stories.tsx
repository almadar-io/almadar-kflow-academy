import type { Meta, StoryObj } from '@storybook/react-webpack5';
import { AuthTemplate } from './AuthTemplate';

const meta: Meta<typeof AuthTemplate> = {
  title: 'Templates/AuthTemplate',
  component: AuthTemplate,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AuthTemplate>;

export const Login: Story = {
  args: {
    variant: 'login',
    onSubmit: (data: { email: string; password: string }) => console.log('Login:', data),
    onForgotPassword: () => console.log('Forgot password'),
    onSignUp: () => console.log('Sign up'),
    onSocialLogin: (provider: string) => console.log('Social login:', provider),
  },
};

export const SignUp: Story = {
  args: {
    variant: 'signup',
    onSubmit: (data: { name: string; email: string; password: string; confirmPassword: string }) => console.log('Sign up:', data),
    onSignIn: () => console.log('Sign in'),
    onSocialLogin: (provider: string) => console.log('Social login:', provider),
  },
};

export const ForgotPassword: Story = {
  args: {
    variant: 'forgot-password',
    onSubmit: (data: { email: string }) => console.log('Forgot password:', data),
    onBack: () => console.log('Back'),
    onSignIn: () => console.log('Sign in'),
  },
};

export const ResetPassword: Story = {
  args: {
    variant: 'reset-password',
    onSubmit: (data: { password: string; confirmPassword: string }) => console.log('Reset password:', data),
    onBack: () => console.log('Back'),
    onSignIn: () => console.log('Sign in'),
  },
};

export const VerifyEmail: Story = {
  args: {
    variant: 'verify-email',
    email: 'user@example.com',
    onResendVerification: () => console.log('Resend verification'),
    onSignIn: () => console.log('Sign in'),
  },
};

export const WithError: Story = {
  args: {
    variant: 'login',
    error: 'Invalid email or password. Please try again.',
    onSubmit: (data: { email: string; password: string }) => console.log('Login:', data),
    onForgotPassword: () => console.log('Forgot password'),
    onSignUp: () => console.log('Sign up'),
  },
};

export const WithSuccess: Story = {
  args: {
    variant: 'forgot-password',
    success: 'Password reset link sent! Check your email.',
    onSubmit: (data: { email: string }) => console.log('Forgot password:', data),
    onSignIn: () => console.log('Sign in'),
  },
};

export const Loading: Story = {
  args: {
    variant: 'login',
    loading: true,
    onSubmit: (data: { email: string; password: string }) => console.log('Login:', data),
  },
};

export const NoSocialLogin: Story = {
  args: {
    variant: 'login',
    showSocialLogin: false,
    onSubmit: (data: { email: string; password: string }) => console.log('Login:', data),
    onForgotPassword: () => console.log('Forgot password'),
    onSignUp: () => console.log('Sign up'),
  },
};

export const CustomLogo: Story = {
  args: {
    variant: 'login',
    logo: (
      <div className="flex items-center gap-2">
        <span className="text-3xl">🎓</span>
        <span className="text-2xl font-bold text-indigo-600">LearnHub</span>
      </div>
    ),
    appName: 'LearnHub',
    onSubmit: (data: { email: string; password: string }) => console.log('Login:', data),
  },
};

export const Mobile: Story = {
  args: {
    ...Login.args,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

