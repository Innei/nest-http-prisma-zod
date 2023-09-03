import { omit } from 'lodash'

import { generateMock } from '@anatine/zod-mock'

import { UserSchemaProjection } from '~/modules/user/user.protect'
import { UserModel } from '~/schemas'

// @anatine/zod-mock has memory leak issues, so pin the seed, and only use one mock per test.
const mockUserInputData1 = omit(
  generateMock(UserModel, { seed: 1 }),
  UserSchemaProjection.keys,
)

mockUserInputData1.socialIds = {
  github: 'innei',
}

export { mockUserInputData1 }
