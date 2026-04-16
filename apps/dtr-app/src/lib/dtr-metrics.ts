/**
 * DTR Metric Tracking
 *
 * Collects workflow metrics per the Da Vinci DTR IG metric data model.
 * Uses typed DTRMetricData structures and MetricAction/LaunchMode/Source valuesets.
 *
 * @see http://hl7.org/fhir/us/davinci-dtr/StructureDefinition/DTRMetricData
 */
import type {
  DTRMetricData,
  DTRMetricDataAction,
  DTRMetricDataProviderId,
  DTRMetricDataGroupId,
  DTRMetricDataPayerId,
} from "hl7.fhir.us.davinci-dtr-generated"
import type { MetricActionCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-MetricAction"
import type { MetricLaunchModeCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-MetricLaunchMode"
import type { MetricSourceCode } from "hl7.fhir.us.davinci-dtr-generated/valuesets/ValueSet-MetricSource"
import type { CodeableConcept } from "fhir/r4"

/** Human-readable labels for metric actions */
const ACTION_LABELS: Record<MetricActionCode, string> = {
  launch: "App Launch",
  qpackage: "Questionnaire Package",
  mrquery: "Medical Record Query",
  nextq: "Next Question (Adaptive)",
  userresponse: "User Response",
  storeqr: "Store QuestionnaireResponse",
}

/** Human-readable labels for launch modes */
const LAUNCH_MODE_LABELS: Record<MetricLaunchModeCode, string> = {
  crdlaunch: "CRD Launch",
  relaunch: "Re-launch",
  salaunch: "Standalone Launch",
  cdexlaunch: "CDex Launch",
}

interface MetricSessionInit {
  source: MetricSourceCode
  providerId: string
  groupId: string
  payerId: string
  payerSystem: string
  launchMode?: MetricLaunchModeCode
  orderItems?: CodeableConcept[]
}

/**
 * DTR Metric session tracker.
 * Create one per DTR workflow invocation — collects actions
 * then exports to DTRMetricData for submission to the payer.
 */
export class DtrMetricSession {
  private readonly source: MetricSourceCode
  private readonly providerId: DTRMetricDataProviderId
  private readonly groupId: DTRMetricDataGroupId
  private readonly payerId: DTRMetricDataPayerId
  private readonly launchMode?: MetricLaunchModeCode
  private readonly orderItems: CodeableConcept[]
  private readonly actions: DTRMetricDataAction[] = []

  constructor(init: MetricSessionInit) {
    this.source = init.source
    this.providerId = { system: "http://hl7.org/fhir/sid/us-npi", value: init.providerId }
    this.groupId = { system: "http://hl7.org/fhir/sid/us-npi", value: init.groupId }
    this.payerId = { system: init.payerSystem, value: init.payerId }
    this.launchMode = init.launchMode
    this.orderItems = init.orderItems ?? []
  }

  /**
   * Record a metric action (e.g. launch, qpackage, mrquery).
   * Automatically captures request timestamp. Call `completeAction`
   * when the action receives a response.
   */
  startAction(
    actionDetail: MetricActionCode,
    questionnaire?: string,
  ): { complete: (httpResponse?: number) => void } {
    const action: DTRMetricDataAction = {
      actionDetail,
      requestTime: new Date().toISOString(),
      questionnaire,
    }
    this.actions.push(action)

    return {
      complete: (httpResponse?: number) => {
        action.responseTime = new Date().toISOString()
        action.httpResponse = httpResponse
      },
    }
  }

  /** Record a completed action in one call (request + response already known) */
  recordAction(
    actionDetail: MetricActionCode,
    requestTime: string,
    responseTime: string,
    httpResponse?: number,
    questionnaire?: string,
  ): void {
    this.actions.push({ actionDetail, requestTime, responseTime, httpResponse, questionnaire })
  }

  /** Export the accumulated metrics as a DTRMetricData structure */
  toMetricData(): DTRMetricData {
    return {
      source: this.source,
      providerId: this.providerId,
      groupId: this.groupId,
      payerId: this.payerId,
      launchMode: this.launchMode,
      orderItem: this.orderItems as DTRMetricData["orderItem"],
      action: this.actions,
    }
  }

  /** Get a human-readable label for an action code */
  static getActionLabel(code: MetricActionCode): string {
    return ACTION_LABELS[code]
  }

  /** Get a human-readable label for a launch mode code */
  static getLaunchModeLabel(code: MetricLaunchModeCode): string {
    return LAUNCH_MODE_LABELS[code]
  }
}
