"""
Revenue-First AI System for Auto Claude

This module contains the revenue-focused analysis and opportunity finding system.
Every suggestion made by this system must answer: "How much money does this make?"

Components:
- business_analyzer: Analyzes current business model (Stripe, MRR, pricing)
- opportunity_finder: Finds revenue opportunities from competitors
- execution_engine: Executes opportunities with BMAD integration
"""

from .business_analyzer import BusinessAnalyzer
from .opportunity_finder import OpportunityFinder

__all__ = ['BusinessAnalyzer', 'OpportunityFinder']
