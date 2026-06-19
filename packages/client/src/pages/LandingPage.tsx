import React from 'react';
import { useNavigateEvent } from '../hooks/useNavigateEvent';
import { useTranslate } from '@almadar/ui';
import { BookOpen, Target, Zap, Layers, Brain, ArrowRight, Code, Globe, GraduationCap } from 'lucide-react';
import logoWhite from '../assets/kflow-logo-white.svg';

import screenshot1 from '../assets/demo/1-create-learning-path.png';
import screenshot2 from '../assets/demo/2-generating-concepts.png';
import screenshot3 from '../assets/demo/3-concepts-list-page.png';
import screenshot4 from '../assets/demo/4-concept-home-page.png';
import screenshot5 from '../assets/demo/5-concept-detail-page.png';
import screenshot6 from '../assets/demo/6-mindmap-view.png';
import screenshot7 from '../assets/demo/7-final-review.png';

const LandingPage: React.FC = () => {
  const navigate = useNavigateEvent();
  const { t } = useTranslate();

  const features = [
    {
      icon: Brain,
      title: t('landing.feature.aiPaths.title'),
      description: t('landing.feature.aiPaths.desc'),
    },
    {
      icon: Layers,
      title: t('landing.feature.structured.title'),
      description: t('landing.feature.structured.desc'),
    },
    {
      icon: BookOpen,
      title: t('landing.feature.lessons.title'),
      description: t('landing.feature.lessons.desc'),
    },
    {
      icon: Target,
      title: t('landing.feature.goalFocused.title'),
      description: t('landing.feature.goalFocused.desc'),
    },
    {
      icon: Code,
      title: t('landing.feature.visualizations.title'),
      description: t('landing.feature.visualizations.desc'),
    },
    {
      icon: Zap,
      title: t('landing.feature.realTime.title'),
      description: t('landing.feature.realTime.desc'),
    },
  ];

  const useCases = [
    { icon: Globe, text: t('landing.useCase.languages') },
    { icon: Code, text: t('landing.useCase.programming') },
    { icon: GraduationCap, text: t('landing.useCase.subjects') },
    { icon: Target, text: t('landing.useCase.projects') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-background to-purple-50">
      {/* Header */}
      <header className="border-b border-border bg-card backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoWhite} alt="KFlow logo" className="h-8 w-auto brightness-0 invert" />
              <h1 className="text-2xl font-bold text-foreground">KFlow</h1>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {t('landing.getStarted')}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
            {t('landing.hero.headline')}
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t('landing.hero.subheadline')}
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            {t('landing.hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate('/login')}
              className="group px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              {t('landing.hero.cta')}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                const featuresSection = document.getElementById('features');
                featuresSection?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-4 border-2 border-border text-foreground rounded-lg font-semibold text-lg hover:border-primary hover:text-primary transition-all duration-200"
            >
              {t('landing.hero.learnMore')}
            </button>
          </div>
        </div>
      </section>

      {/* Screenshots Section -->
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('landing.screenshots.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('landing.screenshots.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-card rounded-xl border border-border p-4 shadow-lg hover:shadow-xl transition-shadow">
            <img 
              src={screenshot1} 
              alt="Create learning path" 
              className="w-full h-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {t('landing.screenshot.createPath')}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-lg hover:shadow-xl transition-shadow">
            <img 
              src={screenshot2} 
              alt="AI generating concepts" 
              className="w-full h-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {t('landing.screenshot.aiGenerate')}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-lg hover:shadow-xl transition-shadow">
            <img 
              src={screenshot3} 
              alt="Concepts list view" 
              className="w-full h-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {t('landing.screenshot.exploreLevels')}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-lg hover:shadow-xl transition-shadow">
            <img 
              src={screenshot5} 
              alt="Concept detail with lesson" 
              className="w-full h-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {t('landing.screenshot.lessons')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-card rounded-xl border border-border p-4 shadow-lg hover:shadow-xl transition-shadow">
            <img 
              src={screenshot6} 
              alt="Mindmap visualization" 
              className="w-full h-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {t('landing.screenshot.mindmap')}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-lg hover:shadow-xl transition-shadow">
            <img 
              src={screenshot7} 
              alt="Final review" 
              className="w-full h-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {t('landing.screenshot.reviews')}
            </p>
          </div>
          <div className="bg-card rounded-xl border border-border p-4 shadow-lg hover:shadow-xl transition-shadow">
            <img 
              src={screenshot4} 
              alt="Concept home page" 
              className="w-full h-auto rounded-lg"
            />
            <p className="text-center text-sm text-muted-foreground mt-3">
              {t('landing.screenshot.navigate')}
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('landing.features.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('landing.features.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 bg-card rounded-xl border border-border hover:border-primary transition-all duration-200 hover:shadow-lg"
            >
              <div className="w-12 h-12 bg-surface rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                <feature.icon className="w-6 h-6 text-primary group-hover:text-primary-foreground transition-colors" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 bg-card rounded-3xl my-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('landing.howItWorks.title')}
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('landing.howItWorks.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { step: '1', title: t('landing.step.enterTopic.title'), description: t('landing.step.enterTopic.desc') },
            { step: '2', title: t('landing.step.aiPath.title'), description: t('landing.step.aiPath.desc') },
            { step: '3', title: t('landing.step.explore.title'), description: t('landing.step.explore.desc') },
            { step: '4', title: t('landing.step.practice.title'), description: t('landing.step.practice.desc') },
          ].map((item, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t('landing.useCases.title')}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {useCases.map((useCase, index) => (
            <div
              key={index}
              className="flex flex-col items-center p-6 bg-card rounded-xl border border-border hover:border-primary transition-all duration-200"
            >
              <useCase.icon className="w-10 h-10 text-primary mb-3" />
              <p className="text-foreground font-medium text-center">
                {useCase.text}
              </p>
            </div>
          ))}
        </div>
      </section>


      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            {t('landing.cta.title')}
          </h2>
          <p className="text-xl md:text-2xl mb-8 text-indigo-100">
            {t('landing.cta.description')}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="group px-8 py-4 bg-card text-primary rounded-lg font-semibold text-lg hover:bg-surface-hover transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
          >
            {t('landing.cta.button')}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img src={logoWhite} alt="KFlow logo" className="h-6 w-auto brightness-0 invert" />
              <span className="text-muted-foreground">{t('landing.footer.copyright')}</span>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:text-primary font-medium transition-colors"
            >
              {t('nav.signIn')}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

