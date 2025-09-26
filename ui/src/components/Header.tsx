import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export const Header: React.FC = () => (
  <header className="app-header">
    <div className="brand"><Link to="/">yaml-guard</Link></div>
    <nav aria-label="Main navigation">
      <NavLink to="/" end>Validate</NavLink>
      <NavLink to="/policies">Policies</NavLink>
      <a href="https://github.com/tripathideepak89/yaml-guard" target="_blank" rel="noopener noreferrer">GitHub</a>
    </nav>
  </header>
);
