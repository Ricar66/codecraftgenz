// src/pages/HomePage/HomePage.jsx
import React from 'react';

import FeaturesSection from '../../components/FeaturesSection/FeaturesSection';
import Hero from '../../components/Hero/Hero';
import Navbar from '../../components/Navbar/Navbar';

const HomePage = () => {
  return (
    <div>
      <Navbar />
      <Hero />
      <FeaturesSection />
    </div>
  );
};

export default HomePage;