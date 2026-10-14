import { builder } from './builder'
import './statistics'
import './types/User'

import '../../app/Custom/server/files'
import '../../app/Custom/server/imageGeneration'

export const schema = builder.toSchema()
