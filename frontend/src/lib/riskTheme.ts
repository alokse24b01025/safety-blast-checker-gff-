import React from 'react';

/**
 * Semantic Risk Color System
 * ----------------------------
 * Single source of truth for GREEN/YELLOW/ORANGE/RED meaning across the
 * entire app. Every component that shows a risk level, badge, border, or
 * status pill should pull from here instead of hardcoding colors --
 * this is what makes the color coding "semantic" and consistent, not
 * just visually similar by accident.
 */

export type RiskLevel = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

interface RiskTheme {
  color: string;       // CSS var for the solid color
  dim: string;         // CSS var for the soft background wash
  label: string;       // Human label
  meaning: string;      // What this level means, in plain language
}

export const RISK_THEME: Record<RiskLevel, RiskTheme> = {
  GREEN: {
    color: 'var(--green)',
    dim: 'var(--green-dim)',
    label: 'SAFE',
    meaning: 'All checked parameters are within acceptable limits.',
  },
  YELLOW: {
    color: 'var(--yellow)',
    dim: 'var(--yellow-dim)',
    label: 'CAUTION',
    meaning: 'Minor issues present. Correct before proceeding.',
  },
  ORANGE: {
    color: 'var(--orange)',
    dim: 'var(--orange-dim)',
    label: 'WARNING',
    meaning: 'Multiple or significant issues. Do not proceed yet.',
  },
  RED: {
    color: 'var(--red)',
    dim: 'var(--red-dim)',
    label: 'CRITICAL',
    meaning: 'Blast is blocked. Immediate correction required.',
  },
};

export function riskTheme(level: string | null | undefined): RiskTheme {
  if (level && level in RISK_THEME) return RISK_THEME[level as RiskLevel];
  return {
    color: 'var(--text-faint)',
    dim: 'rgba(255,255,255,0.05)',
    label: 'UNKNOWN',
    meaning: 'Risk level not yet evaluated.',
  };
}

/** Reusable semantic badge -- same visual language everywhere it's used. */
export function riskBadgeStyle(level: string | null | undefined): React.CSSProperties {
  const t = riskTheme(level);
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.2rem 0.6rem',
    borderRadius: 'var(--border-radius-small)',
    background: t.dim,
    color: t.color,
    border: `1px solid ${t.color}`,
    fontFamily: 'var(--font-mono)',
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.04em',
  };
}