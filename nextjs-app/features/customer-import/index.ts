// Haupt-Export für KI-Kunden-Import Feature
// Wiederverwendbar in anderen Next.js Projekten

// Komponenten
export { CustomerImportModeSelector } from './components/CustomerImportModeSelector'
export { AiCustomerImportWizard } from './components/AiCustomerImportWizard'

// Wizard-Steps (falls einzeln benötigt)
export { ParameterForm } from './components/wizard-steps/ParameterForm'
export { JobStatus } from './components/wizard-steps/JobStatus'
export { ResultsTable } from './components/wizard-steps/ResultsTable'
export { ImportConfirmation } from './components/wizard-steps/ImportConfirmation'

// Types
export type {
  AiImportParams,
  AiImportResult,
  CustomerImportJob,
  CustomerDraft,
  ImportResult,
  JobPhase,
  CustomerDialogMode
} from './types'

// JobStatus als Type exportieren (nicht als Value wegen Namenskonflikt mit Komponente)
export type { JobStatus as JobStatusType } from './types'

// Hooks
export { useCustomerImport } from './hooks/useCustomerImport'

// Services (Mock)
export {
  startImportJob,
  pollJobStatus,
  importSelectedCustomers,
  cancelJob,
  deleteJob
} from './services/mockService'

