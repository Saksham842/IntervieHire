'use client';
import React from 'react';
import { Navbar } from './Navbar';
import { HeroSection } from './HeroSection';
import { TransitionSection } from './TransitionSection';
import { SolutionSection } from './SolutionSection';
import {
  ExplainerVideoSection,
  CalculatorSection,
  SolvingForSection,
  ImpactSection,
  ManifestoSection,
  FAQSection,
  AboutFounderSection,
  BlogsSection,
  ContactSection,
  FooterCTA,
} from './Sections';
import { PageTransition } from './PageTransition';

export default function LandingApp() {
  return (
    <div className="ih-landing">
      <Navbar />
      <HeroSection />
      <TransitionSection />
      <SolutionSection />
      <ExplainerVideoSection />
      <CalculatorSection />
      <SolvingForSection />
      <ImpactSection />
      <ManifestoSection />
      <FAQSection />
      <AboutFounderSection />
      <BlogsSection />
      <ContactSection />
      <FooterCTA />
      <PageTransition />
    </div>
  );
}
