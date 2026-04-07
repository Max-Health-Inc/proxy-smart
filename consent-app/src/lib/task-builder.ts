import type { Task } from "fhir/r4"
import type { TaskStatusCode } from "hl7.fhir.uv.smart-app-launch-generated/valuesets/ValueSet-TaskStatus.js"
import type { TaskIntentCode } from "hl7.fhir.uv.smart-app-launch-generated/valuesets/ValueSet-TaskIntent.js"

export type AccessRequestDraft = {
  patientId: string
  patientDisplay?: string
  practitionerId: string
  practitionerDisplay?: string
  resourceTypes: string[]
  action: "access" | "disclose"
  periodStart: string
  periodEnd?: string
  reason?: string
}

const ACCESS_REQUEST_CODE = {
  coding: [
    {
      system: "http://proxy-smart.dev/task-type",
      code: "access-request",
      display: "Access Request",
    },
  ],
}

/**
 * Build a FHIR R4 Task resource representing a practitioner's request
 * to access a patient's data.
 */
export function buildAccessRequestTask(draft: AccessRequestDraft): Task {
  const task: Task = {
    resourceType: "Task",
    status: "requested" satisfies TaskStatusCode,
    intent: "order" satisfies TaskIntentCode,
    code: ACCESS_REQUEST_CODE,
    description: draft.reason || "Request to access patient data",
    for: {
      reference: `Patient/${draft.patientId}`,
      ...(draft.patientDisplay ? { display: draft.patientDisplay } : {}),
    },
    requester: {
      reference: `Practitioner/${draft.practitionerId}`,
      ...(draft.practitionerDisplay ? { display: draft.practitionerDisplay } : {}),
    },
    authoredOn: new Date().toISOString(),
    input: [
      {
        type: {
          coding: [{ system: "http://proxy-smart.dev/task-input", code: "resource-types" }],
        },
        valueString: draft.resourceTypes.join(","),
      },
      {
        type: {
          coding: [{ system: "http://proxy-smart.dev/task-input", code: "action" }],
        },
        valueString: draft.action,
      },
      {
        type: {
          coding: [{ system: "http://proxy-smart.dev/task-input", code: "period-start" }],
        },
        valueString: draft.periodStart,
      },
      ...(draft.periodEnd
        ? [
            {
              type: {
                coding: [{ system: "http://proxy-smart.dev/task-input", code: "period-end" }],
              },
              valueString: draft.periodEnd,
            },
          ]
        : []),
    ],
  }
  return task
}

// ── Helpers to extract structured data from a Task ───────────────────────────

function getInputValue(task: Task, code: string): string | undefined {
  return task.input?.find(
    (i) => i.type?.coding?.[0]?.code === code,
  )?.valueString
}

export function getRequestResourceTypes(task: Task): string[] {
  const val = getInputValue(task, "resource-types")
  return val ? val.split(",").filter(Boolean) : []
}

export function getRequestAction(task: Task): string {
  return getInputValue(task, "action") ?? "access"
}

export function getRequestPeriodStart(task: Task): string | undefined {
  return getInputValue(task, "period-start")
}

export function getRequestPeriodEnd(task: Task): string | undefined {
  return getInputValue(task, "period-end")
}

export function getRequestConsentRef(task: Task): string | undefined {
  return task.output?.find(
    (o) => o.type?.coding?.[0]?.code === "consent-reference",
  )?.valueReference?.reference
}

export function isAccessRequest(task: Task): boolean {
  return task.code?.coding?.some((c) => c.code === "access-request") ?? false
}
