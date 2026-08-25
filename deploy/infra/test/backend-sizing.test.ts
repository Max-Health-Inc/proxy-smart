// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

// The downsize that OOM-killed production (512 MiB, exit 137) was a two-line diff
// nothing in CI could object to. This objects.

import { describe, test, expect } from 'bun:test';
import {
  BACKEND_TASK_CPU,
  BACKEND_TASK_MEMORY_MIB,
  BACKEND_MEMORY_ALARM_PERCENT,
} from '../lib/backend-stack';

/** Floor, not current value: raising headroom stays free. */
const MEMORY_FLOOR_MIB = 1024;

describe('backend task sizing', () => {
  test('memory stays at or above the floor that survived production', () => {
    expect(BACKEND_TASK_MEMORY_MIB).toBeGreaterThanOrEqual(MEMORY_FLOOR_MIB);
  });

  test('the CPU/memory pair is a valid Fargate combination', () => {
    // 256 CPU only permits 512/1024/2048 MiB; a mismatch fails at deploy, not here.
    const validForCpu: Record<number, number[]> = {
      256: [512, 1024, 2048],
      512: [1024, 2048, 3072, 4096],
      1024: [2048, 3072, 4096, 5120, 6144, 7168, 8192],
    };
    expect(validForCpu[BACKEND_TASK_CPU]).toContain(BACKEND_TASK_MEMORY_MIB);
  });

  test('the memory alarm leaves room to react before the kernel does', () => {
    expect(BACKEND_MEMORY_ALARM_PERCENT).toBeGreaterThan(0);
    expect(BACKEND_MEMORY_ALARM_PERCENT).toBeLessThanOrEqual(85);
  });
});
