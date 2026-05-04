// @leadforge/shared — Core services
export { analyzeWebsite } from './services/website-analyzer';
export { scoreLead } from './services/lead-scorer';
export { detectSignals, aggregateSignals } from './services/signal-engine';
export { searchBusinesses } from './services/google-places';
export { enrichContact } from './services/contact-enrichment';
export { generateEmailPitch, generateLinkedInPitch, generateSMSPitch } from './services/outreach-engine';
export { generateProposal, renderProposalHTML } from './services/proposal-generator';
export { ForgeAgent } from './services/ai-sdr-agent';
export { SendingAccountManager, WarmupEngine, checkDeliverability } from './services/deliverability-engine';
