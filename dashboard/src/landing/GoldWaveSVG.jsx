'use client';
import React from 'react';

// GoldWaveSVG.jsx, Reusable animated gold wave decoration
export const GoldWaveSVG = ({ opacity = 1, style = {} }) => (
  <svg
    viewBox="0 0 600 500"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ opacity, ...style }}
    aria-hidden="true"
  >
    {[
      { d: "M20,250 C100,120 200,380 300,250 C400,120 500,360 580,230", delay: 0, alpha: 0.7 },
      { d: "M20,200 C120,320 220,80  320,210 C420,340 520,100 580,280", delay: 0.3, alpha: 0.5 },
      { d: "M20,310 C80,160  200,420 320,290 C440,160 530,380 580,300", delay: 0.6, alpha: 0.4 },
      { d: "M20,160 C140,300 240,60  340,190 C440,320 540,140 580,200", delay: 0.9, alpha: 0.35 },
      { d: "M20,380 C100,220 220,440 340,320 C460,200 540,400 580,350", delay: 1.1, alpha: 0.25 },
      { d: "M20,100 C160,260 260,20  360,150 C460,280 550,80  580,140", delay: 1.4, alpha: 0.2 },
      { d: "M20,440 C120,300 240,460 360,380 C480,300 550,440 580,400", delay: 0.5, alpha: 0.18 },
      { d: "M580,130 C460,270 340,50  220,180 C100,310 40,120  20,170", delay: 0.8, alpha: 0.15 },
    ].map((wave, i) => (
      <path
        key={i}
        d={wave.d}
        stroke={i % 3 === 2 ? "#FF6B35" : "#C9A84C"}
        strokeWidth={i < 3 ? 1 : 0.6}
        strokeOpacity={wave.alpha}
        strokeLinecap="round"
        fill="none"
        style={{
          strokeDasharray: 800,
          strokeDashoffset: 800,
          animation: `waveDraw 3.5s ease forwards`,
          animationDelay: `${wave.delay}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes waveDraw {
        to { stroke-dashoffset: 0; }
      }
    `}</style>
  </svg>
);

