// SPDX-FileCopyrightText: Max Health Inc.
// SPDX-License-Identifier: AGPL-3.0-or-later OR LicenseRef-Commercial

/**
 * @proxy-smart/auth ESLint config — extends the shared Node base config.
 *
 * The package declared a `lint` script but shipped no config, so `eslint .`
 * failed with "all of the files matching the glob pattern . are ignored"
 * rather than linting anything.
 */
import { defineConfig } from 'eslint/config'
import { baseConfig } from '../../config/eslint/base.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(
  ...baseConfig({
    tsconfigRootDir: __dirname,
  }),
)
